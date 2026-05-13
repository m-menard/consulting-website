"use strict";
/**
 * Centralized Credit Deduction Service
 *
 * Provides atomic, idempotent credit deduction across all telephony engines.
 * Standardizes transaction types and prevents double charging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductCallCredits = deductCallCredits;
exports.checkSufficientCredits = checkSufficientCredits;
exports.getUserCredits = getUserCredits;
exports.applyRefund = applyRefund;
exports.deductSipCallCredits = deductSipCallCredits;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../utils/logger");
/**
 * Generate a unique, namespaced reference for idempotency.
 * Format: {engine}:{callId}
 */
function generateReference(engine, callId) {
    return `${engine}:${callId}`;
}
/**
 * Format a SIP endpoint to show a clean phone number with engine label
 * @param endpoint - The SIP URI or phone number (e.g., "sip:12708221598@sip.rtc.elevenlabs.io:5060;transport=tcp")
 * @returns Formatted string like "+12708221598 (ElevenLabs SIP)" or the original if not a SIP URI
 */
function formatSipEndpoint(endpoint) {
    if (!endpoint) {
        return 'Unknown';
    }
    if (!endpoint.startsWith('sip:')) {
        return endpoint;
    }
    const sipMatch = endpoint.match(/^sip:(\+?\d+)@(.+?)(?::\d+)?(?:;.*)?$/);
    if (!sipMatch) {
        return endpoint;
    }
    const phoneNumber = sipMatch[1].startsWith('+') ? sipMatch[1] : `+${sipMatch[1]}`;
    const domain = sipMatch[2].toLowerCase();
    let engineLabel = 'SIP';
    if (domain.includes('elevenlabs')) {
        engineLabel = 'ElevenLabs SIP';
    }
    else if (domain.includes('openai')) {
        engineLabel = 'OpenAI SIP';
    }
    return `${phoneNumber} (${engineLabel})`;
}
/**
 * Atomically deducts credits from a user's balance with idempotency protection.
 *
 * Features:
 * - Uses advisory lock to prevent concurrent deductions for same reference
 * - Atomic SQL update using GREATEST(0, credits - amount) to prevent negative balance
 * - Idempotent: Won't double-charge if called multiple times for same call
 * - Consistent transaction type: 'usage' with negative amount
 * - Per-user reference checking to prevent cross-tenant collisions
 */
async function deductCallCredits(params) {
    const { userId, creditsToDeduct, callId, fromNumber, toNumber, durationSeconds, engine } = params;
    if (creditsToDeduct <= 0) {
        return { success: true, creditsDeducted: 0, alreadyDeducted: false };
    }
    const reference = generateReference(engine, callId);
    const description = `${engine.replace('-', '+')} call: ${formatSipEndpoint(fromNumber)} → ${formatSipEndpoint(toNumber)} (${durationSeconds}s)`;
    try {
        // Use database transaction with advisory lock for true atomic idempotency
        const result = await db_1.db.transaction(async (tx) => {
            // Generate deterministic lock keys using two 32-bit hashes
            // pg_advisory_xact_lock(int, int) accepts two 32-bit integers
            const userHash = hashCode32(userId);
            const refHash = hashCode32(reference);
            // Acquire advisory lock to serialize concurrent requests for this exact reference+userId
            await tx.execute((0, drizzle_orm_1.sql) `SELECT pg_advisory_xact_lock(${userHash}, ${refHash})`);
            // Check for existing transaction with same reference AND userId (tenant isolation)
            const existingTransactions = await tx
                .select()
                .from(schema_1.creditTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.creditTransactions.reference, reference), (0, drizzle_orm_1.eq)(schema_1.creditTransactions.userId, userId)));
            if (existingTransactions.length > 0) {
                logger_1.logger.info(`Credits already deducted for ${reference} - skipping duplicate`, undefined, 'CreditService');
                return {
                    success: true,
                    creditsDeducted: 0,
                    alreadyDeducted: true
                };
            }
            // Lock the user row and get current balance atomically
            // This prevents concurrent calls for same user from racing
            const lockResult = await tx.execute((0, drizzle_orm_1.sql) `SELECT credits FROM users WHERE id = ${userId} FOR UPDATE`);
            const currentCredits = Number(lockResult.rows?.[0]?.credits) || 0;
            const actualDeduction = Math.min(creditsToDeduct, currentCredits);
            // If user has insufficient credits (partial or zero), return failure to allow retry
            // This ensures no free calls - user must have FULL credits required
            if (actualDeduction < creditsToDeduct) {
                logger_1.logger.warn(`[${engine}] Insufficient credits for ${reference}. Balance: ${currentCredits}, Requested: ${creditsToDeduct}`, undefined, 'CreditService');
                // Return failure so callers can handle appropriately
                // Don't record transaction to allow retry when credits are available
                return {
                    success: false,
                    creditsDeducted: 0,
                    newBalance: currentCredits,
                    alreadyDeducted: false,
                    error: 'Insufficient credits',
                };
            }
            // Atomically update user credits using actual deduction amount
            await tx
                .update(schema_1.users)
                .set({
                credits: (0, drizzle_orm_1.sql) `${schema_1.users.credits} - ${actualDeduction}`,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            // Record the credit transaction with actual deducted amount
            await tx.insert(schema_1.creditTransactions).values({
                userId,
                type: 'usage',
                amount: -actualDeduction,
                description,
                reference,
            });
            // Get updated balance for logging
            const [updatedUser] = await tx
                .select({ credits: schema_1.users.credits })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                .limit(1);
            const newBalance = updatedUser?.credits || 0;
            logger_1.logger.info(`[${engine}] Deducted ${actualDeduction} credits for ${reference}. New balance: ${newBalance}`, undefined, 'CreditService');
            return {
                success: true,
                creditsDeducted: actualDeduction,
                newBalance,
                alreadyDeducted: false,
            };
        });
        return result;
    }
    catch (error) {
        // Handle unique constraint violation (double submission caught by DB)
        if (error.code === '23505' || error.message?.includes('duplicate')) {
            logger_1.logger.info(`Credits already deducted for ${reference} (caught by constraint)`, undefined, 'CreditService');
            return {
                success: true,
                creditsDeducted: 0,
                alreadyDeducted: true,
            };
        }
        logger_1.logger.error(`Failed to deduct credits for ${reference}: ${error.message}`, error, 'CreditService');
        return {
            success: false,
            creditsDeducted: 0,
            error: error.message,
        };
    }
}
/**
 * Generate a deterministic 32-bit signed integer hash for PostgreSQL advisory locks.
 * Uses djb2 hash algorithm for good distribution within 32-bit range.
 */
