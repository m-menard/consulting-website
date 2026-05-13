/**
 * OpenAI SIP Webhook Routes
 * Handles incoming SIP calls via OpenAI Realtime API webhooks
 * 
 * Webhook URL to configure in OpenAI Platform:
 * POST https://your-domain.com/api/openai-sip/webhook
 * 
 * OpenAI webhook signature format:
 * - webhook-id: Unique ID for idempotency
 * - webhook-timestamp: Unix timestamp of delivery attempt
 * - webhook-signature: v1,<base64-encoded-hmac-sha256>
 * 
 * See: https://platform.openai.com/docs/guides/webhooks
 */

import { Router, Request, Response } from 'express';
import { OpenAISipService } from '../services/openai-sip.service';

const router = Router();

/**
 * Verify OpenAI webhook signature using database-stored secret
 * Headers: webhook-id, webhook-timestamp, webhook-signature
 * 
 * SECURITY: This function REJECTS requests when:
 * - Required signature headers are missing (always reject)
 * - Signature verification fails (always reject)
 * 
 * Note: If no webhook secret is configured in the database, verification
 * is skipped with a warning. Admins should configure the secret in the
 * admin panel before going to production.
 */
async function verifyWebhookSignature(req: Request): Promise<{ valid: boolean; reason?: string }> {
  const webhookId = req.headers['webhook-id'] as string;
  const webhookTimestamp = req.headers['webhook-timestamp'] as string;
  const webhookSignature = req.headers['webhook-signature'] as string;

  // Check if webhook secret is configured
  const secret = await OpenAISipService.getWebhookSecret();
  
  // If no secret is configured, allow for initial testing (but log warning)
  // In production, admins should always configure the webhook secret
  if (!secret) {
    console.warn('[OpenAI SIP] SECURITY WARNING: No webhook secret configured - requests are not verified');
    console.warn('[OpenAI SIP] Configure webhook secret in Admin > Plugins > SIP Engine > OpenAI SIP Setup');
    return { valid: true, reason: 'No secret configured (testing mode)' };
  }

  // With secret configured, ALL required headers must be present
  if (!webhookSignature) {
    console.error('[OpenAI SIP] Missing webhook-signature header');
    return { valid: false, reason: 'Missing webhook-signature header' };
  }

  if (!webhookId) {
    console.error('[OpenAI SIP] Missing webhook-id header');
    return { valid: false, reason: 'Missing webhook-id header' };
  }

  if (!webhookTimestamp) {
    console.error('[OpenAI SIP] Missing webhook-timestamp header');
    return { valid: false, reason: 'Missing webhook-timestamp header' };
  }

  // Verify signature
  const payload = JSON.stringify(req.body);
  const isValid = await OpenAISipService.verifyWebhookSignature(
    payload,
    webhookSignature,
    webhookId,
    webhookTimestamp
  );

  return { valid: isValid, reason: isValid ? undefined : 'Signature verification failed' };
}

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const verification = await verifyWebhookSignature(req);
    if (!verification.valid) {
      console.error(`[OpenAI SIP] Webhook rejected: ${verification.reason}`);
      return res.status(401).json({ error: verification.reason || 'Invalid signature' });
    }

    const event = req.body;
    console.log(`[OpenAI SIP] Webhook received: ${event.type}`);

    switch (event.type) {
      case 'realtime.call.incoming': {
        const result = await OpenAISipService.handleIncomingCall(event);
        
        if (result.action === 'accept' && result.config) {
          const acceptResult = await OpenAISipService.acceptCall(event.data.call_id, result.config);
          if (!acceptResult.success) {
            console.error(`[OpenAI SIP] Failed to accept call: ${acceptResult.error}`);
          }
        } else {
          await OpenAISipService.rejectCall(event.data.call_id, result.reason || 'Call rejected');
        }
        break;
      }

      case 'realtime.call.completed': {
        await OpenAISipService.handleCallCompleted(
          event.data.call_id,
          event.data.duration_seconds,
          event.data.transcript
        );
        break;
      }

      case 'realtime.call.failed': {
        await OpenAISipService.handleCallFailed(
          event.data.call_id,
          event.data.reason || 'Unknown error'
        );
        break;
      }

      default:
        console.log(`[OpenAI SIP] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[OpenAI SIP] Error handling webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      engine: 'openai-sip',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const projectId = await OpenAISipService.getOpenAIProjectId();
    const sipEndpoint = OpenAISipService.getSipEndpoint(projectId);
    
    res.json({
      success: true,
      data: {
        sipEndpoint,
        projectId,
        webhookUrl: `${process.env.BASE_URL || 'https://your-domain.com'}/api/openai-sip/webhook`,
        instructions: [
          '1. Configure your SIP trunk to point to the sipEndpoint above',
          '2. Set the webhookUrl in your OpenAI Platform project settings',
          '3. Import phone numbers and assign agents in AgentHR',
          '4. Incoming calls will be handled by the assigned AI agent',
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
