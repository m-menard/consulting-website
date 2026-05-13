'use strict';
import { Router, Request, Response } from 'express';
import { HRStorage } from '../storage/hr-storage';
import { storage } from "../storage";
import { createJobSchema, insertCandidateSchema, insertInterviewSessionSchema, insertJobApplicationSchema, CANDIDATE_PIPELINE_STAGES } from '@shared/schema';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import OpenAI from 'openai';
import { db } from '../db';
import { users, globalSettings } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { generateCallScript, HRAutoCallerService, processPostCallAnalysis } from '../services/hr-auto-caller';
import { extractTextFromCV, extractPhoneFromText } from '../utils/cv-text-extractor';
import { emailService } from '../services/email-service';
import { candidates as candidatesTable, jobs as jobsTable, openaiCredentials } from '@shared/schema';
import { candidates, cvUploads } from "@shared/schema";



interface AuthRequest extends Request {
  userId?: string;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}


function extractEmailFromText(text: string): string | null {
  if (!text) return null;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i;
  const match = text.match(emailRegex);

  return match ? match[0] : null;
}

const router = Router();

setTimeout(() => {
  const caller = HRAutoCallerService.getInstance();
  caller.startPolling();
  console.log('[HR Routes] Auto-started HR AutoCaller polling for scheduled interviews');
}, 5000);

const requireAuth = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

async function verifyCandidateOwnership(candidateId: string, userId: string) {
  const candidate = await HRStorage.getCandidate(candidateId);
  if (!candidate || candidate.userId !== userId) return null;
  return candidate;
}

async function getOpenAIKeyForScreening(): Promise<string | null> {
  let credential: string | undefined | null = process.env.OPENAI_API_KEY;

  if (!credential) {
    // const [credential] = await db
    //   .select()
    //   .from(openaiCredentials)
    //   .where(eq(openaiCredentials.isActive, true))
    //   .limit(1);
    // if (credential?.apiKey) key = credential.apiKey;
    try {
      const [credentialRow] = await db
        .select({ value: globalSettings.value })
        .from(globalSettings)
        .where(eq(globalSettings.key, "openai_api_key"))
        .limit(1);

      if (credentialRow?.value) {
        credential = credentialRow.value as string;
      }
    } catch (e) {
      console.error('[HR AutoScreen] Error fetching OpenAI credential from DB:', e);
    }
  }

  return credential ?? null;
}


function extractNameFromCVText(cvText: string) {
  const lines = cvText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // First 5 meaningful lines check karo
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Ignore lines with email/phone
    if (
      line.includes('@') ||
      /\d{10}/.test(line) ||
      line.toLowerCase().includes('resume') ||
      line.length > 50
    ) {
      continue;
    }

    // If line contains 2-3 words → assume name
    const words = line.split(' ');
    if (words.length >= 2 && words.length <= 4) {
      return {
        firstName: words[0],
        lastName: words.slice(1).join(' ')
      };
    }
  }

  return null;
}