function hashCode32(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash | 0; // Convert to 32-bit integer
    }
    return hash;
}
/**
 * Check if a user has sufficient credits for a call.
 */
async function checkSufficientCredits(userId, requiredCredits = 1) {
    try {
        const [user] = await db_1.db
            .select({ credits: schema_1.users.credits })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        return (user?.credits || 0) >= requiredCredits;
    }
    catch (error) {
        logger_1.logger.error(`Failed to check credits for user ${userId}: ${error.message}`, error, 'CreditService');
        return false;
    }
}
/**
 * Get user's current credit balance.
 */
async function getUserCredits(userId) {
    try {
        const [user] = await db_1.db
            .select({ credits: schema_1.users.credits })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        return user?.credits || 0;
    }
    catch (error) {
        logger_1.logger.error(`Failed to get credits for user ${userId}: ${error.message}`, error, 'CreditService');
        return 0;
    }
}
/**
 * Atomically reverses credits for a refund with transaction logging.
 *
 * Features:
 * - Uses advisory lock to prevent concurrent refunds for same gateway refund
 * - Idempotent: Won't double-process if called multiple times for same refund
 * - Creates audit trail in credit_transactions table
 * - Uses negative amount to indicate credit reversal
 */
async function applyRefund(params) {
    const { userId, creditsToReverse, gateway, gatewayRefundId, transactionId, reason } = params;
    if (creditsToReverse <= 0) {
        return { success: true, creditsReversed: 0, alreadyProcessed: false };
    }
    const reference = `refund:${gateway}:${gatewayRefundId}`;
    const description = reason
        ? `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} refund: ${reason}`
        : `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} refund for transaction ${transactionId}`;
    try {
        const result = await db_1.db.transaction(async (tx) => {
            // Generate deterministic lock keys for this refund
            const userHash = hashCode32(userId);
            const refHash = hashCode32(reference);
            // Acquire advisory lock to serialize concurrent requests for this exact refund
            await tx.execute((0, drizzle_orm_1.sql) `SELECT pg_advisory_xact_lock(${userHash}, ${refHash})`);
            // Check for existing refund transaction (idempotency)
            const existingTransactions = await tx
                .select()
                .from(schema_1.creditTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.creditTransactions.reference, reference), (0, drizzle_orm_1.eq)(schema_1.creditTransactions.userId, userId)));
            if (existingTransactions.length > 0) {
                logger_1.logger.info(`Refund already processed for ${reference} - skipping duplicate`, undefined, 'CreditService');
                return {
                    success: true,
                    creditsReversed: 0,
                    alreadyProcessed: true
                };
            }
            // Lock the user row and get current balance
            const lockResult = await tx.execute((0, drizzle_orm_1.sql) `SELECT credits FROM users WHERE id = ${userId} FOR UPDATE`);
            const currentCredits = Number(lockResult.rows?.[0]?.credits) || 0;
            // Deduct credits (can't go below 0)
            const actualReversal = Math.min(creditsToReverse, currentCredits);
            // Update user credits
            const newBalance = Math.max(0, currentCredits - actualReversal);
            await tx
                .update(schema_1.users)
                .set({ credits: newBalance })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            // Record the refund transaction (negative amount)
            const [insertedTransaction] = await tx.insert(schema_1.creditTransactions).values({
                userId,
                type: 'refund',
                amount: -actualReversal,
                description,
                reference,
            }).returning();
            logger_1.logger.info(`[${gateway}] Reversed ${actualReversal} credits for refund ${gatewayRefundId}. New balance: ${newBalance}`, undefined, 'CreditService');
            return {
                success: true,
                creditsReversed: actualReversal,
                newBalance,
                transactionId: insertedTransaction?.id,
                alreadyProcessed: false,
            };
        });
        return result;
    }
    catch (error) {
        // Handle unique constraint violation (double submission caught by DB)
        if (error.code === '23505' || error.message?.includes('duplicate')) {
            logger_1.logger.info(`Refund already processed for ${reference} (caught by constraint)`, undefined, 'CreditService');
            return {
                success: true,
                creditsReversed: 0,
                alreadyProcessed: true,
            };
        }
        logger_1.logger.error(`Failed to apply refund for ${reference}: ${error.message}`, error, 'CreditService');
        return {
            success: false,
            creditsReversed: 0,
            error: error.message,
        };
    }
}
/**
 * Deduct credits for a SIP call.
 * Uses global settings for credit_price_per_minute to ensure consistent billing across all SIP engines.
 *
 * @param sipCallId - The ID of the SIP call record
 * @param durationSeconds - Duration of the call in seconds
 * @param engine - The SIP engine ('elevenlabs-sip' or 'openai-sip')
 */
