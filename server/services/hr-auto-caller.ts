'use strict';
import { HRStorage } from '../storage/hr-storage';
import { db } from '../db';
import { jobs, candidates, campaigns, contacts, agents, phoneNumbers, openaiCredentials, interviewSessions as interviewSessionsTable, calls, hrCalls, twilioOpenaiCalls, flows } from '@shared/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import OpenAI from 'openai';
import type { Job, Candidate } from '@shared/schema';
import { CampaignExecutor } from './campaign-executor';


async function getTranscriptFromDB(callSid: string) {
  const [call] = await db
    .select()
    .from(twilioOpenaiCalls)
    .where(eq(twilioOpenaiCalls.twilioCallSid, callSid))
    .limit(1);

    console.log("CHECK GETTRANSCRIPT FUNCTION", call)

  return call?.transcript || "";
}

function normalizePhoneForCalling(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

async function getOpenAIKey(): Promise<string | null> {
  let key = process.env.OPENAI_API_KEY;
  if (!key) {
    try {
      const [credential] = await db
        .select()
        .from(openaiCredentials)
        .where(eq(openaiCredentials.isActive, true))
        .limit(1);
      if (credential?.apiKey) key = credential.apiKey;
    } catch (e) {
      console.error('[HR AutoCaller] Error fetching OpenAI credential:', e);
    }
  }
  return key || null;
}

export async function generateCallScript(job: Job): Promise<string> {
  const openaiKey = await getOpenAIKey();
  if (!openaiKey) {
    return getDefaultCallScript(job);
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert HR recruiter creating a phone screening script. Create a professional, conversational phone interview script that an AI voice agent will use to screen candidates. The script should:
1. Start with a warm greeting and introduce yourself as an AI assistant from the company
2. Confirm the candidate's identity and interest in the position
3. Ask 3-5 targeted questions based on the job requirements
4. Include probing follow-up prompts
5. Close professionally with next steps information

IMPORTANT RESCHEDULING BEHAVIOR:
- If at ANY point the candidate says they are busy, not available, or asks to be called back later, you MUST be understanding and polite.
- Ask them: "No problem at all! When would be a convenient time for me to call you back?"
- Accept their preferred date and time. Confirm it back to them clearly, for example: "Great, I'll call you back on Tuesday at 3 PM. Have a wonderful day!"
- If they give a vague time like "tomorrow afternoon", confirm a specific time like "tomorrow at 2 PM".
- End the call gracefully after confirming the callback time.
- This is normal behavior - not every candidate is available right now, and we respect their time.

Keep it natural and conversational - this will be spoken aloud by an AI voice agent. Include clear transitions between questions. The entire call should take about 5-8 minutes.

Respond with ONLY the script text, no JSON or formatting.`
      },
      {
        role: 'user',
        content: `Create a phone screening script for this job:

Title: ${job.title}
Department: ${job.department || 'N/A'}
Description: ${job.description}
Required Skills: ${job.requiredSkills?.join(', ') || 'N/A'}
Experience Level: ${job.experienceLevel || 'N/A'}
Min Experience: ${job.minExperienceYears || 'N/A'} years
Location: ${job.location || 'N/A'}
Employment Type: ${job.employmentType || 'full_time'}
Salary Range: ${job.salaryMin ? `${job.salaryCurrency} ${job.salaryMin} - ${job.salaryMax}` : 'Not specified'}`
      }
    ],
  });

  return response.choices[0].message.content || getDefaultCallScript(job);
}

function getDefaultCallScript(job: Job): string {
  return `Hello! This is an AI assistant calling on behalf of the hiring team regarding the ${job.title} position${job.department ? ` in the ${job.department} department` : ''}.

I'd like to conduct a brief phone screening to learn more about your background and interest in this role. This should take about 5-8 minutes.

First, could you briefly tell me about your current role and what interests you about this ${job.title} position?

Great. ${job.requiredSkills?.length ? `This role requires experience with ${job.requiredSkills.slice(0, 3).join(', ')}. Could you describe your experience with these technologies?` : 'Could you describe your relevant experience for this role?'}

What is your availability to start a new position, and do you have a notice period with your current employer?

${job.salaryMin ? `The salary range for this position is ${job.salaryCurrency} ${job.salaryMin} to ${job.salaryMax}. Does this align with your expectations?` : 'What are your salary expectations for this role?'}

Is there anything else you'd like to share about your qualifications or questions about the position?

If the candidate is busy or wants to be called back later, say: "No problem at all! When would be a convenient time for me to call you back?" Then confirm the time and end politely.

Thank you for your time today. Our team will review this conversation and reach out with next steps within the coming days. Have a great day!`;
}

export async function detectRescheduleRequest(
  transcript: string
): Promise<{ isReschedule: boolean; preferredDateTime: string | null; reason: string }> {
  const openaiKey = await getOpenAIKey();
  if (!openaiKey) {
    return { isReschedule: false, preferredDateTime: null, reason: '' };
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Analyze this phone call transcript between an AI hiring assistant and a job candidate. Determine if the candidate requested to be called back at a different time (reschedule).

Look for signals like:
- "Call me later", "I'm busy right now", "Can you call back"
- "Not a good time", "I'm in a meeting", "Can we do this another time"
- The AI agent asking when to call back and the candidate providing a time
- Any mention of a preferred callback date/time

Respond with ONLY valid JSON:
{
  "isReschedule": true/false,
  "preferredDateTime": "ISO 8601 datetime string if mentioned, or null if not specific",
  "reason": "Brief explanation of why this is/isn't a reschedule request"
}

If the candidate gave a specific time like "tomorrow at 3pm" or "Tuesday afternoon", convert it to ISO 8601 relative to the current date (${new Date().toISOString()}). If they said something vague like "later today" or "sometime next week", pick a reasonable default time (e.g., next business day at 10 AM local time).
If the call was a normal completed interview (questions were asked and answered), it is NOT a reschedule even if the candidate mentioned being busy at some point.`
      },
      {
        role: 'user',
        content: transcript
      }
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return { isReschedule: false, preferredDateTime: null, reason: 'Empty response' };
  }

  try {
    return JSON.parse(content);
  } catch {
    return { isReschedule: false, preferredDateTime: null, reason: 'Parse error' };
  }
}