async function autoScreenCandidates(candidateIds: string[], userId: string) {
  const openaiApiKey = await getOpenAIKeyForScreening();
  if (!openaiApiKey) {
    console.error('[HR AutoScreen] No OpenAI API key available - skipping auto-screening');
    return;
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  for (const candidateId of candidateIds) {
    try {
      const candidate = await HRStorage.getCandidate(candidateId);
      if (!candidate) continue;
      if (candidate.aiScore != null) continue;

      const job = await HRStorage.getJob(candidate.jobId);

      const candidateProfile = [
        `Name: ${candidate.firstName} ${candidate.lastName || ''}`,
        candidate.currentDesignation ? `Current Role: ${candidate.currentDesignation}` : null,
        candidate.currentCompany ? `Current Company: ${candidate.currentCompany}` : null,
        candidate.totalExperienceYears ? `Total Experience: ${candidate.totalExperienceYears} years` : null,
        candidate.currentLocation ? `Location: ${candidate.currentLocation}` : null,
        candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
        candidate.education ? `Education: ${JSON.stringify(candidate.education)}` : null,
        candidate.workExperience ? `Work Experience: ${JSON.stringify(candidate.workExperience)}` : null,
        candidate.certifications?.length ? `Certifications: ${candidate.certifications.join(', ')}` : null,
        candidate.languages?.length ? `Languages: ${candidate.languages.join(', ')}` : null,
        candidate.expectedSalary ? `Expected Salary: ${candidate.expectedSalary}` : null,
        candidate.noticePeriod ? `Notice Period: ${candidate.noticePeriod}` : null,
        candidate.cvText ? `Resume/CV Content:\n${candidate.cvText.substring(0, 6000)}` : null,
      ].filter(Boolean).join('\n');

      const jobDetails = [];
      if (job) {
        jobDetails.push(`Job Title: ${job.title}`);
        if (job.department) jobDetails.push(`Department: ${job.department}`);
        if (job.description) jobDetails.push(`Description: ${job.description.substring(0, 1500)}`);
        if ((job as any).requiredSkills?.length) jobDetails.push(`Required Skills: ${(job as any).requiredSkills.join(', ')}`);
        if ((job as any).preferredSkills?.length) jobDetails.push(`Preferred Skills: ${(job as any).preferredSkills.join(', ')}`);
        if ((job as any).minExperienceYears) jobDetails.push(`Minimum Experience: ${(job as any).minExperienceYears} years`);
        if ((job as any).maxExperienceYears) jobDetails.push(`Maximum Experience: ${(job as any).maxExperienceYears} years`);
        if ((job as any).educationLevel) jobDetails.push(`Education Level: ${(job as any).educationLevel}`);
        if ((job as any).salaryMin || (job as any).salaryMax) jobDetails.push(`Salary Range: ${(job as any).salaryMin || '?'} - ${(job as any).salaryMax || '?'} ${(job as any).salaryCurrency || ''}`);
      }
      const jobContext = jobDetails.length > 0 ? jobDetails.join('\n') : '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert HR analyst. Analyze the candidate's CV/resume content and do TWO things:
1. Extract the candidate's real profile data from the CV text (name, contact info, experience, education, skills, etc.)
2. Provide a structured hiring assessment with scores.

IMPORTANT: Extract the candidate's REAL first name and last name from the CV content itself, NOT from any filename-based name. The name provided in the profile may be derived from the filename and could be incorrect.

Respond ONLY with valid JSON in this format:
{
  "firstName": "Real first name from CV content",
  "lastName": "Real last name from CV content",
  "email": "email if found in CV, or null",
  "introduction": "Professional summary extracted or generated from CV",
  "currentCompany": "Current/most recent company or null",
  "currentDesignation": "Current/most recent job title or null",
  "totalExperienceYears": <number of years of experience or null>,
  "currentLocation": "Location/city if found or null",
  "skills": ["skill1", "skill2", ...],
  "education": [{"degree": "...", "institution": "...", "field": "...", "startYear": "...", "endYear": "...", "grade": "..."}],
  "workExperience": [{"company": "...", "role": "...", "startDate": "...", "endDate": "...", "duration": "...", "description": "..."}],
  "certifications": ["cert1", "cert2", ...],
  "languages": ["language1", "language2", ...],
  "linkedinUrl": "LinkedIn URL if found or null",
  "expectedSalary": "Expected salary if mentioned or null",
  "currentSalary": "Current salary if mentioned or null",
  "noticePeriod": "Notice period if mentioned or null",
  "aiSummary": "3-4 sentence professional summary of the candidate's suitability for the role",
  "aiScore": <number 0-100>,
  "aiStrengths": ["strength 1", "strength 2", "strength 3"],
  "aiWeaknesses": ["weakness 1", "weakness 2"],
  "aiRecommendation": "hire" | "consider" | "reject",
  "aiSkillsScore": <number 0-100>,
  "aiExperienceScore": <number 0-100>,
  "aiEducationScore": <number 0-100>
}

For arrays, return empty arrays [] if no data found. For optional string fields, return null if not found.`
          },
          {
            role: 'user',
            content: `${jobContext ? `TARGET JOB:\n${jobContext}\n\n` : ''}CANDIDATE PROFILE:\n${candidateProfile}`
          }
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        console.error(`[HR AutoScreen] Empty AI response for candidate ${candidateId}`);
        continue;
      }

      const aiResult = JSON.parse(content);

      const aiScore = aiResult.aiScore || 0;

      // ✅ job based thresholds (fallback bhi diya hai)
      const aiThreshold = job?.aiScreeningThreshold ?? 50;
      const shortlistThreshold = job?.shortlistingThreshold ?? 70;
      const interviewScheduledThreshold = job?.interviewScheduledThreshold ?? 85;


      let newStage = candidate.pipelineStage;

      if (candidate.pipelineStage === 'uploaded') {

  // 🔒 If AI score missing → stay in uploaded
  if (aiScore == null) {
    newStage = 'uploaded';
  }

  // ❌ Hard reject
  else if (
    aiScore < aiThreshold ||
    aiResult.aiRecommendation === 'reject'
  ) {
    newStage = 'rejected';
  }

  // 🔥 Eligible for AI call
  else {
    newStage = 'ai_screened';
  }
}

      const updateData: any = {
        aiSummary: aiResult.aiSummary,
        aiScore: aiResult.aiScore,
        aiStrengths: aiResult.aiStrengths,
        aiWeaknesses: aiResult.aiWeaknesses,
        aiRecommendation: aiResult.aiRecommendation,
        aiSkillsScore: aiResult.aiSkillsScore,
        aiExperienceScore: aiResult.aiExperienceScore,
        aiEducationScore: aiResult.aiEducationScore,
        screenedAt: new Date(),
        pipelineStage: newStage
        // pipelineStage: candidate.pipelineStage === 'uploaded' ? 'ai_screened' : candidate.pipelineStage,
      };

      if (aiResult.firstName) updateData.firstName = aiResult.firstName;
      if (aiResult.lastName) updateData.lastName = aiResult.lastName;
      if (aiResult.email && aiResult.email !== null) updateData.email = aiResult.email;
      if (aiResult.introduction) updateData.introduction = aiResult.introduction;
      if (aiResult.currentCompany) updateData.currentCompany = aiResult.currentCompany;
      if (aiResult.currentDesignation) updateData.currentDesignation = aiResult.currentDesignation;
      if (aiResult.totalExperienceYears != null) updateData.totalExperienceYears = aiResult.totalExperienceYears;
      if (aiResult.currentLocation) updateData.currentLocation = aiResult.currentLocation;
      if (Array.isArray(aiResult.skills) && aiResult.skills.length > 0) updateData.skills = aiResult.skills;
      if (Array.isArray(aiResult.education) && aiResult.education.length > 0) updateData.education = aiResult.education;
      if (Array.isArray(aiResult.workExperience) && aiResult.workExperience.length > 0) updateData.workExperience = aiResult.workExperience;
      if (Array.isArray(aiResult.certifications) && aiResult.certifications.length > 0) updateData.certifications = aiResult.certifications;
      if (Array.isArray(aiResult.languages) && aiResult.languages.length > 0) updateData.languages = aiResult.languages;
      if (aiResult.linkedinUrl) updateData.linkedinUrl = aiResult.linkedinUrl;
      if (aiResult.expectedSalary) updateData.expectedSalary = aiResult.expectedSalary;
      if (aiResult.currentSalary) updateData.currentSalary = aiResult.currentSalary;
      if (aiResult.noticePeriod) updateData.noticePeriod = aiResult.noticePeriod;

      await HRStorage.updateCandidate(candidate.id, updateData);

      if (candidate.pipelineStage === 'uploaded') {
        await HRStorage.createPipelineHistory({
          candidateId: candidate.id,
          jobId: candidate.jobId,
          userId,
          fromStage: 'uploaded',
          // toStage: 'ai_screened',
          toStage: newStage,
          reason: 'AI screening completed (auto)',
          changedBy: 'ai',
        });

        // if (aiResult.aiScore && job?.autoCallEnabled && job.callingStatus === 'running' && aiResult.aiScore >= (job.minAiScoreForCall || 60)) {
        //   if (candidate.phone) {
        //     await HRStorage.updateCandidate(candidate.id, { callStatus: 'pending' } as any);
        //     console.log(`[HR AutoScreen] Candidate ${candidate.id} auto-queued for calling (score: ${aiResult.aiScore})`);
        //   }
        // }
      }

      console.log(`[HR AutoScreen] Screened candidate ${candidate.id} (${candidate.firstName}) - score: ${aiResult.aiScore}`);
    } catch (error: any) {
      console.error(`[HR AutoScreen] Error screening candidate ${candidateId}:`, error.message || error);
      try {
        await HRStorage.updateCandidate(candidateId, {
          aiSummary: `Screening error: ${error.message || 'Unknown error'}`,
        } as any);
      } catch (e) { }
    }
  }
}

// ============================================================
// HR Dashboard
// ============================================================

router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await HRStorage.getHRDashboardStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    console.error('[HR] Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ============================================================
// Jobs CRUD
// ============================================================

router.get('/jobs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await HRStorage.getJobsWithStats(req.userId!);
    res.json(jobs);
  } catch (error: any) {
    console.error('[HR] Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.id);
    if (!job || job.userId !== req.userId) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const stats = await HRStorage.getJobStats(req.params.id);
    res.json({ ...job, stats });
  } catch (error: any) {
    console.error('[HR] Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/jobs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createJobSchema.parse(req.body);

    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = await storage.getPlanByName(user.planType || 'free');
    if (!plan) {
      return res.status(500).json({ error: "Plan configuration not found" });
    }
    const jobCount = await HRStorage.getJobsByUser(req.userId!);
    if (jobCount.length >= plan.maxCampaigns) {
      return res.status(403).json({
        error: `Job limit reached for your plan (${plan.maxCampaigns} active jobs). Please upgrade your plan to add more jobs.`
      });
    }

    const job = await HRStorage.createJob({ ...data, userId: req.userId! });
    res.json(job);
  } catch (error: any) {
    console.error('[HR] Error creating job:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.patch('/jobs/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.updateJob(req.params.id, req.userId!, req.body);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    console.error('[HR] Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/jobs/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await HRStorage.deleteJob(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('[HR] Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

router.post('/jobs/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.updateJob(req.params.id, req.userId!, {
      status: 'open',
      publishedAt: new Date(),
    } as any);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    console.error('[HR] Error publishing job:', error);
    res.status(500).json({ error: 'Failed to publish job' });
  }
});

router.post('/jobs/:id/close', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.updateJob(req.params.id, req.userId!, {
      status: 'closed',
      closedAt: new Date(),
    } as any);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    console.error('[HR] Error closing job:', error);
    res.status(500).json({ error: 'Failed to close job' });
  }
});

// ============================================================
// Candidates CRUD
// ============================================================

router.get('/candidates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, search, aiScoreMin, aiScoreMax, experienceMin, experienceMax, source, location } = req.query;
    const jobs = await HRStorage.getJobsByUser(req.userId!);
    const jobsById = new Map(jobs.map((job) => [job.id, job.title]));
    const result = await HRStorage.getCandidatesByUser(req.userId!, {
      jobId: typeof jobId === 'string' && jobId !== 'all' ? jobId : undefined,
      search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
      aiScoreMin: typeof aiScoreMin === 'string' && aiScoreMin !== '' ? Number(aiScoreMin) : undefined,
      aiScoreMax: typeof aiScoreMax === 'string' && aiScoreMax !== '' ? Number(aiScoreMax) : undefined,
      experienceMin: typeof experienceMin === 'string' && experienceMin !== '' ? Number(experienceMin) : undefined,
      experienceMax: typeof experienceMax === 'string' && experienceMax !== '' ? Number(experienceMax) : undefined,
      source: typeof source === 'string' && source !== 'all' ? source : undefined,
      location: typeof location === 'string' && location.trim() ? location.trim() : undefined,
    });

    const candidatesWithJobTitle = result.map((candidate: any) => ({
      ...candidate,
      jobTitle: jobsById.get(candidate.jobId),
    }));

    const candidatesWithCrossJob = await Promise.all(
      candidatesWithJobTitle.map(async (c: any) => {
        if (c.phone) {
          const otherJobs = await HRStorage.findCandidatePhoneInOtherJobs(c.phone, c.jobId, req.userId!);
          return { ...c, appliedInOtherJobs: otherJobs.length > 0, otherJobCount: otherJobs.length };
        }
        return { ...c, appliedInOtherJobs: false, otherJobCount: 0 };
      })
    );
    res.json(candidatesWithCrossJob);
  } catch (error: any) {
    console.error('[HR] Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

router.post('/candidates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, firstName, lastName, email, phone, linkedinUrl,
      introduction, dateOfBirth, gender, currentLocation, currentCompany,
      currentDesignation, totalExperienceYears, expectedSalary, currentSalary,
      noticePeriod, skills, hobbies, education, workExperience,
      certifications, languages, tags, notes } = req.body;
    if (!jobId || !firstName || !email) {
      return res.status(400).json({ error: 'jobId, firstName, and email are required' });
    }


    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = await storage.getPlanByName(user.planType || 'free');
    if (!plan) {
      return res.status(500).json({ error: "Plan configuration not found" });
    }

    const candidateCount = await HRStorage.getCandidatesCount(req.userId!);

    // This blocks the request if the current count is already at or above the limit
    if (candidateCount >= plan.maxContactsPerCampaign) {
      return res.status(403).json({
        error: `Candidate limit reached for your plan (${plan.maxContactsPerCampaign} candidates). Please upgrade your plan to add more candidates.`
      });
    }





    const candidate = await HRStorage.createOrMergeCandidate({
      jobId,
      userId: req.userId!,
      firstName,
      lastName,
      email,
      phone: phone ? normalizePhone(phone) : phone,
      linkedinUrl,
      introduction,
      dateOfBirth,
      gender,
      currentLocation,
      currentCompany,
      currentDesignation,
      totalExperienceYears: totalExperienceYears !== undefined && totalExperienceYears !== null && totalExperienceYears !== '' ? parseInt(totalExperienceYears) : undefined,
      expectedSalary,
      currentSalary,
      noticePeriod,
      skills: skills || undefined,
      hobbies: hobbies || undefined,
      education: education || undefined,
      workExperience: workExperience || undefined,
      certifications: certifications || undefined,
      languages: languages || undefined,
      tags: tags || undefined,
      notes,
      source: 'manual',
      pipelineStage: 'uploaded',
    });
    res.json(candidate);
  } catch (error: any) {
    console.error('[HR] Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

router.get('/jobs/:jobId/candidates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.jobId);
    if (!job || job.userId !== req.userId) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const { stage } = req.query;
    const candidates = await HRStorage.getCandidatesByJob(req.params.jobId, stage as string | undefined);
    res.json(candidates);
  } catch (error: any) {
    console.error('[HR] Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

router.get('/candidates/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.id, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const pipelineHistory = await HRStorage.getCandidatePipelineHistory(req.params.id);
    res.json({ ...candidate, pipelineHistory });
  } catch (error: any) {
    console.error('[HR] Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

router.get('/candidates/:id/cross-job', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.id, req.userId!);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (!candidate.phone) return res.json({ otherJobs: [] });
    const otherJobs = await HRStorage.findCandidatePhoneInOtherJobs(candidate.phone, candidate.jobId, req.userId!);
    res.json({ otherJobs });
  } catch (error: any) {
    console.error('[HR] Error checking cross-job:', error);
    res.status(500).json({ error: 'Failed to check cross-job applications' });
  }
});

router.post('/jobs/:jobId/candidates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = insertCandidateSchema.parse({
      ...req.body,
      userId: req.userId!,
      jobId: req.params.jobId,
      source: 'manual',
    });
    if (data.phone) {
      data.phone = normalizePhone(data.phone);
    }
    const { duplicate, reason } = await HRStorage.findDuplicateCandidateInJob(req.params.jobId, data.phone, data.firstName, data.lastName);
    if (duplicate) {
      return res.status(409).json({ error: reason });
    }
    const candidate = await HRStorage.createCandidate(data);
    res.json(candidate);
  } catch (error: any) {
    console.error('[HR] Error creating candidate:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

router.patch('/candidates/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await verifyCandidateOwnership(req.params.id, req.userId!);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = await HRStorage.updateCandidate(req.params.id, req.body);
    res.json(candidate);
  } catch (error: any) {
    console.error('[HR] Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

router.patch('/candidates/:id/stage', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stage, notes } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'Stage is required' });
    }
    const existing = await verifyCandidateOwnership(req.params.id, req.userId!);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const fromStage = existing.pipelineStage;
    const candidate = await HRStorage.updateCandidateStage(req.params.id, req.userId!, stage, notes);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    // i want to create scechine in these 
    // 📅 Create interview automatically when stage becomes "interview_scheduled"
    if (stage === "interview_scheduled") {
      try {
        // ✅ Schedule exactly 24 hours from now
        const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const interview = await HRStorage.createInterviewSession({
          candidateId: candidate.id,
          jobId: candidate.jobId,
          userId: req.userId!, // important if your schema requires it
          scheduledAt,
          status: 'scheduled',
          interviewType: 'phone', // optional default
          candidatePhone: candidate.phone || undefined,
          metadata: {
            notes: notes || 'Auto-scheduled interview after stage update'
          }
        });

        console.log('[HR] Auto interview scheduled:', interview.id);
      } catch (err) {
        console.error('[HR] Failed to auto-create interview:', err);
      }
    }


    if (candidate.email && fromStage !== stage) {
      const stageLabels: Record<string, string> = {
        uploaded: 'Uploaded', ai_screened: 'AI Screened', shortlisted: 'Shortlisted',
        interview_scheduled: 'Interview Scheduled', interviewed: 'Interviewed', hired: 'Hired', rejected: 'Rejected',
      };

      const job = await HRStorage.getJob(candidate.jobId);
      const jobTitle = job?.title || 'the position';
      const candidateName = `${candidate.firstName} ${candidate.lastName || ''}`.trim();
      const newStageLabel = stageLabels[stage] || stage;

      const subject = `Application Update - ${jobTitle}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Application Status Update</h2>
          <p>Dear ${candidateName},</p>
          <p>We wanted to let you know that your application for <strong>${jobTitle}</strong> has been updated.</p>
          <p>Your application status is now: <strong style="color: #4f46e5;">${newStageLabel}</strong></p>
          ${stage === 'interview_scheduled' ? '<p>Our team will reach out to you shortly with interview details.</p>' : ''}
          ${stage === 'hired' ? '<p>Congratulations! We look forward to having you on our team.</p>' : ''}
          ${stage === 'rejected' ? '<p>Thank you for your interest. We encourage you to apply for future openings.</p>' : ''}
          <p>Best regards,<br/>The Hiring Team</p>
        </div>
      `;

      emailService.sendEmail(candidate.email, subject, html).catch((err: any) => {
        console.error('[HR] Failed to send stage notification email:', err);
      });
    }

    res.json(candidate);
  } catch (error: any) {
    console.error('[HR] Error updating candidate stage:', error);
    res.status(500).json({ error: 'Failed to update candidate stage' });
  }
});

// router.delete('/candidates/:id', requireAuth, async (req: AuthRequest, res: Response) => {
//   try {
//     const existing = await verifyCandidateOwnership(req.params.id, req.userId!);
//     if (!existing) {
//       return res.status(404).json({ error: 'Candidate not found' });
//     }
//     const deleted = await HRStorage.deleteCandidate(req.params.id);
//     if (!deleted) {
//       return res.status(404).json({ error: 'Candidate not found' });
//     }
//     res.json({ success: true });
//   } catch (error: any) {
//     console.error('[HR] Error deleting candidate:', error);
//     res.status(500).json({ error: 'Failed to delete candidate' });
//   }
// });






router.delete('/candidates/:id', requireAuth, async (req, res) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.id, req.userId!);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // ✅ 1. FILE DELETE (WAIT FOR COMPLETION)
    if (candidate.cvFilePath) {
      const filePath = path.isAbsolute(candidate.cvFilePath)
        ? candidate.cvFilePath
        : path.join(process.cwd(), candidate.cvFilePath);

      console.log("📂 PATH:", filePath);

      if (fs.existsSync(filePath)) {
        await new Promise((resolve) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("❌ DELETE ERROR:", err.message);
            } else {
              console.log("✅ FILE DELETED");
            }
            resolve(true); // wait complete
          });
        });
      }
    }

    // ✅ 2. DELETE candidate FIRST
    await db.delete(candidates).where(eq(candidates.id, req.params.id));

    // ✅ 3. CHECK remaining AFTER delete
    if (candidate.cvUploadId) {
      const remaining = await db.query.candidates.findMany({
        where: eq(candidates.cvUploadId, candidate.cvUploadId)
      });

      console.log("🧠 Remaining:", remaining.length);

      if (remaining.length === 0) {
        await db.delete(cvUploads)
          .where(eq(cvUploads.id, candidate.cvUploadId));

        console.log("🧹 cvUpload deleted");
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[DELETE ERROR]', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});


router.post('/candidates/bulk-stage', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { candidateIds, stage, notes } = req.body;
    if (!Array.isArray(candidateIds) || !stage) {
      return res.status(400).json({ error: 'candidateIds (array) and stage are required' });
    }

    const results = [];
    for (const candidateId of candidateIds) {
      const candidate = await HRStorage.updateCandidateStage(candidateId, req.userId!, stage, notes);
      if (candidate) {
        results.push(candidate);
      }
    }
    res.json({ updated: results.length, candidates: results });
  } catch (error: any) {
    console.error('[HR] Error bulk updating candidate stages:', error);
    res.status(500).json({ error: 'Failed to bulk update candidate stages' });
  }
});

// ============================================================
// CV Uploads
// ============================================================

// router.post('/jobs/:jobId/cv-upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
//     if (!fs.existsSync(uploadsDir)) {
//       fs.mkdirSync(uploadsDir, { recursive: true });
//     }

//     const uuid = randomUUID();
//     const savedFileName = `${uuid}_${req.file.originalname}`;
//     const filePath = path.join(uploadsDir, savedFileName);
//     fs.writeFileSync(filePath, req.file.buffer);

//     const isZip = req.file.mimetype === 'application/zip' ||
//       req.file.mimetype === 'application/x-zip-compressed' ||
//       req.file.originalname.toLowerCase().endsWith('.zip');

//     let candidatesCreated = 0;
//     let totalFiles = 1;
//     const createdCandidates: any[] = [];
//     const rejectedCvs: { fileName: string; reason: string }[] = [];
//     const duplicateCvs: { fileName: string; reason: string }[] = [];

//     if (isZip) {
//       const zip = new AdmZip(req.file.buffer);
//       const entries = zip.getEntries();
//       const cvEntries = entries.filter((entry: any) => {
//         const ext = path.extname(entry.entryName).toLowerCase();
//         return !entry.isDirectory && (ext === '.pdf' || ext === '.doc' || ext === '.docx');
//       });

//       totalFiles = cvEntries.length;

//       for (const entry of cvEntries) {
//         const entryBuffer = entry.getData();
//         const entryName = entry.entryName;
//         const baseName = path.basename(entryName, path.extname(entryName));
//         const nameParts = baseName.replace(/[_\-\.]/g, ' ').trim().split(/\s+/);
//         const firstName = nameParts[0] || 'Unknown';
//         const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

//         const entryUuid = randomUUID();
//         const savedEntryName = `${entryUuid}_${path.basename(entryName)}`;
//         const entryFilePath = path.join(uploadsDir, savedEntryName);
//         fs.writeFileSync(entryFilePath, entryBuffer);

//         const uploadRecord = await HRStorage.createCvUpload({
//       userId: req.userId!,
//       jobId: req.params.jobId,
//       fileName: req.file.originalname,
//       filePath,
//       fileSize: req.file.size,
//       mimeType: req.file.mimetype,
//       status: 'completed',
//       totalFiles,
//       errors: [],
//     });

//         let cvText = '';
//         try {
//           cvText = await extractTextFromCV(entryBuffer, entryName);
//           console.log(`[CV Extractor] Extracted ${cvText.length} chars from ${entryName}`);
//         } catch (err: any) {
//           console.error(`[CV Extractor] Error extracting text from ${entryName}:`, err.message);
//         }

//         const rawPhone = extractPhoneFromText(cvText);
//         if (!rawPhone) {
//           console.log(`[CV Upload] Rejected ${entryName} - no phone number found in CV`);
//           rejectedCvs.push({ fileName: path.basename(entryName), reason: 'No mobile/phone number found in CV' });
//           continue;
//         }
//         const phone = normalizePhone(rawPhone);

//         const { duplicate: existingCandidate, reason: dupReason } = await HRStorage.findDuplicateCandidateInJob(req.params.jobId, phone, firstName, lastName);
//         if (existingCandidate) {
//           console.log(`[CV Upload] Duplicate ${entryName} - ${dupReason}`);
//           duplicateCvs.push({ fileName: path.basename(entryName), reason: dupReason });
//           continue;
//         }

//         const candidate = await HRStorage.createCandidate({
//           userId: req.userId!,
//           jobId: req.params.jobId,
//           firstName,
//           lastName,
//           phone,
//           cvFileName: entryName,
//           cvFilePath: entryFilePath,
//           cvUploadId: uploadRecord.id,
//           cvFileSize: entryBuffer.length,
//           cvMimeType: path.extname(entryName).toLowerCase() === '.pdf' ? 'application/pdf' : path.extname(entryName).toLowerCase() === '.doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//           cvText: cvText || undefined,
//           source: 'upload' as const,
//           pipelineStage: 'uploaded' as const,
//         } as any);
//         createdCandidates.push(candidate);
//       }
//       candidatesCreated = createdCandidates.length;
//     } else {
//       const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
//       const nameParts = baseName.replace(/[_\-\.]/g, ' ').trim().split(/\s+/);
//       const firstName = nameParts[0] || 'Unknown';
//       const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

//       let cvText = '';
//       try {
//         cvText = await extractTextFromCV(req.file.buffer, req.file.originalname);
//         console.log(`[CV Extractor] Extracted ${cvText.length} chars from ${req.file.originalname}`);
//       } catch (err: any) {
//         console.error(`[CV Extractor] Error extracting text from ${req.file.originalname}:`, err.message);
//       }

//       const rawPhone = extractPhoneFromText(cvText);
//       if (!rawPhone) {
//         console.log(`[CV Upload] Rejected ${req.file.originalname} - no phone number found in CV`);
//         rejectedCvs.push({ fileName: req.file.originalname, reason: 'No mobile/phone number found in CV' });
//       } else {
//         const phone = normalizePhone(rawPhone);
//         const { duplicate: existingCandidate, reason: dupReason } = await HRStorage.findDuplicateCandidateInJob(req.params.jobId, phone, firstName, lastName);
//         if (existingCandidate) {
//           console.log(`[CV Upload] Duplicate ${req.file.originalname} - ${dupReason}`);
//           duplicateCvs.push({ fileName: req.file.originalname, reason: dupReason });
//         } else {
//           const candidate = await HRStorage.createCandidate({
//             userId: req.userId!,
//             jobId: req.params.jobId,
//             firstName,
//             lastName,
//             phone,
//             cvFileName: req.file.originalname,
//             cvFilePath: filePath,
//             cvUploadId: uploadRecord.id,
//             cvFileSize: req.file.size,
//             cvMimeType: req.file.mimetype,
//             cvText: cvText || undefined,
//             source: 'upload',
//             pipelineStage: 'uploaded',
//           });
//           createdCandidates.push(candidate);
//           candidatesCreated = 1;
//         }
//       }
//     }



//     await HRStorage.updateCvUpload(uploadRecord.id, {
//       candidatesCreated,
//       processedFiles: totalFiles,
//       processingCompletedAt: new Date(),
//     } as any);

//     res.json({
//       upload: uploadRecord,
//       candidatesCreated,
//       candidates: createdCandidates,
//       rejectedCvs,
//       duplicateCvs,
//       autoScreening: true,
//     });

//     if (createdCandidates.length > 0) {
//       const candidateIds = createdCandidates.map((c: any) => c.id);
//       const userId = req.userId!;
//       setImmediate(() => {
//         autoScreenCandidates(candidateIds, userId).catch(err => {
//           console.error('[HR AutoScreen] Background screening failed:', err);
//         });
//       });
//     }
//   } catch (error: any) {
//     console.error('[HR] Error uploading CV:', error);
//     res.status(500).json({ error: 'Failed to upload CV' });
//   }
// });



router.post('/jobs/:jobId/cv-upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uuid = randomUUID();
    const savedFileName = `${uuid}_${req.file.originalname}`;
    const filePath = path.join(uploadsDir, savedFileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // ✅ STEP 1: CHECK ZIP
    const isZip = req.file.mimetype === 'application/zip' ||
      req.file.mimetype === 'application/x-zip-compressed' ||
      req.file.originalname.toLowerCase().endsWith('.zip');

    let totalFiles = 1;

    // ✅ STEP 2: CALCULATE TOTAL FILES BEFORE DB INSERT
    let zipEntries: any[] = [];

    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();

      zipEntries = entries.filter((entry: any) => {
        const ext = path.extname(entry.entryName).toLowerCase();
        return !entry.isDirectory && (ext === '.pdf' || ext === '.doc' || ext === '.docx');
      });

      totalFiles = zipEntries.length;
    }

    // ✅ STEP 3: CREATE UPLOAD RECORD (CORRECT PLACE)
    const uploadRecord = await HRStorage.createCvUpload({
      userId: req.userId!,
      jobId: req.params.jobId,
      fileName: req.file.originalname,
      filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing',
      totalFiles, // ✅ FIXED
      errors: [],
    });

    console.log("CHECK uploaded recred", uploadRecord)

    let candidatesCreated = 0;
    const createdCandidates: any[] = [];
    const rejectedCvs: any[] = [];
    const duplicateCvs: any[] = [];

    // ================= ZIP CASE =================
    if (isZip) {
      for (const entry of zipEntries) {
        const entryBuffer = entry.getData();
        const entryName = entry.entryName;

        const entryUuid = randomUUID();
        const entryFilePath = path.join(uploadsDir, `${entryUuid}_${path.basename(entryName)}`);
        fs.writeFileSync(entryFilePath, entryBuffer);

        const baseName = path.basename(entryName, path.extname(entryName));
        const nameParts = baseName.replace(/[_\-\.]/g, ' ').trim().split(/\s+/);

        // const firstName = nameParts[0] || 'Unknown';
        // const lastName = nameParts.slice(1).join(' ') || undefined;

        const extractedName = extractNameFromCVText(cvText);

        let firstName = 'Unknown';
        let lastName = null;

        if (extractedName) {
          firstName = extractedName.firstName;
          lastName = extractedName.lastName;
        }

        const candidate = await HRStorage.createCandidate({
          userId: req.userId!,
          jobId: req.params.jobId,
          firstName,
          lastName,
          cvFileName: entryName,
          cvFilePath: entryFilePath,
          cvUploadId: uploadRecord.id, // ✅ FIX
          source: 'upload',
          pipelineStage: 'uploaded',
        });

        createdCandidates.push(candidate);
      }

      candidatesCreated = createdCandidates.length;
    }

    // ================= SINGLE FILE =================
    else {
      const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const nameParts = baseName.replace(/[_\-\.]/g, ' ').trim().split(/\s+/);

      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const candidate = await HRStorage.createCandidate({
        userId: req.userId!,
        jobId: req.params.jobId,
        firstName,
        lastName,
        cvFileName: req.file.originalname,
        cvFilePath: filePath,
        cvUploadId: uploadRecord.id, // ✅ FIX
        source: 'upload',
        pipelineStage: 'uploaded',
      });

      createdCandidates.push(candidate);
      candidatesCreated = 1;
    }

    // ✅ STEP 4: UPDATE UPLOAD RECORD
    await HRStorage.updateCvUpload(uploadRecord.id, {
      status: 'completed',
      candidatesCreated,
      processedFiles: totalFiles,
      processingCompletedAt: new Date(),
    });

    res.json({
      upload: uploadRecord,
      candidatesCreated,
      candidates: createdCandidates,
      rejectedCvs,
      duplicateCvs,
    });

  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    res.status(500).json({ error: 'Failed to upload CV' });
  }
});

router.get('/cv-uploads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.query;
    if (jobId) {
      const uploads = await HRStorage.getCvUploadsByJob(jobId as string);
      res.json(uploads);
    } else {
      const jobs = await HRStorage.getJobsByUser(req.userId!);
      const allUploads: any[] = [];
      for (const job of jobs) {
        const uploads = await HRStorage.getCvUploadsByJob(job.id);
        allUploads.push(...uploads);
      }
      res.json(allUploads);
    }
  } catch (error: any) {
    console.error('[HR] Error fetching CV uploads:', error);
    res.status(500).json({ error: 'Failed to fetch CV uploads' });
  }
});

router.post('/cv-uploads-old', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = req.file.originalname;
    const isZip = fileName.endsWith('.zip');
    let totalCvs = 1;
    const cvFiles: { name: string; buffer: Buffer }[] = [];

    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();
      totalCvs = 0;
      for (const entry of entries) {
        const name = entry.entryName.toLowerCase();
        if (!entry.isDirectory && (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx'))) {
          totalCvs++;
          cvFiles.push({ name: entry.entryName, buffer: entry.getData() });
        }
      }
    } else {
      cvFiles.push({ name: fileName, buffer: req.file.buffer });
    }

    const cvUpload = await HRStorage.createCvUpload({
      jobId,
      userId: req.userId!,
      fileName,
      filePath: path.join(uploadsDir, fileName),
      mimeType: req.file.mimetype || 'application/octet-stream',
      fileSize: req.file.size,
      totalFiles: totalCvs,
      status: 'processing',
    });

    const createdCandidateIds: string[] = [];
    const rejectedCvs: { fileName: string; reason: string }[] = [];
    const duplicateCvs: { fileName: string; reason: string }[] = [];
    for (const cvFile of cvFiles) {
      const uuid = randomUUID();
      const savedFileName = `${uuid}_${cvFile.name.split('/').pop()}`;
      const filePath = path.join(uploadsDir, savedFileName);
      fs.writeFileSync(filePath, cvFile.buffer);

      const nameWithoutExt = cvFile.name.split('/').pop()?.replace(/\.(pdf|doc|docx)$/i, '') || 'Unknown';
      const nameParts = nameWithoutExt.replace(/[_\-\.]/g, ' ').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      let cvText = '';
      try {
        cvText = await extractTextFromCV(cvFile.buffer, cvFile.name);
        console.log(`[CV Extractor] Extracted ${cvText.length} chars from ${cvFile.name}`);
      } catch (err: any) {
        console.error(`[CV Extractor] Error extracting text from ${cvFile.name}:`, err.message);
      }

      const phone = extractPhoneFromText(cvText);
      if (!phone) {
        console.log(`[CV Upload] Rejected ${cvFile.name} - no phone number found in CV`);
        rejectedCvs.push({ fileName: cvFile.name.split('/').pop() || cvFile.name, reason: 'No mobile/phone number found in CV' });
        continue;
      }

      const { duplicate: existingCandidate, reason: dupReason } = await HRStorage.findDuplicateCandidateInJob(jobId, phone, firstName, lastName);
      if (existingCandidate) {
        console.log(`[CV Upload] Duplicate ${cvFile.name} - ${dupReason}`);
        duplicateCvs.push({ fileName: cvFile.name.split('/').pop() || cvFile.name, reason: dupReason });
        continue;
      }

      const candidate = await HRStorage.createOrMergeCandidate({
        jobId,
        userId: req.userId!,
        firstName,
        lastName,
        phone,
        email: `${nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '.')}@pending.review`,
        cvFileName: cvFile.name.split('/').pop() || cvFile.name,
        cvFilePath: filePath,
        cvUploadId: cvUpload.id,
        cvText: cvText || undefined,
        source: 'cv_upload',
        pipelineStage: 'uploaded',
      });
      if (candidate && candidate.id) {
        createdCandidateIds.push(candidate.id);
      }
    }

    const acceptedCount = createdCandidateIds.length;
    await HRStorage.updateCvUpload(cvUpload.id, { processedFiles: totalCvs, candidatesCreated: acceptedCount, status: 'completed' } as any);

    if (createdCandidateIds.length > 0) {
      const userId = req.userId!;
      setImmediate(() => {
        autoScreenCandidates(createdCandidateIds, userId).catch(err => {
          console.error('[HR AutoScreen] Background screening failed:', err);
        });
      });
    }

    res.json({
      ...cvUpload,
      processedFiles: totalCvs,
      candidatesCreated: acceptedCount,
      rejectedCount: rejectedCvs.length,
      rejectedCvs,
      duplicateCvs,
      duplicateCount: duplicateCvs.length,
      status: 'completed',
      autoScreening: createdCandidateIds.length > 0,
    });
  } catch (error: any) {
    console.error('[HR] Error uploading CVs:', error);
    res.status(500).json({ error: 'Failed to upload CVs' });
  }
});


router.post('/cv-uploads', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = req.file.originalname;
    const isZip = fileName.endsWith('.zip');
    let totalCvs = 1;
    const cvFiles: { name: string; buffer: Buffer }[] = [];

    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();
      totalCvs = 0;

      for (const entry of entries) {
        const name = entry.entryName.toLowerCase();
        if (!entry.isDirectory && (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx'))) {
          totalCvs++;
          cvFiles.push({ name: entry.entryName, buffer: entry.getData() });
        }
      }
    } else {
      cvFiles.push({ name: fileName, buffer: req.file.buffer });
    }

    // checking candidate count against plan limit before processing to avoid unnecessary work if limit is already reached

    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = await storage.getPlanByName(user.planType || 'free');
    if (!plan) {
      return res.status(500).json({ error: "Plan configuration not found" });
    }

    const candidateCount = await HRStorage.getCandidatesCount(req.userId!);

    // This blocks the request if the current count is already at or above the limit
    if (candidateCount >= plan.maxContactsPerCampaign) {
      return res.status(403).json({
        error: `Candidate limit reached for your plan (${plan.maxContactsPerCampaign} candidates). Please upgrade your plan to add more candidates.`
      });
    }


    const cvUpload = await HRStorage.createCvUpload({
      jobId,
      userId: req.userId!,
      fileName,
      filePath: path.join(uploadsDir, fileName),
      mimeType: req.file.mimetype || 'application/octet-stream',
      fileSize: req.file.size,
      totalFiles: totalCvs,
      status: 'processing',
    });

    const createdCandidateIds: string[] = [];
    const rejectedCvs: { fileName: string; reason: string }[] = [];
    const duplicateCvs: { fileName: string; reason: string }[] = [];

    for (const cvFile of cvFiles) {

      const uuid = randomUUID();
      const savedFileName = `${uuid}_${cvFile.name.split('/').pop()}`;
      const filePath = path.join(uploadsDir, savedFileName);
      fs.writeFileSync(filePath, cvFile.buffer);

      let cvText = '';
      try {
        cvText = await extractTextFromCV(cvFile.buffer, cvFile.name);
      } catch (err: any) {
        console.error(`Error extracting text from ${cvFile.name}:`, err.message);
      }

      // 🔥 NEW: Extract real name from CV text
      const extractedName = extractNameFromCVText(cvText);

      let firstName = 'Unknown';
      let lastName: string | null = null;

      if (extractedName) {
        firstName = extractedName.firstName;
        lastName = extractedName.lastName;
      }

      const phone = extractPhoneFromText(cvText);
      if (!phone) {
        rejectedCvs.push({
          fileName: cvFile.name.split('/').pop() || cvFile.name,
          reason: 'No mobile/phone number found in CV'
        });
        continue;
      }

      const { duplicate: existingCandidate, reason: dupReason } =
        await HRStorage.findDuplicateCandidateInJob(jobId, phone, firstName, lastName);

      if (existingCandidate) {
        duplicateCvs.push({
          fileName: cvFile.name.split('/').pop() || cvFile.name,
          reason: dupReason
        });
        continue;
      }

      const extractedEmail = extractEmailFromText(cvText);

      const candidate = await HRStorage.createOrMergeCandidate({
        jobId,
        userId: req.userId!,
        firstName,
        lastName,
        phone,
        email: extractedEmail || `${firstName.toLowerCase()}.${(lastName || '').toLowerCase().replace(/\s+/g, '')}@pending.review`,
        cvFileName: cvFile.name.split('/').pop() || cvFile.name,
        cvFilePath: filePath,
        cvUploadId: cvUpload.id,
        cvText: cvText || undefined,
        source: 'cv_upload',
        pipelineStage: 'uploaded',
      });

      if (candidate?.id) {
        createdCandidateIds.push(candidate.id);
      }
    }

    const acceptedCount = createdCandidateIds.length;

    await HRStorage.updateCvUpload(cvUpload.id, {
      processedFiles: totalCvs,
      candidatesCreated: acceptedCount,
      status: 'completed'
    } as any);

    if (createdCandidateIds.length > 0) {
      const userId = req.userId!;
      setImmediate(() => {
        autoScreenCandidates(createdCandidateIds, userId)
          .catch(err => console.error('AutoScreen failed:', err));
      });
    }

    res.json({
      ...cvUpload,
      processedFiles: totalCvs,
      candidatesCreated: acceptedCount,
      rejectedCount: rejectedCvs.length,
      rejectedCvs,
      duplicateCvs,
      duplicateCount: duplicateCvs.length,
      status: 'completed',
      autoScreening: createdCandidateIds.length > 0,
    });

  } catch (error: any) {
    console.error('Error uploading CVs:', error);
    res.status(500).json({ error: 'Failed to upload CVs' });
  }
});




// router.post(
//   '/cv-uploads',
//   requireAuth,
//   upload.single('file'),
//   async (req: AuthRequest, res: Response) => {
//     try {
//       const { jobId } = req.body;

//       if (!jobId) {
//         return res.status(400).json({ error: 'jobId is required' });
//       }

//       if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//       }

//       const userId = req.userId!;

//       // ✅ Ensure upload dir exists
//       const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
//       if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true });
//       }

//       const fileName = req.file.originalname;
//       const isZip = fileName.endsWith('.zip');

//       let cvFiles: { name: string; buffer: Buffer }[] = [];

//       // ✅ Extract files
//       if (isZip) {
//         const zip = new AdmZip(req.file.buffer);
//         const entries = zip.getEntries();

//         for (const entry of entries) {
//           const name = entry.entryName.toLowerCase();
//           if (
//             !entry.isDirectory &&
//             (name.endsWith('.pdf') ||
//               name.endsWith('.doc') ||
//               name.endsWith('.docx'))
//           ) {
//             cvFiles.push({
//               name: entry.entryName,
//               buffer: entry.getData(),
//             });
//           }
//         }
//       } else {
//         cvFiles.push({
//           name: fileName,
//           buffer: req.file.buffer,
//         });
//       }

//       const totalCvs = cvFiles.length;

//       // ✅ Get user + plan
//       const user = await storage.getUser(userId);
//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       const plan = await storage.getPlanByName(user.planType || 'free');
//       if (!plan) {
//         return res.status(500).json({ error: 'Plan not found' });
//       }

//       const candidateCount = await HRStorage.getCandidatesCount(userId);
//       const limit = plan.maxContactsPerCampaign;

//       // ✅ HARD BLOCK if already full
//       if (candidateCount >= limit) {
//         return res.status(403).json({
//           error: `Candidate limit reached (${limit}). Upgrade your plan.`,
//         });
//       }

//       // ✅ Create upload record early
//       const cvUpload = await HRStorage.createCvUpload({
//         jobId,
//         userId,
//         fileName,
//         filePath: path.join(uploadsDir, fileName),
//         mimeType: req.file.mimetype || 'application/octet-stream',
//         fileSize: req.file.size,
//         totalFiles: totalCvs,
//         status: 'processing',
//       });

//       const createdCandidateIds: string[] = [];
//       const rejectedCvs: any[] = [];
//       const duplicateCvs: any[] = [];

//       let currentCount = candidateCount;

//       // 🔥 PROCESS FILES
//       for (const cvFile of cvFiles) {
//         // ✅ Enforce limit DURING processing
//         if (currentCount >= limit) {
//           rejectedCvs.push({
//             fileName: cvFile.name,
//             reason: 'Plan limit reached',
//           });
//           continue;
//         }

//         try {
//           const uuid = randomUUID();
//           const savedFileName = `${uuid}_${cvFile.name.split('/').pop()}`;
//           const filePath = path.join(uploadsDir, savedFileName);

//           fs.writeFileSync(filePath, cvFile.buffer);

//           // ✅ Extract text
//           let cvText = '';
//           try {
//             cvText = await extractTextFromCV(cvFile.buffer, cvFile.name);
//           } catch (err: any) {
//             console.error('Text extraction error:', err.message);
//           }

//           const extractedName = extractNameFromCVText(cvText);

//           const firstName = extractedName?.firstName || 'Unknown';
//           const lastName = extractedName?.lastName || null;

//           const phone = extractPhoneFromText(cvText);

//           if (!phone) {
//             rejectedCvs.push({
//               fileName: cvFile.name,
//               reason: 'No phone number',
//             });
//             continue;
//           }

//           // ✅ Duplicate check
//           const { duplicate, reason } =
//             await HRStorage.findDuplicateCandidateInJob(
//               jobId,
//               phone,
//               firstName,
//               lastName
//             );

//           if (duplicate) {
//             duplicateCvs.push({
//               fileName: cvFile.name,
//               reason,
//             });
//             continue;
//           }

//           // ✅ Create candidate
//           const candidate = await HRStorage.createOrMergeCandidate({
//             jobId,
//             userId,
//             firstName,
//             lastName,
//             phone,
//             email: `${firstName.toLowerCase()}.${(lastName || '')
//               .toLowerCase()
//               .replace(/\s+/g, '')}@pending.review`,
//             cvFileName: cvFile.name,
//             cvFilePath: filePath,
//             cvUploadId: cvUpload.id,
//             cvText: cvText || undefined,
//             source: 'cv_upload',
//             pipelineStage: 'uploaded',
//           });

//           if (candidate?.id) {
//             createdCandidateIds.push(candidate.id);
//             currentCount++; // 🔥 update count safely
//           }
//         } catch (err: any) {
//           console.error('Processing error:', err.message);
//           rejectedCvs.push({
//             fileName: cvFile.name,
//             reason: 'Processing failed',
//           });
//         }
//       }

//       // ✅ Final update
//       await HRStorage.updateCvUpload(cvUpload.id, {
//         processedFiles: totalCvs,
//         candidatesCreated: createdCandidateIds.length,
//         status: 'completed',
//       } as any);

//       // ✅ Background AI screening
//       if (createdCandidateIds.length > 0) {
//         setImmediate(() => {
//           autoScreenCandidates(createdCandidateIds, userId).catch((err) =>
//             console.error('AutoScreen failed:', err)
//           );
//         });
//       }

//       return res.json({
//         ...cvUpload,
//         processedFiles: totalCvs,
//         candidatesCreated: createdCandidateIds.length,
//         rejectedCount: rejectedCvs.length,
//         duplicateCount: duplicateCvs.length,
//         rejectedCvs,
//         duplicateCvs,
//         status: 'completed',
//         autoScreening: createdCandidateIds.length > 0,
//       });
//     } catch (error: any) {
//       console.error('Upload error:', error);
//       return res.status(500).json({
//         error: 'Failed to upload CVs',
//       });
//     }
//   }
// );
router.get('/jobs/:jobId/cv-uploads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uploads = await HRStorage.getCvUploadsByJob(req.params.jobId);
    res.json(uploads);
  } catch (error: any) {
    console.error('[HR] Error fetching CV uploads:', error);
    res.status(500).json({ error: 'Failed to fetch CV uploads' });
  }
});

router.get('/candidates/:candidateId/download-cv', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.candidateId, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    if (!candidate.cvFilePath || !candidate.cvFileName) {
      return res.status(404).json({ error: 'No CV file available for this candidate' });
    }
    if (!fs.existsSync(candidate.cvFilePath)) {
      return res.status(404).json({ error: 'CV file not found on server' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${candidate.cvFileName}"`);
    res.setHeader('Content-Type', candidate.cvMimeType || 'application/octet-stream');
    const fileStream = fs.createReadStream(candidate.cvFilePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('[HR] Error downloading CV:', error);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

// ============================================================
// Interview Sessions
// ============================================================

router.get('/interviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.query;
    const enrichInterviews = async (interviews: any[], jobTitle?: string) => {
      const enriched = [];
      for (const i of interviews) {
        const candidate = await HRStorage.getCandidate(i.candidateId);
        const hrCallsData = await HRStorage.getHrCallsByCandidate(i.candidateId, i.jobId);

        if (i.status === 'in_progress') {
          const refTime = i.scheduledAt || i.startedAt || i.createdAt;
          const refTimestamp = new Date(refTime).getTime();
          const now = Date.now();
          const thirtyMinutes = 30 * 60 * 1000;
          if (now - refTimestamp > thirtyMinutes) {
            const allCallsDone = !hrCallsData?.length || hrCallsData.every((c: any) =>
              ['completed', 'failed', 'no_answer', 'busy', 'cancelled'].includes(c.status)
            );
            if (allCallsDone) {
              const hasSuccessful = hrCallsData?.some((c: any) => c.status === 'completed');
              const newStatus = hasSuccessful ? 'completed' : 'failed';
              await HRStorage.updateInterviewSession(i.id, { status: newStatus });
              i.status = newStatus;
            }
          }
        }

        const latestCall = hrCallsData?.[0];
        const maxAttempt = hrCallsData?.reduce((max: number, c: any) => Math.max(max, c.attemptNumber || 1), 0) || 0;

        const callAttempts = (hrCallsData || []).map((c: any) => ({
          id: c.id,
          attemptNumber: c.attemptNumber,
          status: c.status,
          provider: c.provider,
          direction: c.direction,
          fromNumber: c.fromNumber,
          toNumber: c.toNumber,
          duration: c.duration,
          callScore: c.callScore,
          recordingUrl: c.recordingUrl,
          transcript: c.transcript,
          summary: c.summary,
          aiEvaluation: c.aiEvaluation,
          aiRecommendation: c.aiRecommendation,
          sentimentScore: c.sentimentScore,
          errorMessage: c.errorMessage,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
          createdAt: c.createdAt,
        }));

        enriched.push({
          ...i,
          candidateName: candidate ? `${candidate.firstName} ${candidate.lastName || ''}`.trim() : 'Unknown',
          candidatePhone: i.candidatePhone || candidate?.phone || '',
          candidateEmail: candidate?.email || '',
          candidateAiScore: candidate?.aiScore ?? null,
          candidateDesignation: candidate?.currentDesignation || '',
          candidateCompany: candidate?.currentCompany || '',
          candidateExperience: candidate?.totalExperienceYears ?? null,
          attemptNumber: maxAttempt || (latestCall?.attemptNumber || 1),
          totalAttempts: hrCallsData?.length || 0,
          hasRecording: callAttempts.some((c: any) => !!c.recordingUrl) || !!i.recordingUrl,
          hasTranscript: callAttempts.some((c: any) => !!c.transcript) || !!i.transcript,
          latestSummary: latestCall?.summary || null,
          latestAiEvaluation: latestCall?.aiEvaluation || null,
          latestAiRecommendation: latestCall?.aiRecommendation || null,
          latestSentimentScore: latestCall?.sentimentScore || null,
          latestCallScore: latestCall?.callScore ?? null,
          callDuration: i.duration || latestCall?.duration || null,
          latestDirection: latestCall?.direction || (callAttempts.length > 0 ? callAttempts[0].direction : null),
          callAttempts,
          ...(jobTitle ? { jobTitle } : {}),
        });
      }
      return enriched;
    };

    const groupByCandidate = (enrichedInterviews: any[]) => {
      const grouped = new Map<string, any[]>();
      for (const interview of enrichedInterviews) {
        const key = `${interview.candidateId}_${interview.jobId}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(interview);
      }

      const result: any[] = [];
      for (const [, group] of grouped) {
        group.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latest = { ...group[0] };
        latest.totalInterviews = group.length;

        const allCallAttempts: any[] = [];
        const seenCallIds = new Set<string>();
        for (const i of group) {
          if (i.callAttempts) {
            for (const c of i.callAttempts) {
              if (!seenCallIds.has(c.id)) {
                seenCallIds.add(c.id);
                allCallAttempts.push(c);
              }
            }
          }
        }
        allCallAttempts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        latest.callAttempts = allCallAttempts;
        latest.totalAttempts = allCallAttempts.length;
        latest.hasRecording = allCallAttempts.some((c: any) => !!c.recordingUrl) || group.some((i: any) => !!i.recordingUrl);
        latest.hasTranscript = allCallAttempts.some((c: any) => !!c.transcript) || group.some((i: any) => !!i.hasTranscript);

        const newestCall = allCallAttempts[0];
        if (newestCall) {
          latest.latestSummary = newestCall.summary || latest.latestSummary;
          latest.latestAiEvaluation = newestCall.aiEvaluation || latest.latestAiEvaluation;
          latest.latestAiRecommendation = newestCall.aiRecommendation || latest.latestAiRecommendation;
          latest.latestSentimentScore = newestCall.sentimentScore || latest.latestSentimentScore;
          latest.latestCallScore = newestCall.callScore ?? latest.latestCallScore;
          latest.callDuration = newestCall.duration || latest.callDuration;
          latest.latestDirection = newestCall.direction || latest.latestDirection;
        }
        if (latest.latestCallScore === null || latest.latestCallScore === undefined) {
          const scored = allCallAttempts.find((c: any) => c.callScore !== null && c.callScore !== undefined);
          if (scored) {
            latest.latestCallScore = scored.callScore;
            latest.latestSummary = latest.latestSummary || scored.summary;
            latest.latestAiEvaluation = latest.latestAiEvaluation || scored.aiEvaluation;
            latest.latestAiRecommendation = latest.latestAiRecommendation || scored.aiRecommendation;
            latest.latestSentimentScore = latest.latestSentimentScore || scored.sentimentScore;
          }
        }
        result.push(latest);
      }
      return result;
    };

    if (jobId) {
      const interviews = await HRStorage.getInterviewsByJob(jobId as string);
      const job = await HRStorage.getJob(jobId as string);
      res.json(groupByCandidate(await enrichInterviews(interviews, job?.title)));
    } else {
      const jobs = await HRStorage.getJobsByUser(req.userId!);
      const allInterviews: any[] = [];
      for (const job of jobs) {
        const interviews = await HRStorage.getInterviewsByJob(job.id);
        allInterviews.push(...await enrichInterviews(interviews, job.title));
      }
      res.json(groupByCandidate(allInterviews));
    }
  } catch (error: any) {
    console.error('[HR] Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.get('/jobs/:jobId/interviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interviews = await HRStorage.getInterviewsByJob(req.params.jobId);
    res.json(interviews);
  } catch (error: any) {
    console.error('[HR] Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.get('/interviews/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interview = await HRStorage.getInterviewSession(req.params.id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(interview);
  } catch (error: any) {
    console.error('[HR] Error fetching interview:', error);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

router.post('/jobs/:jobId/interviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = { ...req.body };

    // ✅ Date parse
    if (body.scheduledAt && typeof body.scheduledAt === 'string') {
      const parsed = new Date(body.scheduledAt);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled date format' });
      }
      body.scheduledAt = parsed;
    }

    // ✅ Normalize phone
    if (body.candidatePhone) {
      body.candidatePhone = normalizePhone(body.candidatePhone);
    }

    const data = insertInterviewSessionSchema.parse({
      ...body,
      userId: req.userId!,
      jobId: req.params.jobId,
      status: 'scheduled',
    });

    // ✅ Update candidate phone if needed
    if (data.candidatePhone && data.candidateId) {
      await HRStorage.updateCandidate(data.candidateId, {
        phone: data.candidatePhone
      });
    }

    // ✅ Create interview
    const interview = await HRStorage.createInterviewSession(data);

    // 🔥 IMPORTANT: PIPELINE UPDATE
    if (data.candidateId) {
      const candidate = await HRStorage.getCandidate(data.candidateId);

      if (candidate) {
        const newStage = 'interview_scheduled';

        await HRStorage.updateCandidate(candidate.id, {
          pipelineStage: newStage
        });

        // ✅ Pipeline history
        await HRStorage.createPipelineHistory({
          candidateId: candidate.id,
          jobId: candidate.jobId,
          userId: req.userId!,
          fromStage: candidate.pipelineStage,
          toStage: newStage,
          reason: 'Interview scheduled',
          changedBy: 'user',
        });
      }
    }

    res.json(interview);

  } catch (error: any) {
    console.error('[HR] Error creating interview:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid data',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Failed to create interview' });
  }
});

router.post('/jobs/:jobId/interviews-old', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = { ...req.body };
    if (body.scheduledAt && typeof body.scheduledAt === 'string') {
      const parsed = new Date(body.scheduledAt);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled date format' });
      }
      body.scheduledAt = parsed;
    }
    if (body.candidatePhone) {
      body.candidatePhone = normalizePhone(body.candidatePhone);
    }
    const data = insertInterviewSessionSchema.parse({
      ...body,
      userId: req.userId!,
      jobId: req.params.jobId,
      status: 'scheduled',
    });
    if (data.candidatePhone && data.candidateId) {
      await HRStorage.updateCandidate(data.candidateId, { phone: data.candidatePhone });
    }
    const interview = await HRStorage.createInterviewSession(data);
    res.json(interview);
  } catch (error: any) {
    console.error('[HR] Error creating interview:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

router.patch('/interviews/reschedule/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interviewId = req.params.id;
    const body = { ...req.body };

    const interview = await HRStorage.getInterviewSession(req.params.id);
    if (!interview || interview.userId !== req.userId) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Cannot reschedule a completed interview' });
    }

    // ✅ Date parse
    if (body.scheduledAt && typeof body.scheduledAt === 'string') {
      const parsed = new Date(body.scheduledAt);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled date format' });
      }
      body.scheduledAt = parsed;
    }

    // ✅ Normalize phone
    if (body.candidatePhone) {
      body.candidatePhone = normalizePhone(body.candidatePhone);
    }
    // ✅ Update interview
    const updated = await HRStorage.updateInterviewSession(interviewId, {
      scheduledAt: body.scheduledAt ?? existing.scheduledAt,
      candidatePhone: body.candidatePhone ?? existing.candidatePhone,
      metadata: body.metadata ?? existing.metadata,
      status: 'scheduled', // reset status if rescheduled
    });



    res.json(updated);

  } catch (error: any) {
    console.error('[HR] Error rescheduling interview:', error);

    res.status(500).json({ error: 'Failed to reschedule interview' });
  }
});

router.patch('/interviews/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interview = await HRStorage.updateInterviewSession(req.params.id, req.body);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(interview);
  } catch (error: any) {
    console.error('[HR] Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

router.post('/interviews/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interview = await HRStorage.getInterviewSession(req.params.id);
    if (!interview || interview.userId !== req.userId) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed interview' });
    }
    const updated = await HRStorage.updateInterviewSession(req.params.id, {
      status: 'cancelled',
      completedAt: new Date()
    });
    res.json(updated);
  } catch (error: any) {
    console.error('[HR] Error cancelling interview:', error);
    res.status(500).json({ error: 'Failed to cancel interview' });
  }
});

router.get('/candidates/:candidateId/interviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const interviews = await HRStorage.getInterviewsByCandidate(req.params.candidateId);
    res.json(interviews);
  } catch (error: any) {
    console.error('[HR] Error fetching candidate interviews:', error);
    res.status(500).json({ error: 'Failed to fetch candidate interviews' });
  }
});

// ============================================================
// Pipeline History
// ============================================================

router.get('/candidates/:candidateId/pipeline-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const history = await HRStorage.getCandidatePipelineHistory(req.params.candidateId);
    res.json(history);
  } catch (error: any) {
    console.error('[HR] Error fetching pipeline history:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline history' });
  }
});

// ============================================================
// Candidate Comments
// ============================================================

router.get('/candidates/:candidateId/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.candidateId, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const comments = await HRStorage.getCommentsByCandidate(req.params.candidateId);
    res.json(comments);
  } catch (error: any) {
    console.error('[HR] Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/candidates/:candidateId/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.candidateId, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const authorName = user?.name || user?.email || 'Unknown User';
    const comment = await HRStorage.createComment({
      candidateId: req.params.candidateId,
      userId: req.userId!,
      content: content.trim(),
      authorName,
    });
    res.json(comment);
  } catch (error: any) {
    console.error('[HR] Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/comments/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await HRStorage.deleteComment(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('[HR] Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================================
// AI Summary Generation
// ============================================================

// router.post('/candidates/:id/generate-summary', requireAuth, async (req: AuthRequest, res: Response) => {
//   try {
//     const candidate = await verifyCandidateOwnership(req.params.id, req.userId!);
//     if (!candidate) {
//       return res.status(404).json({ error: 'Candidate not found' });
//     }

//     const openaiApiKey = await getOpenAIKeyForScreening();
//     console.log("Check API KEY@@@@@@@@@@@@@@@", openaiApiKey)
//     if (!openaiApiKey) {
//       return res.status(400).json({ error: 'OpenAI API key not configured' });
//     }

//     // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
//     const openai = new OpenAI({ apiKey: openaiApiKey });

//     const job = await HRStorage.getJob(candidate.jobId);



//     const candidateProfile = [
//       `Name: ${candidate.firstName} ${candidate.lastName || ''}`,
//       candidate.currentDesignation ? `Current Role: ${candidate.currentDesignation}` : null,
//       candidate.currentCompany ? `Current Company: ${candidate.currentCompany}` : null,
//       candidate.totalExperienceYears ? `Total Experience: ${candidate.totalExperienceYears} years` : null,
//       candidate.currentLocation ? `Location: ${candidate.currentLocation}` : null,
//       candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
//       candidate.education ? `Education: ${JSON.stringify(candidate.education)}` : null,
//       candidate.workExperience ? `Work Experience: ${JSON.stringify(candidate.workExperience)}` : null,
//       candidate.certifications?.length ? `Certifications: ${candidate.certifications.join(', ')}` : null,
//       candidate.languages?.length ? `Languages: ${candidate.languages.join(', ')}` : null,
//       candidate.expectedSalary ? `Expected Salary: ${candidate.expectedSalary}` : null,
//       candidate.noticePeriod ? `Notice Period: ${candidate.noticePeriod}` : null,
//       candidate.cvText ? `Resume/CV Content:\n${candidate.cvText.substring(0, 6000)}` : null,
//     ].filter(Boolean).join('\n');

//     const jobDetails2 = [];
//     if (job) {
//       jobDetails2.push(`Job Title: ${job.title}`);
//       if (job.department) jobDetails2.push(`Department: ${job.department}`);
//       if (job.description) jobDetails2.push(`Description: ${job.description.substring(0, 1500)}`);
//       if ((job as any).requiredSkills?.length) jobDetails2.push(`Required Skills: ${(job as any).requiredSkills.join(', ')}`);
//       if ((job as any).preferredSkills?.length) jobDetails2.push(`Preferred Skills: ${(job as any).preferredSkills.join(', ')}`);
//       if ((job as any).minExperienceYears) jobDetails2.push(`Minimum Experience: ${(job as any).minExperienceYears} years`);
//       if ((job as any).maxExperienceYears) jobDetails2.push(`Maximum Experience: ${(job as any).maxExperienceYears} years`);
//       if ((job as any).educationLevel) jobDetails2.push(`Education Level: ${(job as any).educationLevel}`);
//     }
//     const jobContext = jobDetails2.length > 0 ? jobDetails2.join('\n') : '';

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [

//         {
//   role: 'system',
//   content: `You are a strict ATS (Applicant Tracking System) evaluator.

// IMPORTANT RULES:
// - Score the candidate ONLY based on how well they match the TARGET JOB.
// - Do NOT give high scores for general quality if job requirements do not match.
// - If required skills or experience are missing, reduce the score significantly.
// - If experience is outside the job domain, penalize heavily.
// - 50-60 = partial match
// - 60-75 = moderate match
// - 75-85 = strong match
// - 85+ = near perfect match
// - Below 50 = poor match

// Respond ONLY with valid JSON in this format:
// {
//   "aiSummary": "3-4 sentence job-match focused summary",
//   "aiScore": <number 0-100>,
//   "aiStrengths": ["job-relevant strength 1", "job-relevant strength 2"],
//   "aiWeaknesses": ["job-mismatch 1", "job-mismatch 2"],
//   "aiRecommendation": "hire" | "consider" | "reject",
//   "aiSkillsScore": <number 0-100>,
//   "aiExperienceScore": <number 0-100>,
//   "aiEducationScore": <number 0-100>
// }`
// },
// //         {
// //           role: 'system',
// //           content: `You are an expert HR analyst. Analyze the candidate profile and provide a structured hiring assessment. Respond ONLY with valid JSON in this format:
// // {
// //   "aiSummary": "3-4 sentence professional summary of the candidate's suitability for the role",
// //   "aiScore": <number 0-100>,
// //   "aiStrengths": ["strength 1", "strength 2", "strength 3"],
// //   "aiWeaknesses": ["weakness 1", "weakness 2"],
// //   "aiRecommendation": "hire" | "consider" | "reject",
// //   "aiSkillsScore": <number 0-100>,
// //   "aiExperienceScore": <number 0-100>,
// //   "aiEducationScore": <number 0-100>
// // }`
// //         },
//         {
//           role: 'user',
//           content: `
// ${jobContext ? `TARGET JOB (Primary Evaluation Criteria):\n${jobContext}\n\n` : ''}

// CANDIDATE PROFILE:\n${candidateProfile}

// Evaluate STRICTLY against the TARGET JOB.
// If required skills or minimum experience are missing, score must not exceed 60.
// If domain does not match, score must not exceed 50.
// `
//         }
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const content = response.choices[0].message.content;
//     if (!content) {
//       return res.status(500).json({ error: 'Empty AI response' });
//     }

//     const aiResult = JSON.parse(content);

//     const updated = await HRStorage.updateCandidate(candidate.id, {
//       aiSummary: aiResult.aiSummary,
//       aiScore: aiResult.aiScore,
//       aiStrengths: aiResult.aiStrengths,
//       aiWeaknesses: aiResult.aiWeaknesses,
//       aiRecommendation: aiResult.aiRecommendation,
//       aiSkillsScore: aiResult.aiSkillsScore,
//       aiExperienceScore: aiResult.aiExperienceScore,
//       aiEducationScore: aiResult.aiEducationScore,
//       screenedAt: new Date(),
//       pipelineStage: candidate.pipelineStage === 'uploaded' ? 'ai_screened' : candidate.pipelineStage,
//     } as any);

//     if (candidate.pipelineStage === 'uploaded' && updated) {
//       await HRStorage.createPipelineHistory({
//         candidateId: candidate.id,
//         jobId: candidate.jobId,
//         userId: req.userId!,
//         fromStage: 'uploaded',
//         toStage: 'ai_screened',
//         reason: 'AI screening completed',
//         changedBy: 'ai',
//       });

//       if (aiResult.aiScore && job?.autoCallEnabled && job.callingStatus === 'running' && aiResult.aiScore >= (job.minAiScoreForCall || 60)) {
//         if (candidate.phone) {
//           await HRStorage.updateCandidate(candidate.id, { callStatus: 'pending' } as any);
//           console.log(`[HR AutoCaller] Candidate ${candidate.id} auto-queued for calling (score: ${aiResult.aiScore})`);
//         }
//       }
//     }

//     res.json(updated);
//   } catch (error: any) {
//     console.error('[HR] Error generating AI summary:', error);
//     res.status(500).json({ error: 'Failed to generate AI summary: ' + (error.message || 'Unknown error') });
//   }
// });

router.post('/candidates/:id/generate-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.id, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const openaiApiKey = await getOpenAIKeyForScreening();
    if (!openaiApiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const job = await HRStorage.getJob(candidate.jobId);

    // =========================
    // Build Candidate Profile
    // =========================

    const candidateProfile = [
      `Name: ${candidate.firstName} ${candidate.lastName || ''}`,
      candidate.currentDesignation ? `Current Role: ${candidate.currentDesignation}` : null,
      candidate.currentCompany ? `Current Company: ${candidate.currentCompany}` : null,
      candidate.totalExperienceYears ? `Total Experience: ${candidate.totalExperienceYears} years` : null,
      candidate.currentLocation ? `Location: ${candidate.currentLocation}` : null,
      candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
      candidate.education ? `Education: ${JSON.stringify(candidate.education)}` : null,
      candidate.workExperience ? `Work Experience: ${JSON.stringify(candidate.workExperience)}` : null,
      candidate.cvText ? `Resume:\n${candidate.cvText.substring(0, 6000)}` : null,
    ].filter(Boolean).join('\n');

    const jobDetails: string[] = [];

    if (job) {
      jobDetails.push(`Job Title: ${job.title}`);
      if (job.description) jobDetails.push(`Description: ${job.description.substring(0, 1500)}`);
      if ((job as any).requiredSkills?.length)
        jobDetails.push(`Required Skills: ${(job as any).requiredSkills.join(', ')}`);
      if ((job as any).minExperienceYears)
        jobDetails.push(`Minimum Experience: ${(job as any).minExperienceYears} years`);
    }

    const jobContext = jobDetails.join('\n');

    // =========================
    // OpenAI Call
    // =========================

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a STRICT ATS evaluator.

Score ONLY based on job match.

Rules:
- Missing required skills → heavy penalty
- Missing minimum experience → heavy penalty
- Domain mismatch → score must be below 50
- If strong match → 75+
- If moderate → 60-75
- If poor → below 50

Return ONLY valid JSON:
{
  "aiSummary": "...",
  "aiScore": number,
  "aiStrengths": [],
  "aiWeaknesses": [],
  "aiRecommendation": "hire" | "consider" | "reject",
  "aiSkillsScore": number,
  "aiExperienceScore": number,
  "aiEducationScore": number
}`
        },
        {
          role: 'user',
          content: `TARGET JOB:\n${jobContext}\n\nCANDIDATE:\n${candidateProfile}`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    const aiResult = JSON.parse(content);
    const aiScore = aiResult.aiScore || 0;

    // =========================
    // SAME LOGIC AS AUTOSCREEN
    // =========================

    const aiThreshold = job?.aiScreeningThreshold ?? 50;
    const shortlistThreshold = job?.shortlistingThreshold ?? 70;
    const interviewThreshold = job?.interviewScheduledThreshold ?? 85;

    let nextStage = candidate.pipelineStage;

    if (candidate.pipelineStage === 'uploaded' || candidate.pipelineStage === 'ai_screened') {

      if (aiScore < aiThreshold || aiResult.aiRecommendation === 'reject') {
        nextStage = 'rejected';
      }

      else if (aiScore >= interviewThreshold) {
        nextStage = 'interview_scheduled';
      }

      else if (aiScore >= shortlistThreshold) {
        nextStage = 'shortlisted';
      }

      else {
        nextStage = 'ai_screened';
      }
    }

    // =========================
    // Update Candidate
    // =========================

    const updated = await HRStorage.updateCandidate(candidate.id, {
      aiSummary: aiResult.aiSummary,
      aiScore,
      aiStrengths: aiResult.aiStrengths,
      aiWeaknesses: aiResult.aiWeaknesses,
      aiRecommendation: aiResult.aiRecommendation,
      aiSkillsScore: aiResult.aiSkillsScore,
      aiExperienceScore: aiResult.aiExperienceScore,
      aiEducationScore: aiResult.aiEducationScore,
      screenedAt: new Date(),
      pipelineStage: nextStage
    } as any);

    // =========================
    // Pipeline History
    // =========================

    if (candidate.pipelineStage !== nextStage) {
      await HRStorage.createPipelineHistory({
        candidateId: candidate.id,
        jobId: candidate.jobId,
        userId: req.userId!,
        fromStage: candidate.pipelineStage,
        toStage: nextStage,
        reason: `AI screening result: ${aiResult.aiRecommendation}`,
        changedBy: 'ai',
      });
    }

    // =========================
    // Auto Call Logic
    // =========================

    if (
      aiScore >= (job?.minAiScoreForCall || 60) &&
      job?.autoCallEnabled &&
      job?.callingStatus === 'running' &&
      candidate.phone
    ) {
      await HRStorage.updateCandidate(candidate.id, { callStatus: 'pending' } as any);
      console.log(`[HR AutoCaller] Candidate ${candidate.id} auto-queued (score: ${aiScore})`);
    }

    res.json(updated);

  } catch (error: any) {
    console.error('[HR] Error generating AI summary:', error);
    res.status(500).json({ error: 'Failed to generate AI summary: ' + (error.message || 'Unknown error') });
  }
});

// ============================================================
// Call Script Generation
// ============================================================

router.post('/jobs/:id/generate-call-script', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.id);
    if (!job || job.userId !== req.userId!) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const script = await generateCallScript(job);
    const updated = await HRStorage.updateJob(job.id, req.userId!, { callScript: script } as any);

    res.json({ script, job: updated });
  } catch (error: any) {
    console.error('[HR] Error generating call script:', error);
    res.status(500).json({ error: 'Failed to generate call script' });
  }
});

// ============================================================
// Auto-Calling Controls
// ============================================================

router.post('/jobs/:id/calling/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const caller = HRAutoCallerService.getInstance();
    const result = await caller.startJobCalling(req.params.id, req.userId!);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ message: 'Auto-calling started', status: 'running' });
  } catch (error: any) {
    console.error('[HR] Error starting auto-calling:', error);
    res.status(500).json({ error: 'Failed to start auto-calling' });
  }
});

router.post('/jobs/:id/calling/pause', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const caller = HRAutoCallerService.getInstance();
    await caller.pauseJobCalling(req.params.id, req.userId!);
    res.json({ message: 'Auto-calling paused', status: 'paused' });
  } catch (error: any) {
    console.error('[HR] Error pausing auto-calling:', error);
    res.status(500).json({ error: 'Failed to pause auto-calling' });
  }
});

router.post('/jobs/:id/calling/resume', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const caller = HRAutoCallerService.getInstance();
    const result = await caller.resumeJobCalling(req.params.id, req.userId!);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ message: 'Auto-calling resumed', status: 'running' });
  } catch (error: any) {
    console.error('[HR] Error resuming auto-calling:', error);
    res.status(500).json({ error: 'Failed to resume auto-calling' });
  }
});

router.post('/jobs/:id/calling/stop', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const caller = HRAutoCallerService.getInstance();
    await caller.stopJobCalling(req.params.id, req.userId!);
    res.json({ message: 'Auto-calling stopped', status: 'idle' });
  } catch (error: any) {
    console.error('[HR] Error stopping auto-calling:', error);
    res.status(500).json({ error: 'Failed to stop auto-calling' });
  }
});

router.get('/jobs/:id/calling/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.id);
    if (!job || job.userId !== req.userId!) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const stats = await HRStorage.getCallStats(job.id);
    res.json({
      ...stats,
      callingStatus: job.callingStatus,
      totalCalled: job.totalCalled,
      totalCallCompleted: job.totalCallCompleted,
      totalCallFailed: job.totalCallFailed,
    });
  } catch (error: any) {
    console.error('[HR] Error fetching calling stats:', error);
    res.status(500).json({ error: 'Failed to fetch calling stats' });
  }
});

// ============================================================
// Screen All Candidates
// ============================================================

router.post('/jobs/:jobId/screen-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.jobId);
    if (!job || job.userId !== req.userId!) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const allCandidates = await HRStorage.getCandidatesByJob(req.params.jobId);
    const unscreened = allCandidates.filter(c => c.pipelineStage === 'uploaded' && c.aiScore == null);

    if (unscreened.length === 0) {
      return res.json({ message: 'No unscreened candidates found', count: 0 });
    }

    const candidateIds = unscreened.map(c => c.id);
    const userId = req.userId!;

    res.json({
      message: `Screening ${candidateIds.length} candidates in background`,
      count: candidateIds.length,
      autoScreening: true,
    });

    setImmediate(() => {
      autoScreenCandidates(candidateIds, userId).catch(err => {
        console.error('[HR AutoScreen] Background screen-all failed:', err);
      });
    });
  } catch (error: any) {
    console.error('[HR] Error screening all candidates:', error);
    res.status(500).json({ error: 'Failed to screen candidates' });
  }
});

// ============================================================
// Webhook for call completion (internal, no auth)
// ============================================================

router.post('/webhooks/call-completed', async (req: Request, res: Response) => {
  try {
    const { callSid, conversationId, status, duration, transcript, recordingUrl } = req.body;

    let hrCall = null;
    if (callSid) {
      hrCall = await HRStorage.getHrCallByCallSid(callSid);
    }
    if (!hrCall && conversationId) {
      hrCall = await HRStorage.getHrCallByConversationId(conversationId);
    }

    if (!hrCall) {
      return res.status(200).json({ message: 'No matching HR call found' });
    }

    const job = await HRStorage.getJob(hrCall.jobId);
    const candidate = await HRStorage.getCandidate(hrCall.candidateId);

    if (!job || !candidate) {
      return res.status(200).json({ message: 'Job or candidate not found' });
    }

    const callEndTime = new Date();

    if (status === 'completed' && transcript) {
      let analysis = {
        summary: `Call completed with ${candidate.firstName}.`,
        score: 50,
        recommendation: 'hold' as string,
        evaluation: 'Manual review required.',
      };

      try {
        analysis = await processPostCallAnalysis(hrCall.id, transcript, job, candidate);
      } catch (e: any) {
        console.error('[HR Webhook] Post-call analysis error:', e.message);
      }

      await HRStorage.updateHrCall(hrCall.id, {
        status: 'completed',
        endedAt: callEndTime,
        duration: duration || 0,
        transcript,
        recordingUrl: recordingUrl || undefined,
        summary: analysis.summary,
        callScore: analysis.score,
        aiEvaluation: analysis.evaluation,
        aiRecommendation: analysis.recommendation,
      });

      const newStage = analysis.recommendation === 'reject' ? 'rejected' : 'interviewed';
      await HRStorage.updateCandidate(candidate.id, {
        callStatus: 'completed',
        callDuration: duration || 0,
        callTranscript: transcript,
        callSummary: analysis.summary,
        callScore: analysis.score,
        callRecordingUrl: recordingUrl,
        lastCallAt: callEndTime,
        pipelineStage: newStage,
        stageChangedAt: callEndTime,
        interviewScore: analysis.score,
        interviewCompletedAt: callEndTime,
      } as any);

      await HRStorage.createPipelineHistory({
        candidateId: candidate.id,
        jobId: job.id,
        userId: job.userId,
        fromStage: candidate.pipelineStage,
        toStage: newStage,
        reason: `AI phone screening ${analysis.recommendation}: ${analysis.summary}`,
        changedBy: 'ai',
        metadata: { aiScore: analysis.score, interviewScore: analysis.score, notes: analysis.evaluation },
      });

      await db.update(jobsTable).set({
        totalCallCompleted: sql`${jobsTable.totalCallCompleted} + 1`,
        totalCalled: sql`${jobsTable.totalCalled} + 1`,
        totalInterviewed: sql`${jobsTable.totalInterviewed} + 1`,
      }).where(eq(jobsTable.id, job.id));
    } else {
      const failedStatus = status || 'failed';
      await HRStorage.updateHrCall(hrCall.id, {
        status: failedStatus,
        endedAt: callEndTime,
        duration: duration || 0,
        errorMessage: failedStatus === 'no_answer' ? 'Candidate did not answer' :
          failedStatus === 'busy' ? 'Line was busy' : `Call ${failedStatus}`,
      });

      const shouldRetry = (candidate.callAttempts || 0) < (job.callRetryAttempts || 2);
      await HRStorage.updateCandidate(candidate.id, {
        callStatus: shouldRetry ? 'pending' : failedStatus,
        lastCallAt: callEndTime,
      } as any);

      if (!shouldRetry) {
        await db.update(jobsTable).set({
          totalCallFailed: sql`${jobsTable.totalCallFailed} + 1`,
          totalCalled: sql`${jobsTable.totalCalled} + 1`,
        }).where(eq(jobsTable.id, job.id));
      }
    }

    const caller = HRAutoCallerService.getInstance();
    caller.decrementActiveCallsForJob(hrCall.jobId);

    res.status(200).json({ message: 'Webhook processed', hrCallId: hrCall.id });
  } catch (error: any) {
    console.error('[HR] Webhook call-completed error:', error);
    res.status(200).json({ message: 'Error processing webhook' });
  }
});

// ============================================================
// HR Calls - Full call history
// ============================================================

router.get('/calls', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, status, provider, limit, offset } = req.query;
    const result = await HRStorage.getHrCallsByUser(req.userId!, {
      jobId: jobId as string,
      status: status as string,
      provider: provider as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[HR] Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

router.get('/calls/by-job/:jobId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await HRStorage.getJob(req.params.jobId);
    if (!job || job.userId !== req.userId!) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const calls = await HRStorage.getHrCallsByJob(req.params.jobId);
    res.json(calls);
  } catch (error: any) {
    console.error('[HR] Error fetching job calls:', error);
    res.status(500).json({ error: 'Failed to fetch job calls' });
  }
});

router.get('/calls/by-candidate/:candidateId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await verifyCandidateOwnership(req.params.candidateId, req.userId!);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const calls = await HRStorage.getHrCallsByCandidate(req.params.candidateId);
    res.json(calls);
  } catch (error: any) {
    console.error('[HR] Error fetching candidate calls:', error);
    res.status(500).json({ error: 'Failed to fetch candidate calls' });
  }
});

router.get('/calls/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const call = await HRStorage.getHrCall(req.params.id);
    if (!call || call.userId !== req.userId!) {
      return res.status(404).json({ error: 'Call not found' });
    }
    const candidate = await HRStorage.getCandidate(call.candidateId);
    const job = await HRStorage.getJob(call.jobId);
    res.json({ call, candidate, job });
  } catch (error: any) {
    console.error('[HR] Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

// ============================================================
// Webhook for call status updates (Twilio/Plivo)
// ============================================================

router.post('/calls/webhook/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
    const callSid = CallSid || req.body.call_uuid;
    const status = (CallStatus || req.body.call_status || '').toLowerCase();
    const duration = parseInt(CallDuration || req.body.duration || '0');
    const recordingUrl = RecordingUrl || req.body.recording_url;

    if (callSid) {
      const caller = HRAutoCallerService.getInstance();
      await caller.handleWebhookCallUpdate(callSid, status, {
        duration,
        recordingUrl,
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[HR] Webhook error:', error);
    res.status(200).send('OK');
  }
});

router.post('/calls/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { twilioOpenaiCalls: tocTable, contacts: contactsTable, campaigns: campaignsTable } = await import('@shared/schema');

    const userCalls = await HRStorage.getHrCallsByUser(req.userId!, { limit: 500, offset: 0 });
    const pendingCalls = userCalls.calls.filter((c: any) =>
      ['queued', 'initiated', 'ringing', 'in_progress', 'failed'].includes(c.status)
    );

    let synced = 0;
    let processed = 0;

    const terminalTocStatuses: Record<string, string> = {
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no_answer',
      'canceled': 'cancelled',
    };

    for (const hrCall of pendingCalls) {
      try {
        const matchingTocCalls = await db
          .select()
          .from(tocTable)
          .where(
            and(
              eq(tocTable.toNumber, hrCall.toNumber || ''),
              eq(tocTable.userId, req.userId!),
            )
          )
          .orderBy(sql`${tocTable.createdAt} DESC`)
          .limit(5);

        for (const toc of matchingTocCalls) {
          if (!toc.contactId || !toc.campaignId) continue;

          const [campaign] = await db.select().from(campaignsTable)
            .where(and(
              eq(campaignsTable.id, toc.campaignId),
              eq(campaignsTable.userId, req.userId!),
            )).limit(1);
          if (!campaign || (campaign.type !== 'hr_screening' && campaign.type !== 'hr_scheduled_call')) continue;

          const [contact] = await db.select().from(contactsTable)
            .where(eq(contactsTable.id, toc.contactId)).limit(1);
          if (!contact) continue;

          const cf = contact.customFields as Record<string, any> | null;
          if (cf?.hrCandidateId !== hrCall.candidateId || cf?.hrJobId !== hrCall.jobId) continue;

          const mappedStatus = terminalTocStatuses[toc.status || ''];
          if (!mappedStatus) continue;

          const updateData: any = {
            callSid: toc.twilioCallSid,
            status: mappedStatus,
            endedAt: new Date(),
          };
          if (toc.duration) updateData.duration = toc.duration;
          if (toc.recordingUrl) updateData.recordingUrl = toc.recordingUrl;
          if (toc.transcript) updateData.transcript = toc.transcript;

          await HRStorage.updateHrCall(hrCall.id, updateData);
          synced++;

          if (mappedStatus === 'completed' && toc.transcript) {
            const caller = HRAutoCallerService.getInstance();
            try {
              await caller.handleWebhookCallUpdate(toc.twilioCallSid!, 'completed', {
                duration: toc.duration || undefined,
                recordingUrl: toc.recordingUrl || undefined,
                transcript: toc.transcript || undefined,
              });
              processed++;
            } catch (procErr: any) {
              console.error(`[HR Sync] Error processing completed call ${hrCall.id}:`, procErr.message);
            }
          }
          break;
        }
      } catch (callErr: any) {
        console.error(`[HR Sync] Error syncing call ${hrCall.id}:`, callErr.message);
      }
    }

    res.json({
      success: true,
      message: `Synced ${synced} calls, processed ${processed} completed calls with AI analysis`,
      total: pendingCalls.length,
      synced,
      processed,
    });
  } catch (error: any) {
    console.error('[HR] Error syncing calls:', error);
    res.status(500).json({ error: 'Failed to sync calls' });
  }
});

export const publicHRRouter = Router();

publicHRRouter.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================
// T004: Hiring Widget — Branding Config
// GET /api/public/hr/widget/config?token=TOKEN
// ============================================================
publicHRRouter.get('/widget/config', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token query parameter is required' });

    const { websiteWidgets } = await import('@shared/schema');
    const [widget] = await db
      .select()
      .from(websiteWidgets)
      .where(eq(websiteWidgets.embedToken, token as string));

    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    res.json({
      companyName: widget.brandName || widget.name || 'Careers',
      primaryColor: widget.primaryColor || '#4f46e5',
      welcomeText: widget.welcomeMessage || 'Find your next opportunity',
      logoUrl: widget.iconUrl || null,
      launcherText: widget.launcherText || 'Apply Now',
      launcherPosition: widget.launcherPosition || 'bottom-right',
      allowSkipCV: widget.allowSkipCV !== false,
      launcherIcon: widget.launcherIcon || 'briefcase',
      instantCallEnabled: false,
    });
  } catch (error: any) {
    console.error('[HR Widget] Error fetching widget config:', error);
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// ============================================================
// T001: Hiring Widget — Real-time AI Screening
// POST /api/public/hr/widget/screen
// Accepts multipart: embedToken, firstName, lastName, email, phone, file (CV)
// ============================================================
publicHRRouter.post('/widget/screen', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { embedToken, firstName, lastName, email, phone } = req.body;

    if (!embedToken) return res.status(400).json({ error: 'embedToken is required' });
    if (!firstName || !email) return res.status(400).json({ error: 'firstName and email are required' });

    const { websiteWidgets, jobs: jobsTable } = await import('@shared/schema');

    const [widget] = await db
      .select()
      .from(websiteWidgets)
      .where(eq(websiteWidgets.embedToken, embedToken as string));

    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    const userId = widget.userId;

    const openJobs = await db
      .select()
      .from(jobsTable)
      .where(and(
        eq(jobsTable.userId, userId),
        eq(jobsTable.status, 'open'),
        eq(jobsTable.widgetEnabled, true)
      ));

    if (openJobs.length === 0) {
      return res.status(404).json({ error: 'No open positions available at this time' });
    }

    let cvFileName: string | undefined;
    let cvFilePath: string | undefined;
    let cvFileSize: number | undefined;
    let cvText = '';

    if (req.file) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const uuid = randomUUID();
      const savedFileName = `${uuid}_${req.file.originalname}`;
      cvFilePath = path.join(uploadsDir, savedFileName);
      fs.writeFileSync(cvFilePath, req.file.buffer);
      cvFileName = req.file.originalname;
      cvFileSize = req.file.size;
      try {
        cvText = await extractTextFromCV(req.file.buffer, req.file.originalname);
        console.log(`[HiringWidget] Extracted ${cvText.length} chars from CV`);
      } catch (e: any) {
        console.error('[HiringWidget] CV extraction error:', e.message);
      }
    }

    const openaiApiKey = await getOpenAIKeyForScreening();
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'AI screening is not available right now' });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const candidateProfile = [
      `Name: ${firstName} ${lastName || ''}`,
      phone ? `Phone: ${phone}` : null,
      `Email: ${email}`,
      cvText ? `Resume/CV Content:\n${cvText.substring(0, 8000)}` : null,
    ].filter(Boolean).join('\n');

    interface JobMatch {
      jobId: string;
      jobTitle: string;
      department: string | null;
      score: number;
      strengths: string[];
      gaps: string[];
      threshold: number;
      qualified: boolean;
      summary: string;
    }
    const matches: JobMatch[] = [];

    for (const job of openJobs) {
      try {
        const jobDetails = [
          `Job Title: ${job.title}`,
          job.department ? `Department: ${job.department}` : null,
          job.description ? `Description: ${job.description.substring(0, 1500)}` : null,
          (job as any).requiredSkills?.length ? `Required Skills: ${(job as any).requiredSkills.join(', ')}` : null,
          (job as any).preferredSkills?.length ? `Preferred Skills: ${(job as any).preferredSkills.join(', ')}` : null,
          (job as any).minExperienceYears ? `Minimum Experience: ${(job as any).minExperienceYears} years` : null,
          (job as any).educationLevel ? `Education Level: ${(job as any).educationLevel}` : null,
        ].filter(Boolean).join('\n');

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert HR analyst. Score this candidate's CV against the given job opening.
Respond ONLY with valid JSON:
{
  "score": <0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2"],
  "summary": "2-3 sentence summary of fit"
}`,
            },
            {
              role: 'user',
              content: `JOB:\n${jobDetails}\n\nCANDIDATE:\n${candidateProfile}`,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0].message.content;
        if (content) {
          const result = JSON.parse(content);
          const threshold = (job as any).minAiScoreForCall || 60;
          matches.push({
            jobId: job.id,
            jobTitle: job.title,
            department: job.department,
            score: result.score || 0,
            strengths: result.strengths || [],
            gaps: result.gaps || [],
            threshold,
            qualified: (result.score || 0) >= threshold,
            summary: result.summary || '',
          });
        }
      } catch (e: any) {
        console.error(`[HiringWidget] Scoring error for job ${job.id}:`, e.message);
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatch = matches[0];

    let candidateId: string | undefined;
    let applicationId: string | undefined;

    if (topMatch) {
      const normalizedPhone = phone ? normalizePhone(phone) : undefined;
      const candidate = await HRStorage.createOrMergeCandidate({
        userId,
        jobId: topMatch.jobId,
        firstName,
        lastName: lastName || undefined,
        email,
        phone: normalizedPhone,
        cvFileName,
        cvFilePath,
        cvFileSize,
        cvMimeType: req.file?.mimetype,
        cvText: cvText || undefined,
        pipelineStage: 'ai_screened',
        aiScore: topMatch.score,
        aiStrengths: topMatch.strengths,
        aiWeaknesses: topMatch.gaps,
        aiSummary: topMatch.summary,
        screenedAt: new Date(),
        source: 'widget',
      } as any);

      candidateId = candidate.id;

      const application = await HRStorage.createJobApplication({
        jobId: topMatch.jobId,
        candidateId: candidate.id,
        widgetId: widget.id,
        firstName,
        lastName: lastName || undefined,
        email,
        phone: normalizedPhone,
        cvFileName,
        cvFilePath,
        cvFileSize,
        status: 'ai_screened',
        visitorIp: req.ip,
      } as any);

      applicationId = application.id;
    }

    res.json({
      candidateId,
      applicationId,
      matches,
      topMatch,
    });
  } catch (error: any) {
    console.error('[HiringWidget] Screen error:', error);
    res.status(500).json({ error: 'Failed to screen CV' });
  }
});

// ============================================================
// Hiring Widget — List Active Jobs for Widget
// GET /api/public/hr/widget/jobs?token=TOKEN
// ============================================================
publicHRRouter.get('/widget/jobs', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const { websiteWidgets, jobs: jobsTable } = await import('@shared/schema');
    const [widget] = await db.select().from(websiteWidgets).where(eq(websiteWidgets.embedToken, token as string));
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    const activeJobs = await db
      .select({
        id: jobsTable.id,
        title: jobsTable.title,
        location: jobsTable.location,
        department: jobsTable.department,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        description: jobsTable.description,
        employmentType: jobsTable.employmentType,
      })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.userId, widget.userId),
          eq(jobsTable.status, 'open'),
          eq(jobsTable.widgetEnabled, true)
        )
      );

    const result = activeJobs.map((j: any) => ({
      ...j,
      description: j.description ? j.description.slice(0, 200) : '',
    }));

    res.json(result);
  } catch (error: any) {
    console.error('[HiringWidget] Jobs list error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ============================================================
// Hiring Widget — Schedule Interview + Confirmation Email
// POST /api/public/hr/widget/schedule
// ============================================================
publicHRRouter.post('/widget/schedule', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobId, applicationId, scheduledAt, phone, email, firstName, immediate, companyName } = req.body;

    if (!candidateId || !jobId) return res.status(400).json({ error: 'candidateId and jobId are required' });

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();

    const { jobs: jobsTable } = await import('@shared/schema');
    const [jobRecord] = await db.select({ userId: jobsTable.userId }).from(jobsTable).where(eq(jobsTable.id, jobId));
    if (!jobRecord) return res.status(404).json({ error: 'Job not found' });

    const session = await HRStorage.createInterviewSession({
      candidateId,
      jobId,
      userId: jobRecord.userId,
      status: 'scheduled',
      scheduledAt: scheduledDate,
      interviewType: 'phone',
    } as any);

    if (applicationId) {
      await HRStorage.updateJobApplication(applicationId, { status: 'interview_scheduled' } as any);
    }

    await HRStorage.updateCandidate(candidateId, { pipelineStage: 'interview_scheduled' } as any);

    let confirmationSent = false;
    if (email) {
      try {
        const formattedDate = scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const formattedTime = immediate ? 'Starting now' : scheduledDate.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit',
        });

        const subject = immediate
          ? `Your AI Interview is Starting Now`
          : `Interview Scheduled — ${formattedDate} at ${formattedTime}`;

        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
            <h2 style="margin-bottom:8px;color:#4f46e5">${immediate ? 'Your interview is starting now!' : 'Interview Confirmed!'}</h2>
            <p>Hi ${firstName || 'there'},</p>
            ${immediate
            ? `<p>Your AI phone interview is being connected right now. Please answer when you receive the call on <strong>${phone || 'your number'}</strong>.</p>`
            : `<p>Your interview has been scheduled for <strong>${formattedDate} at ${formattedTime}</strong>.</p>
                 <p>We will call you at <strong>${phone || 'your registered number'}</strong> at the scheduled time.</p>`
          }
            <p style="margin-top:16px">Make sure you are available and in a quiet place for the call.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
            <p style="font-size:12px;color:#6b7280">${companyName || 'The Hiring Team'}</p>
          </div>`;

        const result = await emailService.sendEmail(email, subject, html);
        confirmationSent = result.success;
      } catch (e: any) {
        console.error('[HiringWidget] Email confirmation error:', e.message);
      }
    }

    res.json({
      success: true,
      sessionId: session.id,
      scheduledAt: scheduledDate.toISOString(),
      confirmationSent,
    });
  } catch (error: any) {
    console.error('[HiringWidget] Schedule error:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// ============================================================
// POST /api/public/hr/widget/track — increment view/application counter
// ============================================================
publicHRRouter.post('/widget/track', async (req, res) => {
  try {
    const { token, event } = req.body;
    if (!token || !['view', 'application'].includes(event)) {
      return res.status(400).json({ error: 'token and event (view|application) required' });
    }
    const { websiteWidgets } = await import('@shared/schema');
    const { sql: sqlExpr } = await import('drizzle-orm');
    const [widget] = await db.select({ id: websiteWidgets.id }).from(websiteWidgets).where(eq(websiteWidgets.embedToken, token));
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    if (event === 'view') {
      await db.execute(sqlExpr`UPDATE website_widgets SET widget_views = widget_views + 1 WHERE id = ${widget.id}`);
    } else {
      await db.execute(sqlExpr`UPDATE website_widgets SET widget_applications = widget_applications + 1 WHERE id = ${widget.id}`);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false });
  }
});

publicHRRouter.post('/jobs/:jobId/apply', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, coverLetter } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ error: 'firstName and email are required' });
    }

    const job = await HRStorage.getJob(req.params.jobId);
    if (!job || job.status !== 'open') {
      return res.status(404).json({ error: 'Job not found or not accepting applications' });
    }

    let cvFileName: string | undefined;
    let cvFilePath: string | undefined;
    let cvFileSize: number | undefined;

    if (req.file) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const uuid = randomUUID();
      const savedFileName = `${uuid}_${req.file.originalname}`;
      cvFilePath = path.join(uploadsDir, savedFileName);
      fs.writeFileSync(cvFilePath, req.file.buffer);
      cvFileName = req.file.originalname;
      cvFileSize = req.file.size;
    }

    const application = await HRStorage.createJobApplication({
      jobId: req.params.jobId,
      firstName,
      lastName,
      email,
      phone,
      coverLetter,
      cvFileName,
      cvFilePath,
      cvFileSize,
      status: 'pending',
      visitorIp: req.ip,
    });

    res.json(application);
  } catch (error: any) {
    console.error('[HR] Error submitting job application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

publicHRRouter.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { embedToken } = req.query;

    if (!embedToken) {
      return res.status(400).json({ error: 'embedToken query parameter is required' });
    }

    const { db } = await import('../db');
    const { jobs: jobsTable, websiteWidgets } = await import('@shared/schema');
    const { eq, and } = await import('drizzle-orm');

    const [widget] = await db
      .select()
      .from(websiteWidgets)
      .where(eq(websiteWidgets.embedToken, embedToken as string));

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const openJobs = await db
      .select()
      .from(jobsTable)
      .where(and(
        eq(jobsTable.userId, widget.userId),
        eq(jobsTable.status, 'open'),
        eq(jobsTable.widgetEnabled, true)
      ));

    res.json(openJobs);
  } catch (error: any) {
    console.error('[HR] Error fetching public jobs:', error);
    res.status(500).json({ error: 'Failed to fetch public jobs' });
  }
});

export default router;