async function deductSipCallCredits(sipCallId, durationSeconds, engine) {
    try {
        // Get credit price per minute from global settings
        const [creditPriceSetting] = await db_1.db
            .select()
            .from(schema_1.globalSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.globalSettings.key, 'credit_price_per_minute'))
            .limit(1);
        let creditPricePerMinute = 1;
        if (creditPriceSetting?.value) {
            const parsed = Number(creditPriceSetting.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
                creditPricePerMinute = parsed;
            }
            else {
                logger_1.logger.warn(`Invalid credit_price_per_minute setting: ${creditPriceSetting.value}. Using default: 1`, undefined, 'CreditService');
            }
        }
        // Calculate credits (rounded up)
        const minutes = Math.ceil(durationSeconds / 60);
        const creditsToDeduct = Math.ceil(minutes * creditPricePerMinute);
        logger_1.logger.info(`[SIP Credit] Duration: ${durationSeconds}s (${minutes} min) × ${creditPricePerMinute} = ${creditsToDeduct} credits`, undefined, 'CreditService');
        // Get SIP call details
        const sipCallResult = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT id, user_id, from_number, to_number FROM sip_calls WHERE id = ${sipCallId} LIMIT 1`);
        const sipCall = sipCallResult.rows[0];
        if (!sipCall) {
            logger_1.logger.error(`SIP Call ${sipCallId} not found`, undefined, 'CreditService');
            return { success: false, creditsDeducted: 0, error: 'SIP Call not found' };
        }
        if (!sipCall.user_id) {
            logger_1.logger.warn(`Could not determine user for SIP call ${sipCallId}`, undefined, 'CreditService');
            return { success: false, creditsDeducted: 0, error: 'Could not determine user for SIP call' };
        }
        // Deduct credits
        const result = await deductCallCredits({
            userId: sipCall.user_id,
            creditsToDeduct,
            callId: sipCall.id,
            fromNumber: sipCall.from_number || 'Unknown',
            toNumber: sipCall.to_number || 'Unknown',
            durationSeconds,
            engine,
        });
        // Update credits_used in sip_calls table
        if (result.success) {
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        UPDATE sip_calls 
        SET credits_used = ${creditsToDeduct}, updated_at = NOW()
        WHERE id = ${sipCallId}
      `);
            logger_1.logger.info(`Updated sip_calls.credits_used: ${creditsToDeduct}`, undefined, 'CreditService');
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error(`SIP Credit deduction error: ${error.message}`, error, 'CreditService');
        return { success: false, creditsDeducted: 0, error: error.message || 'Unknown error' };
    }
}
