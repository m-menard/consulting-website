'use strict';
import { db } from '../db';
import { interviewSessions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { HRStorage } from '../storage/hr-storage';
import { logger } from './logger';

export interface CallbackContext {
  candidate: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    pipelineStage: string | null;
    aiScore: number | null;
    aiSummary: string | null;
    currentDesignation: string | null;
  };
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  lastInterviewSession?: any;
}

export function normalizePhoneE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\.\+]/g, '');
  if (cleaned.length === 0) return '';
  if (!phone.trim().startsWith('+')) {
    cleaned = '+' + cleaned;
  } else {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export async function recognizeCallback(callerPhone: string, userId: string): Promise<CallbackContext | null> {
  if (!callerPhone || !userId) return null;

  try {
    const normalized = normalizePhoneE164(callerPhone);
    const candidateMatches = await HRStorage.findCandidatesByPhoneForUser(normalized, userId);

    if (candidateMatches.length === 0) return null;

    let best = candidateMatches[0];
    for (const match of candidateMatches) {
      if (match.jobStatus === 'active' && best.jobStatus !== 'active') {
        best = match;
      }
    }

    const ctx: CallbackContext = {
      candidate: {
        id: best.candidate.id,
        firstName: best.candidate.firstName,
        lastName: best.candidate.lastName,
        phone: best.candidate.phone,
        email: best.candidate.email,
        pipelineStage: best.candidate.pipelineStage,
        aiScore: best.candidate.aiScore,
        aiSummary: best.candidate.aiSummary,
        currentDesignation: best.candidate.currentDesignation,
      },
      jobId: best.jobId,
      jobTitle: best.jobTitle,
      jobStatus: best.jobStatus,
    };

    try {
      const [latestSession] = await db
        .select()
        .from(interviewSessions)
        .where(eq(interviewSessions.candidateId, best.candidate.id))
        .orderBy(sql`${interviewSessions.createdAt} DESC`)
        .limit(1);

      if (latestSession) {
        ctx.lastInterviewSession = latestSession;
      }
    } catch (sessionErr: any) {
      logger.error(`Failed to fetch interview session for callback: ${sessionErr.message}`, undefined, 'CallbackRecognition');
    }

    logger.info(`Callback recognized: ${ctx.candidate.firstName} ${ctx.candidate.lastName || ''} for "${ctx.jobTitle}" (job ${ctx.jobId})`, undefined, 'CallbackRecognition');
    return ctx;
  } catch (err: any) {
    logger.error(`Callback recognition failed: ${err.message}`, undefined, 'CallbackRecognition');
    return null;
  }
}

export function buildCallbackSystemPromptAddendum(ctx: CallbackContext): string {
  const c = ctx.candidate;
  return `\n\n--- CALLBACK CONTEXT ---\nThis is a callback from a candidate who is calling back. Here are their details:\n- Name: ${c.firstName} ${c.lastName || ''}\n- Phone: ${c.phone || 'Unknown'}\n- Email: ${c.email || 'Not provided'}\n- Position: ${ctx.jobTitle}\n- Current Stage: ${c.pipelineStage || 'Unknown'}\n- AI Score: ${c.aiScore !== null && c.aiScore !== undefined ? c.aiScore + '/100' : 'Not scored yet'}\n- Designation: ${c.currentDesignation || 'Not specified'}\n${c.aiSummary ? '- AI Summary: ' + c.aiSummary : ''}\n${ctx.lastInterviewSession ? '- Previous Interview: ' + ctx.lastInterviewSession.status : ''}\n--- END CALLBACK CONTEXT ---\n\nImportant: Greet the candidate by name since they are calling back. Reference the job they applied for and continue the conversation naturally.`;
}

export function buildCallbackFirstMessage(ctx: CallbackContext): string {
  return `Hello ${ctx.candidate.firstName}! Thank you for calling back regarding the ${ctx.jobTitle} position. How can I help you today?`;
}

export function buildCallbackMetadata(ctx: CallbackContext): Record<string, unknown> {
  return {
    isCallback: true,
    hrCandidateId: ctx.candidate.id,
    hrJobId: ctx.jobId,
    hrJobTitle: ctx.jobTitle,
    hrCandidateName: `${ctx.candidate.firstName} ${ctx.candidate.lastName || ''}`.trim(),
  };
}
