/**
 * ============================================================
 * REST API Plugin - Webhooks Routes
 * Endpoints for managing webhook subscriptions
 * ============================================================
 */

import { Router, Response } from 'express';
import { apiAuthMiddleware, asyncHandler } from '../middleware/auth.middleware.js';
import type { AuthenticatedApiRequest, ApiResponse, WebhookResponse } from '../types.js';
import { db } from '../../../server/db.js';
import { webhookSubscriptions } from '../../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const SUPPORTED_EVENTS = [
  'call.started',
  'call.completed',
  'call.failed',
  'campaign.started',
  'campaign.completed',
  'campaign.paused',
  'contact.created',
  'contact.updated',
  'credits.low',
  'credits.depleted',
];

const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  description: z.string().optional(),
});

/**
 * GET /v1/webhooks - List webhook subscriptions
 */
router.get(
  '/',
  apiAuthMiddleware('webhooks:read'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    
    const webhooks = await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.userId, userId))
      .orderBy(desc(webhookSubscriptions.createdAt));
    
    const response: ApiResponse = {
      success: true,
      data: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        description: w.description,
        lastDeliveryAt: w.lastDeliveryAt,
        lastDeliveryStatus: w.lastDeliveryStatus,
        createdAt: w.createdAt,
      })),
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

/**
 * POST /v1/webhooks - Create webhook subscription
 */
router.post(
  '/',
  apiAuthMiddleware('webhooks:write'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    
    const parseResult = createWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: { errors: parseResult.error.flatten().fieldErrors },
        },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }
    
    const { url, events, secret, description } = parseResult.data;
    
    // Validate events
    const invalidEvents = events.filter(e => !SUPPORTED_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid event types',
          details: { invalidEvents, supportedEvents: SUPPORTED_EVENTS },
        },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }
    
    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');
    
    const [webhook] = await db
      .insert(webhookSubscriptions)
      .values({
        userId,
        url,
        events,
        secret: webhookSecret,
        description,
        isActive: true,
      })
      .returning();
    
    const responseData: WebhookResponse = {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events as string[],
      secret: webhookSecret, // Only shown on creation
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
    };
    
    const response: ApiResponse<WebhookResponse> = {
      success: true,
      data: responseData,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.status(201).json(response);
  })
);

/**
 * PUT /v1/webhooks/:id - Update webhook subscription
 */
router.put(
  '/:id',
  apiAuthMiddleware('webhooks:write'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, userId)))
      .limit(1);
    
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found.' },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      return res.status(404).json(response);
    }
    
    const { url, events, isActive, description } = req.body;
    
    // Validate events if provided
    if (events) {
      const invalidEvents = events.filter((e: string) => !SUPPORTED_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid event types',
            details: { invalidEvents, supportedEvents: SUPPORTED_EVENTS },
          },
          meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
        };
        return res.status(400).json(response);
      }
    }
    
    const [updated] = await db
      .update(webhookSubscriptions)
      .set({
        url: url ?? existing.url,
        events: events ?? existing.events,
        isActive: isActive ?? existing.isActive,
        description: description ?? existing.description,
        updatedAt: new Date(),
      })
      .where(eq(webhookSubscriptions.id, id))
      .returning();
    
    const response: ApiResponse = {
      success: true,
      data: {
        id: updated.id,
        url: updated.url,
        events: updated.events,
        isActive: updated.isActive,
        description: updated.description,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

/**
 * DELETE /v1/webhooks/:id - Delete webhook subscription
 */
router.delete(
  '/:id',
  apiAuthMiddleware('webhooks:write'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    
    const result = await db
      .delete(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found.' },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: { deleted: true },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

/**
 * POST /v1/webhooks/:id/test - Test webhook delivery
 */
router.post(
  '/:id/test',
  apiAuthMiddleware('webhooks:write'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    
    const [webhook] = await db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, userId)))
      .limit(1);
    
    if (!webhook) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found.' },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      return res.status(404).json(response);
    }
    
    // Send test payload
    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from AgentHR API.',
        webhookId: webhook.id,
      },
    };
    
    try {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');
      
      const deliveryResponse = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AgentHR-Signature': signature,
          'X-AgentHR-Event': 'test.ping',
        },
        body: JSON.stringify(testPayload),
      });
      
      const response: ApiResponse = {
        success: true,
        data: {
          delivered: deliveryResponse.ok,
          statusCode: deliveryResponse.status,
          message: deliveryResponse.ok ? 'Test webhook delivered successfully.' : 'Webhook delivery failed.',
        },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      
      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to deliver test webhook: ${error.message}`,
        },
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      };
      res.status(500).json(response);
    }
  })
);

/**
 * GET /v1/webhooks/events - List supported events
 */
router.get(
  '/events',
  apiAuthMiddleware('webhooks:read'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        events: SUPPORTED_EVENTS.map(event => ({
          name: event,
          description: getEventDescription(event),
        })),
      },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

function getEventDescription(event: string): string {
  const descriptions: Record<string, string> = {
    'call.started': 'Triggered when a call begins',
    'call.completed': 'Triggered when a call ends successfully',
    'call.failed': 'Triggered when a call fails',
    'campaign.started': 'Triggered when a campaign starts',
    'campaign.completed': 'Triggered when a campaign finishes',
    'campaign.paused': 'Triggered when a campaign is paused',
    'contact.created': 'Triggered when a contact is created',
    'contact.updated': 'Triggered when a contact is updated',
    'credits.low': 'Triggered when credits fall below threshold',
    'credits.depleted': 'Triggered when credits are exhausted',
  };
  return descriptions[event] || 'No description available';
}

export default router;
