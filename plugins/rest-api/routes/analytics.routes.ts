/**
 * ============================================================
 * REST API Plugin - Analytics Routes
 * Endpoints for viewing call and campaign analytics
 * ============================================================
 */

import { Router, Response } from 'express';
import { apiAuthMiddleware, asyncHandler } from '../middleware/auth.middleware.js';
import type { AuthenticatedApiRequest, ApiResponse, CallAnalytics } from '../types.js';
import { db } from '../../../server/db.js';
import { calls, plivoCalls, twilioOpenaiCalls, campaigns } from '../../../shared/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /v1/analytics/calls - Get call analytics
 */
router.get(
  '/calls',
  apiAuthMiddleware('analytics:read'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get calls from all engines
    const [elevenLabsStats, plivoStats, twilioStats] = await Promise.all([
      db
        .select({
          totalCalls: sql<number>`count(*)`,
          completedCalls: sql<number>`count(*) filter (where status = 'completed')`,
          failedCalls: sql<number>`count(*) filter (where status = 'failed')`,
          totalDuration: sql<number>`coalesce(sum(duration), 0)`,
          totalCredits: sql<number>`coalesce(sum(credits_used), 0)`,
        })
        .from(calls)
        .where(and(eq(calls.userId, userId), gte(calls.createdAt, startDate))),
      db
        .select({
          totalCalls: sql<number>`count(*)`,
          completedCalls: sql<number>`count(*) filter (where status = 'completed')`,
          failedCalls: sql<number>`count(*) filter (where status = 'failed')`,
          totalDuration: sql<number>`coalesce(sum(duration_seconds), 0)`,
          totalCredits: sql<number>`coalesce(sum(credits_used), 0)`,
        })
        .from(plivoCalls)
        .where(and(eq(plivoCalls.userId, userId), gte(plivoCalls.createdAt, startDate))),
      db
        .select({
          totalCalls: sql<number>`count(*)`,
          completedCalls: sql<number>`count(*) filter (where status = 'completed')`,
          failedCalls: sql<number>`count(*) filter (where status = 'failed')`,
          totalDuration: sql<number>`coalesce(sum(duration_seconds), 0)`,
          totalCredits: sql<number>`coalesce(sum(credits_used), 0)`,
        })
        .from(twilioOpenaiCalls)
        .where(and(eq(twilioOpenaiCalls.userId, userId), gte(twilioOpenaiCalls.createdAt, startDate))),
    ]);
    
    const combined = {
      totalCalls: Number(elevenLabsStats[0]?.totalCalls || 0) + Number(plivoStats[0]?.totalCalls || 0) + Number(twilioStats[0]?.totalCalls || 0),
      completedCalls: Number(elevenLabsStats[0]?.completedCalls || 0) + Number(plivoStats[0]?.completedCalls || 0) + Number(twilioStats[0]?.completedCalls || 0),
      failedCalls: Number(elevenLabsStats[0]?.failedCalls || 0) + Number(plivoStats[0]?.failedCalls || 0) + Number(twilioStats[0]?.failedCalls || 0),
      totalDuration: Number(elevenLabsStats[0]?.totalDuration || 0) + Number(plivoStats[0]?.totalDuration || 0) + Number(twilioStats[0]?.totalDuration || 0),
      totalCredits: Number(elevenLabsStats[0]?.totalCredits || 0) + Number(plivoStats[0]?.totalCredits || 0) + Number(twilioStats[0]?.totalCredits || 0),
    };
    
    const analytics: CallAnalytics = {
      totalCalls: combined.totalCalls,
      completedCalls: combined.completedCalls,
      failedCalls: combined.failedCalls,
      totalDurationMinutes: Math.round(combined.totalDuration / 60),
      averageDurationSeconds: combined.totalCalls > 0 ? Math.round(combined.totalDuration / combined.totalCalls) : 0,
      creditsUsed: combined.totalCredits,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    };
    
    const response: ApiResponse<CallAnalytics> = {
      success: true,
      data: analytics,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

/**
 * GET /v1/analytics/campaigns - Get campaign analytics
 */
router.get(
  '/campaigns',
  apiAuthMiddleware('analytics:read'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    
    const campaignList = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt))
      .limit(50);
    
    const analytics = campaignList.map(c => ({
      campaignId: c.id,
      name: c.name,
      status: c.status,
      totalContacts: c.totalContacts || 0,
      completed: c.completedCalls || 0,
      successful: c.successfulCalls || 0,
      failed: c.failedCalls || 0,
      pending: (c.totalContacts || 0) - (c.completedCalls || 0),
      successRate: c.totalContacts > 0 
        ? Math.round(((c.successfulCalls || 0) / c.totalContacts) * 100) 
        : 0,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      createdAt: c.createdAt,
    }));
    
    const response: ApiResponse = {
      success: true,
      data: analytics,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

/**
 * GET /v1/analytics/summary - Get overall analytics summary
 */
router.get(
  '/summary',
  apiAuthMiddleware('analytics:read'),
  asyncHandler(async (req: AuthenticatedApiRequest, res: Response) => {
    const { userId } = req.apiAuth;
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get aggregate stats
    const [callStats, campaignStats] = await Promise.all([
      // Total calls across all engines
      db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`count(*) filter (where status = 'completed')`,
        })
        .from(calls)
        .where(and(eq(calls.userId, userId), gte(calls.createdAt, startDate))),
      // Campaign stats
      db
        .select({
          total: sql<number>`count(*)`,
          running: sql<number>`count(*) filter (where status = 'running')`,
          completed: sql<number>`count(*) filter (where status = 'completed')`,
        })
        .from(campaigns)
        .where(eq(campaigns.userId, userId)),
    ]);
    
    const response: ApiResponse = {
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days,
        },
        calls: {
          total: Number(callStats[0]?.total || 0),
          completed: Number(callStats[0]?.completed || 0),
        },
        campaigns: {
          total: Number(campaignStats[0]?.total || 0),
          running: Number(campaignStats[0]?.running || 0),
          completed: Number(campaignStats[0]?.completed || 0),
        },
      },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    };
    
    res.json(response);
  })
);

export default router;