export async function processPostCallAnalysis(
  callId: string,
  transcript: string,
  job: Job,
  candidate: Candidate
): Promise<{ summary: string; score: number; recommendation: string; evaluation: string }> {
  const openaiKey = await getOpenAIKey();
  if (!openaiKey) {
    return {
      summary: 'Call completed. Manual review required - OpenAI key not configured.',
      score: 50,
      recommendation: 'hold',
      evaluation: 'Unable to generate AI evaluation without API key.',
    };
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert HR interviewer analyzing a phone screening call transcript. Evaluate the candidate's responses and provide a structured assessment. Respond ONLY with valid JSON:
{
  "summary": "2-3 sentence summary of the call and candidate's key points",
  "score": <number 0-100, how well the candidate performed>,
  "recommendation": "advance" | "hold" | "reject",
  "evaluation": "Detailed paragraph evaluating communication skills, technical knowledge, enthusiasm, and cultural fit based on the conversation"
}`
      },
      {
        role: 'user',
        content: `JOB: ${job.title} (${job.department || 'N/A'})
Required Skills: ${job.requiredSkills?.join(', ') || 'N/A'}
Experience Level: ${job.experienceLevel || 'N/A'}

CANDIDATE: ${candidate.firstName} ${candidate.lastName || ''}
Current Role: ${candidate.currentDesignation || 'N/A'}
Experience: ${candidate.totalExperienceYears || 'N/A'} years

CALL TRANSCRIPT:
${transcript}`
      }
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;

  console.log("CHECK CONTENT@@@@@@@@@@@SCORE", content)
  if (!content) {
    return { summary: 'Analysis failed', score: 50, recommendation: 'hold', evaluation: 'Empty response' };
  }

  return JSON.parse(content);
}

export class HRAutoCallerService {
  private static instance: HRAutoCallerService;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private campaignExecutor: CampaignExecutor;

  constructor() {
    this.campaignExecutor = new CampaignExecutor();
  }

  static getInstance(): HRAutoCallerService {
    if (!HRAutoCallerService.instance) {
      HRAutoCallerService.instance = new HRAutoCallerService();
    }
    return HRAutoCallerService.instance;
  }

  async startPolling() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[HR AutoCaller] Starting polling service (scheduled interviews)...');
    this.pollInterval = setInterval(() => {
      this.processScheduledInterviews();
    }, 15000);
    this.processScheduledInterviews();
  }

  async stopPolling() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('[HR AutoCaller] Stopped polling service.');
  }

  async startJobCalling(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const job = await HRStorage.getJob(jobId);
    if (!job || job.userId !== userId) {
      return { success: false, error: 'Job not found' };
    }
    if (!job.autoCallEnabled) {
      return { success: false, error: 'Auto-calling is not enabled for this job' };
    }
    if (!job.agentId) {
      return { success: false, error: 'No AI agent selected. Please select an agent in the calling configuration.' };
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, job.agentId)).limit(1);
    if (!agent) {
      return { success: false, error: 'Selected agent not found.' };
    }

    const provider = agent.telephonyProvider || 'twilio';

    const readyCandidates = await HRStorage.getCallReadyCandidates(job.id, job.minAiScoreForCall);
    console.log("check ready candidates", readyCandidates)
    if (readyCandidates.length === 0) {
      return { success: false, error: 'No eligible candidates to call. Candidates need to be AI-screened and meet the minimum score threshold.' };
    }



    try {
      const STATIC_TEST_NUMBER_ID = '+1 (507) 335-4139';

      const activePhoneNumbers = await db
        .select({ id: phoneNumbers.id })
        .from(phoneNumbers)
        .limit(1);
        //  .where(eq(phoneNumbers.status, 'active'))

      console.log(`Active phone numbers found: ${activePhoneNumbers.length}, using ${provider === 'plivo' ? 'Plivo number' : provider === 'elevenlabs-sip' || provider === 'openai-sip' ? 'SIP number' : 'default number'}`);

      const phoneNumberId: string =
        activePhoneNumbers[0]?.id ??
        job.callingPhoneNumberId ??
        STATIC_TEST_NUMBER_ID;
      let plivoPhoneNumberId: string | null = null;
      let sipPhoneNumberId: string | null = null;

      if (provider === 'plivo') {
        plivoPhoneNumberId = job.callingPhoneNumberId || STATIC_TEST_NUMBER_ID;
        phoneNumberId = null;
      } else if (provider === 'elevenlabs-sip' || provider === 'openai-sip') {
        sipPhoneNumberId = job.callingPhoneNumberId || STATIC_TEST_NUMBER_ID;
        phoneNumberId = null;
      }

      let existingCampaignId = (job as any).campaignId;
      if (existingCampaignId) {
        const [existingCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, existingCampaignId)).limit(1);
        if (existingCampaign && ['running', 'in_progress'].includes(existingCampaign.status)) {
          return { success: false, error: 'A calling campaign is already running for this job.' };
        }
        if (existingCampaign && ['pending', 'draft', 'scheduled'].includes(existingCampaign.status)) {
          await db.delete(contacts).where(eq(contacts.campaignId, existingCampaignId));
        } else {
          existingCampaignId = null;
        }
      }

      let campaignId: string;

      if (existingCampaignId) {
        await db.update(campaigns).set({
          agentId: job.agentId,
          phoneNumberId,
          plivoPhoneNumberId,
          sipPhoneNumberId,
          script: job.callScript || undefined,
          flowId: job.flowId || undefined,
          status: 'pending',
          totalContacts: readyCandidates.length,
          completedCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          startedAt: null,
          completedAt: null,
        }).where(eq(campaigns.id, existingCampaignId));
        campaignId = existingCampaignId;
        console.log(`[HR AutoCaller] Reusing campaign ${campaignId} for job ${job.title}`);
      } else {
        const [newCampaign] = await db.insert(campaigns).values({
          userId: job.userId,
          agentId: job.agentId,
          phoneNumberId,
          plivoPhoneNumberId,
          sipPhoneNumberId,
          name: `HR Auto-Call: ${job.title}`,
          type: 'hr_screening',
          goal: `Automated phone screening for ${job.title} candidates`,
          script: job.callScript || undefined,
          flowId: job.flowId || undefined,
          status: 'pending',
          totalContacts: readyCandidates.length,
          maxConcurrency: job.maxConcurrentCalls || 3,
        }).returning();
        campaignId = newCampaign.id;
        console.log(`[HR AutoCaller] Created campaign ${campaignId} for job ${job.title}`);
      }

      await db.update(jobs).set({ campaignId }).where(eq(jobs.id, jobId));

      await HRStorage.updateJob(jobId, userId, {
  totalCandidates: readyCandidates.length // ✅ ADD THIS
});

      const contactInserts = readyCandidates.map(c => ({
        campaignId,
        firstName: c.firstName,
        lastName: c.lastName || undefined,
        phone: normalizePhoneForCalling(c.phone!),
        email: c.email || undefined,
        customFields: {
          hrCandidateId: c.id,
          hrJobId: job.id,
          designation: c.currentDesignation || '',
          company: c.currentCompany || '',
          aiScore: c.aiScore,
        },
        status: 'pending' as const,
      }));

      await db.insert(contacts).values(contactInserts);
      console.log(`[HR AutoCaller] Synced ${contactInserts.length} candidates as campaign contacts`);

      for (const c of readyCandidates) {
        await HRStorage.updateCandidate(c.id, {
          callStatus: 'queued',
          callAttempts: (c.callAttempts || 0) + 1,
          callProvider: provider,
          lastCallAt: new Date(), 
        } as any);

        await HRStorage.createHrCall({
          userId: job.userId,
          jobId: job.id,
          candidateId: c.id,
          provider: provider,
          direction: 'outbound',
          toNumber: c.phone!,
          fromNumber: job.callingPhoneNumberId || undefined,
          status: 'queued',
          attemptNumber: (c.callAttempts || 0) + 1,
        });

        const existingSessions = await HRStorage.getInterviewsByCandidate(c.id);
        const hasSessionForJob = existingSessions.some(s => s.jobId === job.id);
        if (!hasSessionForJob) {
          await HRStorage.createInterviewSession({
            userId: job.userId,
            jobId: job.id,
            candidateId: c.id,
            interviewType: 'phone',
            status: 'scheduled',
            scheduledAt: new Date(),
          });
        }
      }

      await HRStorage.updateJob(jobId, userId, { callingStatus: 'running' } as any);

      const result = await this.campaignExecutor.executeCampaign(campaignId);
      console.log(`[HR AutoCaller] Campaign ${campaignId} started via campaign executor for job ${job.title} (engine: ${provider})`);

      if (!this.isRunning) {
        this.startPolling();
      }

      return { success: true };
    } catch (error: any) {
      console.error(`[HR AutoCaller] Failed to start calling for job ${jobId}:`, error.message);
      await HRStorage.updateJob(jobId, userId, { callingStatus: 'idle' } as any);
      return { success: false, error: `Failed to start calling: ${error.message}` };
    }
  }

  async pauseJobCalling(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const job = await HRStorage.getJob(jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const campaignId = (job as any).campaignId;
    if (campaignId) {
      try {
        await this.campaignExecutor.pauseCampaign(campaignId, 'manual');
        console.log(`[HR AutoCaller] Paused campaign ${campaignId} for job ${job.title}`);
      } catch (e: any) {
        console.warn(`[HR AutoCaller] Campaign pause warning: ${e.message}`);
      }
    }

    await HRStorage.updateJob(jobId, userId, { callingStatus: 'paused' } as any);
    return { success: true };
  }

  async stopJobCalling(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const job = await HRStorage.getJob(jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const campaignId = (job as any).campaignId;
    if (campaignId) {
      try {
        await this.campaignExecutor.cancelCampaign(campaignId);
        console.log(`[HR AutoCaller] Cancelled campaign ${campaignId} for job ${job.title}`);
      } catch (e: any) {
        console.warn(`[HR AutoCaller] Campaign cancel warning: ${e.message}`);
      }
    }

    await HRStorage.updateJob(jobId, userId, { callingStatus: 'idle' } as any);
    return { success: true };
  }

  async resumeJobCalling(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const job = await HRStorage.getJob(jobId);
    if (!job) return { success: false, error: 'Job not found' };
    if (!job.agentId) {
      return { success: false, error: 'No AI agent assigned to this job. Please assign an agent before resuming calls.' };
    }

    const campaignId = (job as any).campaignId;
    if (!campaignId) {
      return this.startJobCalling(jobId, userId);
    }

    try {
      await this.campaignExecutor.resumeCampaign(campaignId, 'manual');
      await HRStorage.updateJob(jobId, userId, { callingStatus: 'running' } as any);
      console.log(`[HR AutoCaller] Resumed campaign ${campaignId} for job ${job.title}`);
      return { success: true };
    } catch (e: any) {
      console.error(`[HR AutoCaller] Resume failed: ${e.message}`);
      return this.startJobCalling(jobId, userId);
    }
  }

  decrementActiveCallsForJob(_jobId: string) {
  }

  async handleWebhookCallUpdate(callSid: string, status: string, data: {
    duration?: number;
    recordingUrl?: string;
    transcript?: string;
  }) {
    let hrCall = await HRStorage.getHrCallByCallSid(callSid);

    if (!hrCall) {
      hrCall = await this.bridgeCampaignCallToHrCallBySid(callSid);
    }

    if (!hrCall) {
      console.log(`[HR AutoCaller] No HR call found for callSid ${callSid} - skipping`);
      return;
    }

    console.log(`[HR AutoCaller] Webhook update for HR call ${hrCall.id}: status=${status}, callSid=${callSid}`);

    const hrStatus = this.mapTwilioStatusToHr(status);
    const updateData: any = { status: hrStatus };
    if (data.duration) updateData.duration = data.duration;
    if (data.recordingUrl) updateData.recordingUrl = data.recordingUrl;
    if (data.transcript) updateData.transcript = data.transcript;
    if (['completed', 'failed', 'no_answer', 'busy', 'cancelled', 'no-answer'].includes(status)) {
      updateData.endedAt = new Date();
    }
    if (status === 'in-progress' || status === 'ringing') {
      updateData.startedAt = new Date();
    }

    await HRStorage.updateHrCall(hrCall.id, updateData);

    const terminalStatuses = ['completed', 'failed', 'no-answer', 'busy', 'canceled', 'cancelled'];
    if (terminalStatuses.includes(status)) {
      try {
        const candidate = await HRStorage.getCandidate(hrCall.candidateId);
        if (candidate) {
          const candidateCallStatus = status === 'completed' ? 'completed' :
            status === 'no-answer' ? 'no_answer' :
              status === 'busy' ? 'busy' : 'failed';
          await HRStorage.updateCandidate(candidate.id, { callStatus: candidateCallStatus } as any);
          console.log(`[HR AutoCaller] Updated candidate ${candidate.firstName} call status to ${candidateCallStatus}`);
        }

        if (status === 'completed') {
          await HRStorage.incrementJobCounter(hrCall.jobId, 'totalCallCompleted');
        } else {
          await HRStorage.incrementJobCounter(hrCall.jobId, 'totalCallFailed');
        }
        await HRStorage.incrementJobCounter(hrCall.jobId, 'totalCalled');
      } catch (e: any) {
        console.error(`[HR AutoCaller] Error updating candidate/job counters: ${e.message}`);
      }

      try {
        const interviewStatus = status === 'completed' ? 'completed' :
          status === 'no-answer' ? 'no_show' : 'failed';
        const sessions = await HRStorage.getInterviewsByCandidate(hrCall.candidateId);
        const session = sessions.find(s => s.jobId === hrCall.jobId && s.status !== 'completed');
        if (session) {
          const sessionUpdate: any = { status: interviewStatus };
          if (status === 'completed') {
            sessionUpdate.completedAt = new Date();
            if (data.duration) sessionUpdate.duration = data.duration;
            if (data.recordingUrl) sessionUpdate.recordingUrl = data.recordingUrl;
            if (data.transcript) sessionUpdate.transcript = data.transcript;
          }
          await HRStorage.updateInterviewSession(session.id, sessionUpdate);
          console.log(`[HR AutoCaller] Updated interview session ${session.id} to ${interviewStatus}`);
        }
      } catch (e: any) {
        console.error(`[HR AutoCaller] Error updating interview session: ${e.message}`);
      }

      // if (status === 'completed' && data.transcript) {
      //   await this.processCompletedCall(hrCall, data.transcript, data.duration, data.recordingUrl);
      // }

      if(status === 'completed'){
        this.processCompletedCall(
  hrCall,
  data.transcript || "No transcript available",
  data.duration,
  data.recordingUrl
);
      }

      const retryableStatuses = ['failed', 'no-answer', 'busy'];
      if (retryableStatuses.includes(status)) {
        try {
          await this.scheduleRetryIfEligible(hrCall);
        } catch (e: any) {
          console.error(`[HR AutoCaller] Error scheduling retry: ${e.message}`);
        }
      }
    }


    // ✅ AFTER all status updates (very important: end of function ke paas lagana)

try {
  const job = await HRStorage.getJob(hrCall.jobId);
  if (!job) return;

  // total expected calls
  const totalCandidates = job.totalCandidates || 0;

  // total calls already attempted (completed + failed + no_answer etc.)
  const totalCalled = job.totalCalled || 0;

  console.log('[DEBUG] Job call progress:', {
    totalCandidates,
    totalCalled,
    jobId: job.id,
  });

  // ✅ if all calls done → stop job
  if (totalCandidates > 0 && totalCalled >= totalCandidates) {
    console.log(`✅ All calls finished for job ${job.id} → setting status to idle`);

    await HRStorage.updateJob(job.id, job.userId, {
      callingStatus: 'idle',
    });

    // optional: campaign bhi complete mark kar do
    if ((job as any).campaignId) {
      await db
        .update(campaigns)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(campaigns.id, (job as any).campaignId));
    }
  }
} catch (e: any) {
  console.error('[HR AutoCaller] Error checking job completion:', e.message);
}
  }

  private async scheduleRetryIfEligible(hrCall: any) {
    const job = await HRStorage.getJob(hrCall.jobId);
    if (!job) return;

    const maxRetries = job.callRetryAttempts || 0;
    const currentAttempt = hrCall.attemptNumber || 1;

    if (currentAttempt >= maxRetries + 1) {
      console.log(`[HR AutoCaller] Call ${hrCall.id} reached max retries (${maxRetries}), not retrying`);
      return;
    }

    const candidate = await HRStorage.getCandidate(hrCall.candidateId);
    if (!candidate || !candidate.phone) return;

    const delayMinutes = job.retryDelayMinutes || 30;
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    console.log(`[HR AutoCaller] Scheduling retry ${currentAttempt + 1}/${maxRetries + 1} for ${candidate.firstName} in ${delayMinutes} minutes (at ${retryAt.toISOString()})`);

    await HRStorage.updateCandidate(candidate.id, {
      callStatus: 'retry_scheduled',
    } as any);

    const sessions = await HRStorage.getInterviewsByCandidate(candidate.id);
    const session = sessions.find(s => s.jobId === job.id && s.status !== 'completed');
    if (session) {
      await HRStorage.updateInterviewSession(session.id, {
        status: 'scheduled',
        scheduledAt: retryAt,
      } as any);
    }

    setTimeout(async () => {
      try {
        console.log(`[HR AutoCaller] Executing retry ${currentAttempt + 1} for ${candidate.firstName} (${candidate.phone})`);
        const updatedCandidate = await HRStorage.getCandidate(candidate.id);
        if (updatedCandidate?.callStatus === 'completed') {
          console.log(`[HR AutoCaller] Candidate ${candidate.firstName} already completed, skipping retry`);
          return;
        }

        await HRStorage.updateCandidate(candidate.id, {
          callStatus: 'queued',
          callAttempts: currentAttempt + 1,
        } as any);

        await HRStorage.createHrCall({
          userId: job.userId,
          jobId: job.id,
          candidateId: candidate.id,
          provider: (job as any).telephonyProvider || 'twilio',
          direction: 'outbound',
          toNumber: normalizePhoneForCalling(candidate.phone),
          fromNumber: (job as any).callingPhoneNumberId || undefined,
          status: 'queued',
          attemptNumber: currentAttempt + 1,
        });

        if (session) {
          await HRStorage.updateInterviewSession(session.id, {
            status: 'scheduled',
          } as any);
        }

        await this.callSingleCandidate(job, updatedCandidate || candidate);
        console.log(`[HR AutoCaller] Retry ${currentAttempt + 1} initiated for ${candidate.firstName}`);
      } catch (e: any) {
        console.error(`[HR AutoCaller] Retry failed for ${candidate.firstName}: ${e.message}`);
      }
    }, delayMinutes * 60 * 1000);
  }

  private mapTwilioStatusToHr(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'busy': 'busy',
      'no-answer': 'no_answer',
      'canceled': 'cancelled',
      'failed': 'failed',
    };
    return statusMap[twilioStatus] || twilioStatus;
  }

  async handleConversationComplete(conversationId: string, data: {
    status?: string;
    transcript?: string;
    duration?: number;
    recordingUrl?: string;
    analysis?: any;
  }): Promise<boolean> {
    let hrCall = await HRStorage.getHrCallByConversationId(conversationId);

    if (!hrCall) {
      hrCall = await this.bridgeCampaignCallToHrCall(conversationId);
    }

    if (!hrCall) return false;

    console.log(`[HR AutoCaller] Processing completed conversation ${conversationId} for HR call ${hrCall.id}`);

    const callStatus = (data.status === 'completed' || data.status === 'done') ? 'completed' :
      (data.status === 'failed' || data.status === 'error' || data.status === 'no-answer') ? 'failed' :
        data.status || 'completed';

    const updateData: any = {
      status: callStatus,
      endedAt: new Date(),
    };
    if (data.duration) updateData.duration = data.duration;
    if (data.recordingUrl) updateData.recordingUrl = data.recordingUrl;
    if (data.transcript) updateData.transcript = data.transcript;

    await HRStorage.updateHrCall(hrCall.id, updateData);

    if ((callStatus === 'completed') && data.transcript) {
      try {
        await this.processCompletedCall(hrCall, data.transcript, data.duration, data.recordingUrl);
      } catch (analysisError: any) {
        console.error(`[HR AutoCaller] Post-call analysis error for HR call ${hrCall.id}:`, analysisError.message);
      }
    } else if (callStatus === 'failed') {
      const candidate = await HRStorage.getCandidate(hrCall.candidateId);
      if (candidate) {
        await HRStorage.updateCandidate(candidate.id, { callStatus: 'failed' } as any);
      }
    }

    return true;
  }

  private async bridgeCampaignCallToHrCallBySid(callSid: string): Promise<any | null> {
    try {
      let [callRecord] = await db
        .select()
        .from(calls)
        .where(eq(calls.twilioSid, callSid))
        .limit(1);

      if (!callRecord) {
        const [twilioOpenaiCall] = await db
          .select()
          .from(twilioOpenaiCalls)
          .where(eq(twilioOpenaiCalls.twilioCallSid, callSid))
          .limit(1);
        if (twilioOpenaiCall && twilioOpenaiCall.campaignId) {
          const [matchedCall] = await db
            .select()
            .from(calls)
            .where(and(
              eq(calls.campaignId, twilioOpenaiCall.campaignId),
              eq(calls.contactId, twilioOpenaiCall.contactId!),
            ))
            .limit(1);
          if (matchedCall) {
            callRecord = matchedCall;
            await db.update(calls).set({ twilioSid: callSid }).where(eq(calls.id, matchedCall.id));
          }
        }
      }

      if (!callRecord) return null;

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, callRecord.campaignId))
        .limit(1);

      if (!campaign || (campaign.type !== 'hr_screening' && campaign.type !== 'hr_scheduled_call')) {
        return null;
      }

      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, callRecord.contactId))
        .limit(1);

      if (!contact) return null;

      const customFields = contact.customFields as Record<string, any> | null;
      const hrCandidateId = customFields?.hrCandidateId;
      const hrJobId = customFields?.hrJobId;

      if (!hrCandidateId || !hrJobId) return null;

      const [hrCall] = await db
        .select()
        .from(hrCalls)
        .where(
          and(
            eq(hrCalls.candidateId, hrCandidateId),
            eq(hrCalls.jobId, hrJobId),
            inArray(hrCalls.status, ['queued', 'initiated', 'ringing', 'in_progress']),
          )
        )
        .orderBy(desc(hrCalls.createdAt))
        .limit(1);

      if (!hrCall) return null;

      await HRStorage.updateHrCall(hrCall.id, {
        callSid,
        status: 'in_progress',
        metadata: { campaignCallId: callRecord.id },
      });

      console.log(`[HR AutoCaller] Bridged Twilio campaign call ${callRecord.id} → HR call ${hrCall.id} (candidate: ${hrCandidateId})`);

      return { ...hrCall, callSid, metadata: { campaignCallId: callRecord.id } };
    } catch (e: any) {
      console.error(`[HR AutoCaller] Bridge SID lookup error for ${callSid}:`, e.message);
      return null;
    }
  }

  private async bridgeCampaignCallToHrCall(conversationId: string): Promise<any | null> {
    try {
      const [callRecord] = await db
        .select()
        .from(calls)
        .where(eq(calls.elevenLabsConversationId, conversationId))
        .limit(1);

      if (!callRecord) return null;

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, callRecord.campaignId))
        .limit(1);

      if (!campaign || (campaign.type !== 'hr_screening' && campaign.type !== 'hr_scheduled_call')) {
        return null;
      }

      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, callRecord.contactId))
        .limit(1);

      if (!contact) return null;

      const customFields = contact.customFields as Record<string, any> | null;
      const hrCandidateId = customFields?.hrCandidateId;
      const hrJobId = customFields?.hrJobId;

      if (!hrCandidateId || !hrJobId) return null;

      const [hrCall] = await db
        .select()
        .from(hrCalls)
        .where(
          and(
            eq(hrCalls.candidateId, hrCandidateId),
            eq(hrCalls.jobId, hrJobId),
            inArray(hrCalls.status, ['queued', 'initiated', 'ringing', 'in_progress']),
          )
        )
        .orderBy(desc(hrCalls.createdAt))
        .limit(1);

      if (!hrCall) return null;

      await HRStorage.updateHrCall(hrCall.id, {
        status: 'in_progress',
        callSid: callRecord.twilioSid || undefined,
        metadata: { conversationId, campaignCallId: callRecord.id },
      });

      console.log(`[HR AutoCaller] Bridged campaign call ${callRecord.id} → HR call ${hrCall.id} (candidate: ${hrCandidateId})`);

      return { ...hrCall, metadata: { conversationId, campaignCallId: callRecord.id } };
    } catch (e: any) {
      console.error(`[HR AutoCaller] Bridge lookup error for ${conversationId}:`, e.message);
      return null;
    }
  }

  // private async processCompletedCall(hrCall: any, transcript: string, duration?: number, recordingUrl?: string) {
  //   const job = await HRStorage.getJob(hrCall.jobId);
  //   const candidate = await HRStorage.getCandidate(hrCall.candidateId);
  //   if (!job || !candidate) return;

  //   const rescheduleResult = await detectRescheduleRequest(transcript);

  //   if (rescheduleResult.isReschedule) {
  //     console.log(`[HR AutoCaller] Reschedule detected for candidate ${candidate.firstName}: ${rescheduleResult.reason}`);

  //     let callbackTime: Date;
  //     if (rescheduleResult.preferredDateTime) {
  //       callbackTime = new Date(rescheduleResult.preferredDateTime);
  //       if (isNaN(callbackTime.getTime()) || callbackTime <= new Date()) {
  //         callbackTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  //         callbackTime.setHours(10, 0, 0, 0);
  //       }
  //     } else {
  //       callbackTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  //       callbackTime.setHours(10, 0, 0, 0);
  //     }

  //     await HRStorage.updateCandidate(candidate.id, {
  //       callStatus: 'pending',
  //       callTranscript: transcript,
  //       callSummary: `Reschedule requested: ${rescheduleResult.reason}`,
  //       lastCallAt: new Date(),
  //     } as any);

  //     await HRStorage.updateHrCall(hrCall.id, {
  //       summary: `Reschedule requested - callback at ${callbackTime.toISOString()}`,
  //       aiRecommendation: 'reschedule',
  //     });

  //     try {
  //       const existingSessions = await HRStorage.getInterviewsByCandidate(candidate.id);
  //       const existingScheduled = existingSessions.find(s => s.jobId === job.id && s.status === 'scheduled');
  //       if (existingScheduled) {
  //         await HRStorage.updateInterviewSession(existingScheduled.id, {
  //           scheduledAt: callbackTime,
  //           metadata: {
  //             rescheduleReason: rescheduleResult.reason,
  //             originalCallId: hrCall.id,
  //             autoScheduled: true,
  //             rescheduledAt: new Date().toISOString(),
  //           },
  //         } as any);
  //         console.log(`[HR AutoCaller] Updated existing scheduled callback for ${candidate.firstName} to ${callbackTime.toISOString()}`);
  //       } else {
  //         await HRStorage.createInterviewSession({
  //           userId: job.userId,
  //           jobId: job.id,
  //           candidateId: candidate.id,
  //           interviewType: 'phone',
  //           status: 'scheduled',
  //           scheduledAt: callbackTime,
  //           candidatePhone: candidate.phone || '',
  //           metadata: {
  //             rescheduleReason: rescheduleResult.reason,
  //             originalCallId: hrCall.id,
  //             autoScheduled: true,
  //           },
  //         } as any);
  //         console.log(`[HR AutoCaller] Auto-scheduled callback for ${candidate.firstName} at ${callbackTime.toISOString()}`);
  //       }
  //     } catch (intErr: any) {
  //       console.error(`[HR AutoCaller] Failed to auto-schedule callback:`, intErr.message);
  //     }

  //     return;
  //   }

  //   const analysis = await processPostCallAnalysis(hrCall.id, transcript, job, candidate);
  //   await HRStorage.updateHrCall(hrCall.id, {
  //     summary: analysis.summary,
  //     callScore: analysis.score,
  //     aiEvaluation: analysis.evaluation,
  //     aiRecommendation: analysis.recommendation,
  //   });

  //   const newStage = analysis.recommendation === 'reject' ? 'rejected' : 'interviewed';
  //   await HRStorage.updateCandidate(candidate.id, {
  //     callStatus: 'completed',
  //     callDuration: duration,
  //     callTranscript: transcript,
  //     callSummary: analysis.summary,
  //     callScore: analysis.score,
  //     callRecordingUrl: recordingUrl,
  //     lastCallAt: new Date(),
  //     pipelineStage: newStage,
  //     stageChangedAt: new Date(),
  //     interviewScore: analysis.score,
  //     interviewCompletedAt: new Date(),
  //   } as any);

  //   await HRStorage.createPipelineHistory({
  //     candidateId: candidate.id,
  //     jobId: job.id,
  //     userId: job.userId,
  //     fromStage: candidate.pipelineStage,
  //     toStage: newStage,
  //     reason: `AI phone screening: ${analysis.summary}`,
  //     changedBy: 'ai',
  //   });

  //   try {
  //     const existingSessions = await HRStorage.getInterviewsByCandidate(candidate.id);
  //     const alreadyHasSession = existingSessions.some(s => s.jobId === job.id && s.status === 'completed' && s.transcript === transcript);
  //     if (!alreadyHasSession) {
  //       await HRStorage.createInterviewSession({
  //         userId: job.userId,
  //         jobId: job.id,
  //         candidateId: candidate.id,
  //         interviewType: 'phone',
  //         status: 'completed',
  //         scheduledAt: hrCall.startedAt || new Date(),
  //         startedAt: hrCall.startedAt || new Date(),
  //         completedAt: new Date(),
  //         duration: duration || 0,
  //         candidatePhone: candidate.phone || '',
  //         transcript: transcript,
  //         recordingUrl: recordingUrl,
  //         overallScore: analysis.score,
  //         aiEvaluation: analysis.evaluation,
  //         aiRecommendation: analysis.recommendation,
  //         sentiment: analysis.recommendation === 'advance' ? 'positive' : analysis.recommendation === 'reject' ? 'negative' : 'neutral',
  //         confidenceLevel: analysis.score >= 75 ? 'high' : analysis.score >= 50 ? 'medium' : 'low',
  //       } as any);
  //       console.log(`[HR AutoCaller] Auto-created interview session for candidate ${candidate.firstName}`);
  //     }
  //   } catch (intErr: any) {
  //     console.error(`[HR AutoCaller] Failed to auto-create interview session:`, intErr.message);
  //   }

  //   await db.update(jobs).set({
  //     totalCallCompleted: sql`${jobs.totalCallCompleted} + 1`,
  //     totalInterviewed: sql`${jobs.totalInterviewed} + 1`,
  //   }).where(eq(jobs.id, job.id));

  //   console.log(`[HR AutoCaller] Post-call analysis complete for candidate ${candidate.firstName} - score: ${analysis.score}, recommendation: ${analysis.recommendation}`);
  // }



  private async processCompletedCall(hrCall: any, transcript: string, duration?: number, recordingUrl?: string) {

   const dbTranscript = await getTranscriptFromDB(hrCall.callSid);

  const finalTranscript =
    transcript && transcript.length > 50
      ? transcript
      : dbTranscript;

  console.log("🧾 FINAL TRANSCRIPT LENGTH:", finalTranscript?.length);

  if (!finalTranscript || finalTranscript.length < 50) {
    console.log("⏳ Transcript still not ready... retrying");

    setTimeout(() => {
      this.processCompletedCall(hrCall, transcript, duration, recordingUrl);
    }, 3000);

    return;
  }
    const job = await HRStorage.getJob(hrCall.jobId);
    const candidate = await HRStorage.getCandidate(hrCall.candidateId);
    if (!job || !candidate) return;

    const rescheduleResult = await detectRescheduleRequest(transcript);

    

    if (rescheduleResult.isReschedule) {
      // ─── Reschedule block — bilkul same rehne do ───────────
      console.log(`[HR AutoCaller] Reschedule detected for candidate ${candidate.firstName}: ${rescheduleResult.reason}`);

      let callbackTime: Date;
      if (rescheduleResult.preferredDateTime) {
        callbackTime = new Date(rescheduleResult.preferredDateTime);
        if (isNaN(callbackTime.getTime()) || callbackTime <= new Date()) {
          callbackTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          callbackTime.setHours(10, 0, 0, 0);
        }
      } else {
        callbackTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        callbackTime.setHours(10, 0, 0, 0);
      }

      await HRStorage.updateCandidate(candidate.id, {
        callStatus: 'pending',
        callTranscript: transcript,
        callSummary: `Reschedule requested: ${rescheduleResult.reason}`,
        lastCallAt: new Date(),
      } as any);

      await HRStorage.updateHrCall(hrCall.id, {
        summary: `Reschedule requested - callback at ${callbackTime.toISOString()}`,
        aiRecommendation: 'reschedule',
      });

      try {
        const existingSessions = await HRStorage.getInterviewsByCandidate(candidate.id);
        const existingScheduled = existingSessions.find(s => s.jobId === job.id && s.status === 'scheduled');
        if (existingScheduled) {
          await HRStorage.updateInterviewSession(existingScheduled.id, {
            scheduledAt: callbackTime,
            metadata: {
              rescheduleReason: rescheduleResult.reason,
              originalCallId: hrCall.id,
              autoScheduled: true,
              rescheduledAt: new Date().toISOString(),
            },
          } as any);
        } else {
          await HRStorage.createInterviewSession({
            userId: job.userId,
            jobId: job.id,
            candidateId: candidate.id,
            interviewType: 'phone',
            status: 'scheduled',
            scheduledAt: callbackTime,
            candidatePhone: candidate.phone || '',
            metadata: {
              rescheduleReason: rescheduleResult.reason,
              originalCallId: hrCall.id,
              autoScheduled: true,
            },
          } as any);
        }
      } catch (intErr: any) {
        console.error(`[HR AutoCaller] Failed to auto-schedule callback:`, intErr.message);
      }
      return;
    }

    // ─── Post-call analysis (same as before) ────────────────────
    const analysis = await processPostCallAnalysis(hrCall.id, finalTranscript, job, candidate);
    
    await HRStorage.updateHrCall(hrCall.id, {
      transcript: finalTranscript,
      summary: analysis.summary,
      callScore: analysis.score,
      aiEvaluation: analysis.evaluation,
      aiRecommendation: analysis.recommendation,
    });


    const [callRecord] = await db
  .select()
  .from(twilioOpenaiCalls)
  .where(eq(twilioOpenaiCalls.twilioCallSid, hrCall.callSid))
  .limit(1);

    // ─── NEW: Call metadata se variables + score nikaalo ────────
    // const callMeta = (hrCall.metadata as Record<string, any>) || {};
    const callMeta = (callRecord?.metadata as Record<string, any>) || {};
    const callVariables: Record<string, string> = callMeta.variables || {};
    const flowScore: number = callMeta.score || 0;
    const flowId: string | undefined = callMeta.flowId;

    console.log("🔥 FLOW SCORE:", flowScore);
console.log("🔥 VARIABLES:", callVariables);

    // Max score calculate karo (flow questions * 100)
    const maxScore = await this.calculateMaxScore(flowId);
    // const scorePercent = maxScore > 0 ? Math.round((flowScore / maxScore) * 100) : analysis.score;
    const scorePercent = analysis.score; 

    console.log("🔥 FINAL SCORE:", scorePercent);

    // ─── NEW: Hard filter check ──────────────────────────────────
    const hardFilterResult = this.checkHardFilters(callVariables, job);

    // ─── NEW: Shortlist status decide karo ──────────────────────
    let shortlistStatus: 'shortlisted' | 'on_hold' | 'rejected';
    let shortlistReason: string | undefined;

    if (!hardFilterResult.passed) {
      shortlistStatus = 'rejected';
      shortlistReason = hardFilterResult.reason;
    } else if (scorePercent >= 70 || analysis.recommendation === 'advance') {
      shortlistStatus = 'shortlisted';
    } else if (scorePercent >= 40 || analysis.recommendation === 'consider') {
      shortlistStatus = 'on_hold';
    } else {
      shortlistStatus = 'rejected';
      shortlistReason = `Score too low: ${scorePercent}%`;
    }

    // Pipeline stage mapping
    const stageMap: Record<string, string> = {
      shortlisted: 'shortlisted',
      on_hold: 'on_hold',
      rejected: 'rejected',
    };
    const newStage = stageMap[shortlistStatus];

    console.log(`[HR AutoCaller] Shortlist decision for ${candidate.firstName}: ${shortlistStatus} (score: ${scorePercent}%${shortlistReason ? ', reason: ' + shortlistReason : ''})`);

    // ─── Candidate update (shortlist info + existing fields) ─────
    await HRStorage.updateCandidate(candidate.id, {
      callStatus: 'completed',
      callDuration: duration,
      callTranscript: finalTranscript,
      callSummary: analysis.summary,
      callScore: analysis.score,
      callRecordingUrl: recordingUrl,
      lastCallAt: new Date(),
      pipelineStage: newStage,
      stageChangedAt: new Date(),
      interviewScore: analysis.score,
      interviewCompletedAt: new Date(),
      // NEW fields — schema mein add karne honge
      shortlistStatus,
      shortlistScore: scorePercent,
      shortlistReason: shortlistReason || null,
      shortlistVariables: callVariables,
      shortlistEvaluatedAt: new Date(),
    } as any);

    // ─── Pipeline history (same + shortlist info) ────────────────
    await HRStorage.createPipelineHistory({
      candidateId: candidate.id,
      jobId: job.id,
      userId: job.userId,
      fromStage: candidate.pipelineStage,
      toStage: newStage,
      reason: shortlistReason
        ? `Auto-rejected: ${shortlistReason}`
        : `AI screening: ${analysis.summary} | Score: ${scorePercent}%`,
      changedBy: 'ai',
    });

    // ─── Interview session (same as before) ─────────────────────
    try {
      const existingSessions = await HRStorage.getInterviewsByCandidate(candidate.id);
      const alreadyHasSession = existingSessions.some(
        s => s.jobId === job.id && s.status === 'completed' && s.transcript === transcript
      );
      if (!alreadyHasSession) {
        await HRStorage.createInterviewSession({
          userId: job.userId,
          jobId: job.id,
          candidateId: candidate.id,
          interviewType: 'phone',
          status: 'completed',
          scheduledAt: hrCall.startedAt || new Date(),
          startedAt: hrCall.startedAt || new Date(),
          completedAt: new Date(),
          duration: duration || 0,
          candidatePhone: candidate.phone || '',
          transcript,
          recordingUrl,
          overallScore: analysis.score,
          aiEvaluation: analysis.evaluation,
          aiRecommendation: analysis.recommendation,
          sentiment: shortlistStatus === 'shortlisted' ? 'positive' : shortlistStatus === 'rejected' ? 'negative' : 'neutral',
          confidenceLevel: scorePercent >= 75 ? 'high' : scorePercent >= 50 ? 'medium' : 'low',
          // NEW
          shortlistStatus,
          shortlistScore: scorePercent,
        } as any);
      }
    } catch (intErr: any) {
      console.error(`[HR AutoCaller] Failed to auto-create interview session:`, intErr.message);
    }

    await db.update(jobs).set({
      totalCallCompleted: sql`${jobs.totalCallCompleted} + 1`,
      totalInterviewed: sql`${jobs.totalInterviewed} + 1`,
    }).where(eq(jobs.id, job.id));

    console.log(`[HR AutoCaller] Complete → ${candidate.firstName} | ${shortlistStatus} | score: ${scorePercent}%`);
  }

  // ─── Helper: Hard filter check ────────────────────────────────
  private checkHardFilters(
    variables: Record<string, string>,
    job: any
  ): { passed: boolean; reason?: string } {
    
    // Job mein hard filter config hoti hai to use karo
    const config = (job.metadata?.hardFilters || {}) as Record<string, any>;

    if (config.maxNoticePeriodDays) {
      const notice = parseInt(variables.noticePeriod || variables.notice_period || '0');
      if (notice > config.maxNoticePeriodDays) {
        return { passed: false, reason: `Notice period ${notice}d exceeds limit ${config.maxNoticePeriodDays}d` };
      }
    }

    if (config.minExperienceYears) {
      const exp = parseFloat(variables.experience || variables.yearsOfExperience || '0');
      if (exp < config.minExperienceYears) {
        return { passed: false, reason: `Experience ${exp}yr below minimum ${config.minExperienceYears}yr` };
      }
    }

    if (config.maxExpectedSalaryLPA) {
      const salary = parseFloat((variables.expectedSalary || '0').replace(/[^0-9.]/g, ''));
      if (salary > config.maxExpectedSalaryLPA) {
        return { passed: false, reason: `Expected salary ${salary} LPA above budget ${config.maxExpectedSalaryLPA} LPA` };
      }
    }

    return { passed: true };
  }

  // ─── Helper: Max score from flow ──────────────────────────────
  private async calculateMaxScore(flowId?: string): Promise<number> {
    if (!flowId) return 100;
    try {
      const [flow] = await db.select().from(flows).where(eq(flows.id, flowId)).limit(1);
      const states = (flow?.compiledStates as any[]) || [];
      const questionCount = states.length;
      // const questionCount = states.filter(s => s.type === 'question').length;
      return questionCount > 0 ? questionCount * 100 : 100;
    } catch {
      return 100;
    }
  }

  async processScheduledInterviews() {
    try {
      const now = new Date();
      const allInterviews = await db
        .select()
        .from(interviewSessionsTable)
        .where(
          and(
            eq(interviewSessionsTable.status, 'scheduled'),
            eq(interviewSessionsTable.interviewType, 'phone'),
          )
        );

      const dueInterviews = allInterviews.filter(interview => {
        if (!interview.scheduledAt) return false;
        const scheduledTime = new Date(interview.scheduledAt);
        const timeDiff = now.getTime() - scheduledTime.getTime();
        return timeDiff >= 0 && timeDiff < 5 * 60 * 1000;
      });

      if (dueInterviews.length === 0) return;

      console.log(`[HR AutoCaller] Found ${dueInterviews.length} scheduled interviews due for calling`);

      for (const interview of dueInterviews) {
        try {
          const job = await HRStorage.getJob(interview.jobId);
          const candidate = await HRStorage.getCandidate(interview.candidateId);

          if (!job || !candidate) {
            console.log(`[HR AutoCaller] Skipping scheduled interview ${interview.id} - job or candidate not found`);
            continue;
          }

          if (!candidate.phone) {
            console.log(`[HR AutoCaller] Skipping scheduled interview ${interview.id} - no phone number`);
            await HRStorage.updateInterviewSession(interview.id, { status: 'failed' } as any);
            continue;
          }

          if (!job.agentId) {
            console.log(`[HR AutoCaller] Skipping scheduled interview ${interview.id} - no agent configured for job`);
            continue;
          }

          await HRStorage.updateInterviewSession(interview.id, {
            status: 'in_progress',
            startedAt: new Date(),
          } as any);

          await HRStorage.updateCandidate(candidate.id, {
            callStatus: 'queued',
            callAttempts: (candidate.callAttempts || 0) + 1,
          } as any);

          await this.startSingleCandidateCall(job, candidate);

          console.log(`[HR AutoCaller] Initiated scheduled call for ${candidate.firstName} ${candidate.lastName || ''} - interview ${interview.id}`);
        } catch (err: any) {
          console.error(`[HR AutoCaller] Error processing scheduled interview ${interview.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[HR AutoCaller] Error processing scheduled interviews:', error);
    }
  }

  private async startSingleCandidateCall(job: Job, candidate: Candidate) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, job.agentId!)).limit(1);
    if (!agent) throw new Error('Agent not found');

    const provider = agent.telephonyProvider || 'twilio';
    let phoneNumberId: string | null = job.callingPhoneNumberId || null;
    let plivoPhoneNumberId: string | null = null;
    let sipPhoneNumberId: string | null = null;

    if (provider === 'plivo') {
      plivoPhoneNumberId = job.callingPhoneNumberId || null;
      phoneNumberId = null;
    } else if (provider === 'elevenlabs-sip' || provider === 'openai-sip') {
      sipPhoneNumberId = job.callingPhoneNumberId || null;
      phoneNumberId = null;
    }

    const [campaign] = await db.insert(campaigns).values({
      userId: job.userId,
      agentId: job.agentId!,
      phoneNumberId,
      plivoPhoneNumberId,
      sipPhoneNumberId,
      name: `HR Scheduled Call: ${candidate.firstName} ${candidate.lastName || ''} - ${job.title}`,
      type: 'hr_scheduled_call',
      goal: `Scheduled phone screening callback for ${candidate.firstName}`,
      script: job.callScript || undefined,
      flowId: job.flowId || undefined,
      status: 'pending',
      totalContacts: 1,
      maxConcurrency: 1,
    }).returning();

    await db.insert(contacts).values({
      campaignId: campaign.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName || undefined,
      phone: normalizePhoneForCalling(candidate.phone!),
      email: candidate.email || undefined,
      customFields: {
        hrCandidateId: candidate.id,
        hrJobId: job.id,
      },
      status: 'pending',
    });

    await HRStorage.createHrCall({
      userId: job.userId,
      jobId: job.id,
      candidateId: candidate.id,
      provider: provider,
      direction: 'outbound',
      toNumber: normalizePhoneForCalling(candidate.phone!),
      fromNumber: job.callingPhoneNumberId || undefined,
      status: 'queued',
      attemptNumber: (candidate.callAttempts || 0) + 1,
    });

    const existingSessions = await HRStorage.getInterviewsByCandidate(candidate.id);
    const hasSessionForJob = existingSessions.some(s => s.jobId === job.id);
    if (!hasSessionForJob) {
      await HRStorage.createInterviewSession({
        userId: job.userId,
        jobId: job.id,
        candidateId: candidate.id,
        interviewType: 'phone',
        status: 'scheduled',
        scheduledAt: new Date(),
      });
    }

    await this.campaignExecutor.executeCampaign(campaign.id);
    console.log(`[HR AutoCaller] Single candidate call campaign ${campaign.id} started via campaign executor (engine: ${provider})`);
  }
}