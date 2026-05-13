'use strict';
/**
 * Stripe Webhook Event Handlers
 * Pure functions for processing webhook events
 */

import Stripe from 'stripe';
import { storage } from '../../../../storage';
import { NotificationService } from '../../../../services/notification-service';
import { syncUserWithSubscription, applyPlanCredits } from '../../../../services/membership-service';
import { emailService } from '../../../../services/email-service';
import { generateInvoiceForTransaction } from '../../invoice-service';
import { PaymentAuditService } from '../../audit';
import { getStripeCurrency, getStripeClient } from './service';

/**
 * Safely parse a Unix timestamp (in seconds) to a Date object.
 * Returns current date if timestamp is invalid/missing.
 */
function safeUnixToDate(unixTimestamp: number | undefined | null, fallback?: Date): Date {
  if (unixTimestamp !== undefined && unixTimestamp !== null && typeof unixTimestamp === 'number' && !isNaN(unixTimestamp) && unixTimestamp >= 0) {
    const date = new Date(unixTimestamp * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return fallback || new Date();
}

async function getStripeUserSubscription(subscriptionId: string, userId?: string | null): Promise<any> {
  const subscriptionByStripeId = await storage.getUserSubscriptionByStripeSubscriptionId(subscriptionId);
  if (subscriptionByStripeId) {
    return subscriptionByStripeId;
  }

  if (userId) {
    return storage.getUserSubscription(userId);
  }

  return null;
}

function getInvoiceLinePeriod(invoice: Stripe.Invoice): { start?: Date; end?: Date } {
  const firstLine = (invoice as any).lines?.data?.[0];
  const start = firstLine?.period?.start;
  const end = firstLine?.period?.end;

  return {
    start: typeof start === 'number' ? new Date(start * 1000) : undefined,
    end: typeof end === 'number' ? new Date(end * 1000) : undefined,
  };
}

function addDuration(base: Date, start: Date, end: Date): Date {
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  return new Date(base.getTime() + durationMs);
}

export interface HandlerResult {
  success: boolean;
  action?: string;
  error?: string;
  userId?: string;
  transactionId?: string;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<HandlerResult> {
  const metadata = session.metadata;

  if (!metadata || !metadata.userId) {
    return { success: false, error: 'No userId in session metadata' };
  }

  if (metadata.type === 'subscription') {
    return handleSubscriptionCheckout(session, metadata);
  } else if (metadata.type === 'credits') {
    return handleCreditsCheckout(session, metadata);
  }

  return { success: false, error: 'Unknown checkout type' };
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
): Promise<HandlerResult> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  const subscriptionId = session.subscription as string;
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  const stripePeriodStart = (stripeSubscription as any).current_period_start
    ? new Date((stripeSubscription as any).current_period_start * 1000)
    : new Date();
  const stripePeriodEnd = (stripeSubscription as any).current_period_end
    ? new Date((stripeSubscription as any).current_period_end * 1000)
    : new Date(stripePeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const cycleDurationMs = Math.max(0, stripePeriodEnd.getTime() - stripePeriodStart.getTime());

  // First, check if user already has a subscription (from any gateway)
  const existingSubscription = await storage.getUserSubscription(metadata.userId);
  const existingUser = await storage.getUser(metadata.userId);
  const existingSubEnd = existingSubscription?.currentPeriodEnd
    ? new Date(existingSubscription.currentPeriodEnd)
    : undefined;
  const storedUserExpiry = existingUser?.planExpiresAt
    ? new Date(existingUser.planExpiresAt)
    : undefined;

  let extensionBase: Date | undefined;
  if (existingSubEnd && existingSubEnd > new Date()) {
    extensionBase = existingSubEnd;
  } else if (storedUserExpiry && storedUserExpiry > new Date()) {
    extensionBase = storedUserExpiry;
  }

  const periodStart = stripePeriodStart;
  const periodEnd = extensionBase
    ? new Date(extensionBase.getTime() + cycleDurationMs)
    : stripePeriodEnd;

  console.log(
    `[Stripe Checkout Renewal] session=${session.id} subscription=${subscriptionId} userId=${metadata.userId} planId=${metadata.planId} existingSubId=${existingSubscription?.id} existingSubEnd=${existingSubEnd?.toISOString?.() || existingSubEnd} storedUserExpiry=${storedUserExpiry?.toISOString?.() || storedUserExpiry} stripeStart=${stripePeriodStart.toISOString()} stripeEnd=${stripePeriodEnd.toISOString()} extensionBase=${extensionBase?.toISOString?.() || 'none'} finalEnd=${periodEnd.toISOString()}`
  );

  const subscriptionData = {
    userId: metadata.userId,
    planId: metadata.planId!,
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    stripeSubscriptionId: subscriptionId,
    cancelAtPeriodEnd: false,
    billingPeriod: metadata.billingPeriod || 'monthly',
  };

  let userSubId: string | undefined;

  if (existingSubscription) {
    // Update existing subscription instead of creating a duplicate
    console.log(`[Stripe] Updating existing subscription ${existingSubscription.id} for user ${metadata.userId}`);
    await storage.updateUserSubscription(existingSubscription.id, {
      planId: subscriptionData.planId,
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.currentPeriodStart,
      currentPeriodEnd: subscriptionData.currentPeriodEnd,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      billingPeriod: subscriptionData.billingPeriod,
      // Clear other gateway IDs when switching to Stripe
      razorpaySubscriptionId: null,
      paypalSubscriptionId: null,
      paystackSubscriptionCode: null,
      paystackEmailToken: null,
      mercadopagoSubscriptionId: null,
    });
    userSubId = existingSubscription.id;
  } else {
    // No existing subscription, create new one
    try {
      const newSub = await storage.createUserSubscription(subscriptionData);
      userSubId = newSub.id;
    } catch (error: any) {
      if (!error.message?.includes('unique') && !error.message?.includes('duplicate')) {
        throw error;
      }
      console.log(`[Stripe] Subscription ${subscriptionId} already exists, skipping creation`);
      const existingSub = await getStripeUserSubscription(subscriptionId, metadata.userId);
      userSubId = existingSub?.id;
    }
  }

  const plan = await storage.getPlan(metadata.planId!);
  if (plan) {
    await storage.updateUser(metadata.userId, {
      planType: plan.name,
      planExpiresAt: periodEnd,
    });

    const savedSubscription = await getStripeUserSubscription(subscriptionId, metadata.userId);
    const savedUser = await storage.getUser(metadata.userId);
    console.log(
      `[Stripe Checkout Renewal] after-save userId=${metadata.userId} userSubId=${savedSubscription?.id} savedSubStart=${savedSubscription?.currentPeriodStart?.toISOString?.() || savedSubscription?.currentPeriodStart} savedSubEnd=${savedSubscription?.currentPeriodEnd?.toISOString?.() || savedSubscription?.currentPeriodEnd} savedUserExpiry=${savedUser?.planExpiresAt?.toISOString?.() || savedUser?.planExpiresAt}`
    );

    await NotificationService.notifyMembershipUpgraded(metadata.userId, plan.name);

    // Apply plan credits (e.g., 500 credits for Pro plan)
    await applyPlanCredits(
      metadata.userId,
      plan.id,
      'stripe',
      session.payment_intent as string || session.id
    );

    const currencyConfig = await getStripeCurrency();
    const amount = (session.amount_total || 0) / 100;

    try {
      const newTransaction = await storage.createPaymentTransaction({
        userId: metadata.userId,
        type: 'subscription',
        gateway: 'stripe',
        gatewayTransactionId: session.payment_intent as string || session.id,
        gatewaySubscriptionId: subscriptionId,
        amount: amount.toFixed(2),
        currency: currencyConfig.currency.toUpperCase(),
        planId: plan.id,
        subscriptionId: userSubId,
        description: `${plan.displayName} Subscription`,
        billingPeriod: metadata.billingPeriod || 'monthly',
        status: 'completed',
        completedAt: new Date(),
      });

      await PaymentAuditService.logSubscriptionCreated(
        'stripe',
        metadata.userId,
        subscriptionId,
        plan.id,
        metadata.billingPeriod || 'monthly',
        { amount, currency: currencyConfig.currency }
      );

      try {
        await generateInvoiceForTransaction(newTransaction.id);
        await emailService.sendPurchaseConfirmation(newTransaction.id);
      } catch (emailError: any) {
        console.error(`❌ [Stripe] Failed to send purchase confirmation email:`, emailError);
      }

      return {
        success: true,
        action: 'subscription_created',
        userId: metadata.userId,
        transactionId: newTransaction.id,
      };
    } catch (txError: any) {
      if (!txError.message?.includes('unique') && !txError.message?.includes('duplicate')) {
        throw txError;
      }
      return { success: true, action: 'subscription_already_processed', userId: metadata.userId };
    }
  }

  return { success: false, error: 'Plan not found' };
}

async function handleCreditsCheckout(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
): Promise<HandlerResult> {
  const packageId = metadata.packageId;
  const credits = parseInt(metadata.credits || '0', 10);

  if (!packageId || !credits) {
    return { success: false, error: 'Invalid credits metadata' };
  }

  const pkg = await storage.getCreditPackage(packageId);
  if (!pkg) {
    return { success: false, error: 'Package not found' };
  }

  const currencyConfig = await getStripeCurrency();
  const amount = (session.amount_total || 0) / 100;

  try {
    const newTransaction = await storage.createPaymentTransaction({
      userId: metadata.userId,
      type: 'credits',
      gateway: 'stripe',
      gatewayTransactionId: session.payment_intent as string || session.id,
      amount: amount.toFixed(2),
      currency: currencyConfig.currency.toUpperCase(),
      creditPackageId: packageId,
      creditsAwarded: credits,
      description: `${pkg.name} Credit Purchase`,
      status: 'completed',
      completedAt: new Date(),
    });

    await storage.addCreditsAtomic(
      metadata.userId,
      credits,
      `Purchased ${pkg.name}`,
      session.payment_intent as string || session.id
    );

    await PaymentAuditService.logCreditsAwarded(
      'stripe',
      metadata.userId,
      newTransaction.id,
      credits,
      { packageName: pkg.name, amount }
    );

    try {
      await generateInvoiceForTransaction(newTransaction.id);
      await emailService.sendPurchaseConfirmation(newTransaction.id);
    } catch (emailError: any) {
      console.error(`❌ [Stripe] Failed to send purchase confirmation:`, emailError);
    }

    return {
      success: true,
      action: 'credits_awarded',
      userId: metadata.userId,
      transactionId: newTransaction.id,
    };
  } catch (error: any) {
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return { success: true, action: 'credits_already_processed', userId: metadata.userId };
    }
    throw error;
  }
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<HandlerResult> {
  if ((invoice as any).billing_reason !== 'subscription_cycle') {
    return { success: true, action: 'not_renewal_invoice' };
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) {
    return { success: true, action: 'not_subscription_invoice' };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadataUserId = stripeSubscription.metadata.userId;
  const userSub = await getStripeUserSubscription(subscriptionId, metadataUserId);
  const userId = metadataUserId || userSub?.userId;

  console.log(
    `[Stripe Renewal] invoice=${invoice.id} subscription=${subscriptionId} billing_reason=${(invoice as any).billing_reason} metadataUserId=${metadataUserId} matchedUserSubId=${userSub?.id} matchedPlanId=${userSub?.planId}`
  );

  if (userSub && userId) {
    const invoicePeriod = getInvoiceLinePeriod(invoice);
    const stripePeriodStart = safeUnixToDate(
      (stripeSubscription as any).current_period_start,
      invoicePeriod.start || userSub.currentPeriodStart || new Date()
    );
    const stripePeriodEnd = safeUnixToDate(
      (stripeSubscription as any).current_period_end,
      invoicePeriod.end || userSub.currentPeriodEnd || new Date(stripePeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    const existingUser = await storage.getUser(userId);
    const storedExpiry = existingUser?.planExpiresAt;
    const storedSubEnd = userSub.currentPeriodEnd ? new Date(userSub.currentPeriodEnd) : undefined;

    console.log(
      `[Stripe Renewal] before-calc userId=${userId} userSubId=${userSub.id} storedSubStart=${userSub.currentPeriodStart?.toISOString?.() || userSub.currentPeriodStart} storedSubEnd=${storedSubEnd?.toISOString?.() || storedSubEnd} storedUserExpiry=${storedExpiry?.toISOString?.() || storedExpiry} stripeStart=${stripePeriodStart.toISOString()} stripeEnd=${stripePeriodEnd.toISOString()} invoiceLineStart=${invoicePeriod.start?.toISOString?.() || 'null'} invoiceLineEnd=${invoicePeriod.end?.toISOString?.() || 'null'}`
    );

    let nextPeriodEnd = stripePeriodEnd;
    let renewalStrategy = 'stripe_period_end';
    if (storedSubEnd && storedSubEnd >= stripePeriodEnd) {
      nextPeriodEnd = addDuration(storedSubEnd, stripePeriodStart, stripePeriodEnd);
      renewalStrategy = 'extend_from_user_subscription_end';
    } else if (storedExpiry && storedExpiry > stripePeriodEnd) {
      nextPeriodEnd = storedExpiry;
      renewalStrategy = 'keep_later_user_expiry';
    } else if (storedExpiry && storedExpiry > new Date()) {
      nextPeriodEnd = addDuration(storedExpiry, stripePeriodStart, stripePeriodEnd);
      renewalStrategy = 'extend_from_user_expiry';
    }

    console.log(
      `[Stripe Renewal] calc userId=${userId} userSubId=${userSub.id} strategy=${renewalStrategy} finalStart=${stripePeriodStart.toISOString()} finalEnd=${nextPeriodEnd.toISOString()}`
    );

    await storage.updateUserSubscription(userSub.id, {
      currentPeriodStart: stripePeriodStart,
      currentPeriodEnd: nextPeriodEnd,
      status: 'active',
    });

    await storage.updateUser(userId, {
      planExpiresAt: nextPeriodEnd,
    });

    const updatedUserSub = await getStripeUserSubscription(subscriptionId, userId);
    const updatedUser = await storage.getUser(userId);
    console.log(
      `[Stripe Renewal] after-save userId=${userId} userSubId=${updatedUserSub?.id} savedSubStart=${updatedUserSub?.currentPeriodStart?.toISOString?.() || updatedUserSub?.currentPeriodStart} savedSubEnd=${updatedUserSub?.currentPeriodEnd?.toISOString?.() || updatedUserSub?.currentPeriodEnd} savedUserExpiry=${updatedUser?.planExpiresAt?.toISOString?.() || updatedUser?.planExpiresAt}`
    );

    const currencyConfig = await getStripeCurrency();
    const amount = (invoice.amount_paid || 0) / 100;

    try {
      const newTransaction = await storage.createPaymentTransaction({
        userId,
        type: 'subscription',
        gateway: 'stripe',
        gatewayTransactionId: (invoice as any).payment_intent as string || invoice.id,
        gatewaySubscriptionId: subscriptionId,
        amount: amount.toFixed(2),
        currency: currencyConfig.currency.toUpperCase(),
        planId: userSub.planId,
        subscriptionId: userSub.id,
        description: `Subscription Renewal`,
        billingPeriod: userSub.billingPeriod || 'monthly',
        status: 'completed',
        completedAt: new Date(),
      });

      await PaymentAuditService.logSubscriptionRenewed(
        'stripe',
        userId,
        subscriptionId,
        amount,
        currencyConfig.currency
      );

      try {
        await generateInvoiceForTransaction(newTransaction.id);
        await emailService.sendPurchaseConfirmation(newTransaction.id);
      } catch (emailError: any) {
        console.error(`❌ [Stripe] Failed to send renewal email:`, emailError);
      }

      return {
        success: true,
        action: 'subscription_renewed',
        userId,
        transactionId: newTransaction.id,
      };
    } catch (txError: any) {
      if (!txError.message?.includes('unique') && !txError.message?.includes('duplicate')) {
        throw txError;
      }
      return { success: true, action: 'renewal_already_processed', userId };
    }
  }

  return { success: false, error: 'User subscription not found' };
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<HandlerResult> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) {
    return { success: true, action: 'not_subscription_invoice' };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadataUserId = stripeSubscription.metadata.userId;
  const userSub = await getStripeUserSubscription(subscriptionId, metadataUserId);
  const userId = metadataUserId || userSub?.userId;

  if (userSub && userId) {
    await storage.updateUserSubscription(userSub.id, {
      status: 'past_due',
    });

    await PaymentAuditService.logPaymentFailed(
      'stripe',
      userId,
      'Subscription renewal failed',
      { subscriptionId, invoiceId: invoice.id }
    );

    try {
      const amount = ((invoice.amount_due || 0) / 100).toFixed(2);
      await emailService.sendPaymentFailed(userId, amount, 'Subscription renewal failed');
    } catch (emailError: any) {
      console.error(`❌ [Stripe] Failed to send payment failed email:`, emailError);
    }

    return { success: true, action: 'subscription_past_due', userId };
  }

  return { success: false, error: 'User subscription not found' };
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<HandlerResult> {
  const metadataUserId = subscription.metadata.userId;
  const userSub = await getStripeUserSubscription(subscription.id, metadataUserId);
  const userId = metadataUserId || userSub?.userId;

  if (userSub && userId) {
    await storage.updateUserSubscription(userSub.id, {
      status: 'cancelled',
      cancelAtPeriodEnd: false,
    });

    await syncUserWithSubscription(userId);

    await PaymentAuditService.logSubscriptionCancelled(
      'stripe',
      userId,
      subscription.id,
      false,
      { reason: 'subscription_deleted' }
    );

    return { success: true, action: 'subscription_cancelled', userId };
  }

  return { success: false, error: 'User subscription not found' };
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<HandlerResult> {
  const metadataUserId = subscription.metadata.userId;
  const userSub = await getStripeUserSubscription(subscription.id, metadataUserId);
  const userId = metadataUserId || userSub?.userId;

  console.log(
    `[Stripe Subscription Updated] subscription=${subscription.id} metadataUserId=${metadataUserId} matchedUserSubId=${userSub?.id} matchedPlanId=${userSub?.planId} status=${subscription.status} cancelAtPeriodEnd=${subscription.cancel_at_period_end}`
  );

  if (userSub && userId) {
    const stripePeriodStart = safeUnixToDate(
      (subscription as any).current_period_start,
      userSub.currentPeriodStart || new Date()
    );
    const stripePeriodEnd = safeUnixToDate(
      (subscription as any).current_period_end,
      userSub.currentPeriodEnd || new Date()
    );
    const existingUser = await storage.getUser(userId);
    const storedExpiry = existingUser?.planExpiresAt;
    const effectivePeriodEnd = storedExpiry && storedExpiry > stripePeriodEnd
      ? storedExpiry
      : stripePeriodEnd;

    console.log(
      `[Stripe Subscription Updated] before-save userId=${userId} userSubId=${userSub.id} storedSubStart=${userSub.currentPeriodStart?.toISOString?.() || userSub.currentPeriodStart} storedSubEnd=${userSub.currentPeriodEnd?.toISOString?.() || userSub.currentPeriodEnd} storedUserExpiry=${storedExpiry?.toISOString?.() || storedExpiry} stripeStart=${stripePeriodStart.toISOString()} stripeEnd=${stripePeriodEnd.toISOString()} effectiveEnd=${effectivePeriodEnd.toISOString()}`
    );

    await storage.updateUserSubscription(userSub.id, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: stripePeriodStart,
      currentPeriodEnd: effectivePeriodEnd,
    });

    await storage.updateUser(userId, {
      planExpiresAt: effectivePeriodEnd,
    });

    const updatedUserSub = await getStripeUserSubscription(subscription.id, userId);
    const updatedUser = await storage.getUser(userId);
    console.log(
      `[Stripe Subscription Updated] after-save userId=${userId} userSubId=${updatedUserSub?.id} savedSubStart=${updatedUserSub?.currentPeriodStart?.toISOString?.() || updatedUserSub?.currentPeriodStart} savedSubEnd=${updatedUserSub?.currentPeriodEnd?.toISOString?.() || updatedUserSub?.currentPeriodEnd} savedUserExpiry=${updatedUser?.planExpiresAt?.toISOString?.() || updatedUser?.planExpiresAt}`
    );

    return { success: true, action: 'subscription_updated', userId };
  }

  return { success: true, action: 'subscription_not_found' };
}

export async function handleChargeDispute(
  dispute: Stripe.Dispute
): Promise<HandlerResult> {
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

  if (!chargeId) {
    return { success: false, error: 'No charge ID in dispute' };
  }

  const transaction = await storage.getPaymentTransactionByGatewayId('stripe', chargeId);

  if (transaction) {
    const userId = transaction.userId;
    const user = await storage.getUser(userId);

    let creditsReversed = 0;
    if (transaction.type === 'credits' && transaction.creditsAwarded && user) {
      creditsReversed = transaction.creditsAwarded;
      const newCredits = Math.max(0, user.credits - creditsReversed);
      await storage.updateUserCredits(userId, newCredits);
    }

    await storage.createRefund({
      transactionId: transaction.id,
      userId,
      amount: transaction.amount,
      currency: transaction.currency,
      gateway: 'stripe',
      gatewayRefundId: dispute.id,
      reason: 'chargeback',
      initiatedBy: 'gateway',
      status: 'completed',
      creditsReversed: creditsReversed > 0 ? creditsReversed : undefined,
      metadata: {
        userSuspended: true,
        disputeReason: dispute.reason || 'unknown',
        disputeStatus: dispute.status,
        disputeAmount: dispute.amount,
      },
    });

    await storage.updatePaymentTransaction(transaction.id, { status: 'refunded' });
    await storage.updateUser(userId, { isActive: false });

    await PaymentAuditService.logDisputeOpened(
      'stripe',
      userId,
      transaction.id,
      dispute.id,
      dispute.amount / 100,
      transaction.currency,
      dispute.reason
    );

    try {
      await emailService.sendAccountSuspended(userId, `Chargeback dispute: ${dispute.reason || 'Unknown reason'}`);
    } catch (emailError: any) {
      console.error(`❌ [Stripe] Failed to send account suspended email:`, emailError);
    }

    return {
      success: true,
      action: 'user_suspended_chargeback',
      userId,
      transactionId: transaction.id,
    };
  }

  return { success: false, error: 'Transaction not found for dispute' };
}

export async function handleChargeRefunded(
  charge: Stripe.Charge
): Promise<HandlerResult> {
  if (!charge.refunded) {
    return { success: true, action: 'not_fully_refunded' };
  }

  const transaction = await storage.getPaymentTransactionByGatewayId('stripe', charge.id);

  if (transaction) {
    const existingRefunds = await storage.getTransactionRefunds(transaction.id);
    if (existingRefunds.length > 0) {
      return { success: true, action: 'refund_already_exists' };
    }

    const userId = transaction.userId;
    const user = await storage.getUser(userId);

    let creditsReversed = 0;
    if (transaction.type === 'credits' && transaction.creditsAwarded && user) {
      creditsReversed = transaction.creditsAwarded;
      const newCredits = Math.max(0, user.credits - creditsReversed);
      await storage.updateUserCredits(userId, newCredits);
    }

    const refundId = charge.refunds?.data?.[0]?.id || `stripe_refund_${charge.id}`;

    await storage.createRefund({
      transactionId: transaction.id,
      userId,
      amount: transaction.amount,
      currency: transaction.currency,
      gateway: 'stripe',
      gatewayRefundId: refundId,
      reason: 'gateway_refund',
      initiatedBy: 'gateway',
      status: 'completed',
      creditsReversed: creditsReversed > 0 ? creditsReversed : undefined,
      metadata: {
        userSuspended: false,
        refundReason: charge.refunds?.data?.[0]?.reason || 'external_refund',
      },
    });

    await storage.updatePaymentTransaction(transaction.id, { status: 'refunded' });

    await PaymentAuditService.logRefundCompleted(
      'stripe',
      userId,
      transaction.id,
      refundId,
      parseFloat(transaction.amount),
      transaction.currency
    );

    return {
      success: true,
      action: 'external_refund_processed',
      userId,
      transactionId: transaction.id,
    };
  }

  return { success: false, error: 'Transaction not found for refund' };
}
