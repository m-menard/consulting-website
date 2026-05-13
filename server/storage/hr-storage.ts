'use strict';
/**
 * ============================================================
 * HR Storage Interface
 * Isolated storage layer for HR hiring module
 * ============================================================
 */

import { db } from '../db';
import { jobs, candidates, cvUploads, interviewSessions, candidatePipelineHistory, jobApplications, candidateComments, hrCalls } from '@shared/schema';
import type { Job, InsertJob, Candidate, InsertCandidate, CvUpload, InsertCvUpload, InterviewSession, InsertInterviewSession, CandidatePipelineHistory, InsertCandidatePipelineHistory, JobApplication, InsertJobApplication, CandidateComment, InsertCandidateComment, HrCall, InsertHrCall } from '@shared/schema';
import { eq, and, desc, asc, sql, count, ilike, or, inArray, gte, lte, isNull, ne } from 'drizzle-orm';

export class HRStorage {
  // ============================================================
  // Jobs
  // ============================================================

  static async getJob(id: string): Promise<Job | null> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));

    return job || null;
  }

  static async getJobsByUser(userId: string): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt));
  }

  static async getJobsWithStats(userId: string): Promise<Array<Job & { candidateCount: number; stageCounts: Record<string, number> }>> {
    const userJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt));

    if (userJobs.length === 0) return [];

    const jobIds = userJobs.map(j => j.id);
    const allCandidates = await db
      .select({
        jobId: candidates.jobId,
        stage: candidates.pipelineStage,
        cnt: count(),
      })
      .from(candidates)
      .where(inArray(candidates.jobId, jobIds))
      .groupBy(candidates.jobId, candidates.pipelineStage);

    const statsMap = new Map<string, Record<string, number>>();
    const countMap = new Map<string, number>();
    for (const row of allCandidates) {
      if (!statsMap.has(row.jobId)) statsMap.set(row.jobId, {});
      statsMap.get(row.jobId)![row.stage] = row.cnt;
      countMap.set(row.jobId, (countMap.get(row.jobId) || 0) + row.cnt);
    }

    return userJobs.map(j => ({
      ...j,
      candidateCount: countMap.get(j.id) || 0,
      stageCounts: statsMap.get(j.id) || {},
    }));
  }

  static async createJob(data: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(data)
      .returning();

    return job;
  }

  static async updateJob(id: string, userId: string, data: Partial<InsertJob>): Promise<Job | null> {
    const [job] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
      .returning();

    return job || null;
  }

  static async incrementJobCounter(jobId: string, counter: 'totalCalled' | 'totalCallCompleted' | 'totalCallFailed' | 'totalCandidates' | 'totalScreened' | 'totalShortlisted' | 'totalInterviewed' | 'totalHired'): Promise<void> {
    const columnMap: Record<string, any> = {
      totalCalled: jobs.totalCalled,
      totalCallCompleted: jobs.totalCallCompleted,
      totalCallFailed: jobs.totalCallFailed,
      totalCandidates: jobs.totalCandidates,
      totalScreened: jobs.totalScreened,
      totalShortlisted: jobs.totalShortlisted,
      totalInterviewed: jobs.totalInterviewed,
      totalHired: jobs.totalHired,
    };
    const column = columnMap[counter];
    if (column) {
      await db.update(jobs).set({ [counter]: sql`${column} + 1` }).where(eq(jobs.id, jobId));
    }
  }

  static async deleteJob(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
      .returning();

    return result.length > 0;
  }

  static async getJobStats(jobId: string): Promise<Record<string, number>> {
    const results = await db
      .select({
        stage: candidates.pipelineStage,
        count: count(),
      })
      .from(candidates)
      .where(eq(candidates.jobId, jobId))
      .groupBy(candidates.pipelineStage);

    const stats: Record<string, number> = {};
    for (const row of results) {
      stats[row.stage] = row.count;
    }
    return stats;
  }

  // ============================================================
  // Candidates
  // ============================================================

  static async getCandidate(id: string): Promise<Candidate | null> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    return candidate || null;
  }

  static async getCandidatesCount (id:string) : Promise <number | null > {
    const [candidate] = await db
      .select({ count: count()})
      .from(candidates)
      .where(eq(candidates.userId, id));
      return candidate.count || 0 ;
  }

  static async getCandidatesByJob(jobId: string, stage?: string): Promise<Candidate[]> {
    const conditions = [eq(candidates.jobId, jobId)];

    if (stage) {
      conditions.push(eq(candidates.pipelineStage, stage));
    }

    return db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  static async getCandidatesByUser(
    userId: string,
    filters?: {
      jobId?: string;
      search?: string;
      aiScoreMin?: number;
      aiScoreMax?: number;
      experienceMin?: number;
      experienceMax?: number;
      source?: string;
      location?: string;
    }
  ): Promise<Candidate[]> {
    const conditions = [eq(candidates.userId, userId)];

    if (filters?.jobId) {
      conditions.push(eq(candidates.jobId, filters.jobId));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(candidates.firstName, searchTerm),
          ilike(candidates.lastName, searchTerm),
          ilike(candidates.email, searchTerm),
          ilike(candidates.phone, searchTerm),
          ilike(candidates.currentCompany, searchTerm),
          ilike(candidates.currentLocation, searchTerm),
          ilike(candidates.currentDesignation, searchTerm)
        )!
      );
    }

    if (filters?.aiScoreMin !== undefined) {
      conditions.push(gte(candidates.aiScore, filters.aiScoreMin));
    }

    if (filters?.aiScoreMax !== undefined) {
      conditions.push(lte(candidates.aiScore, filters.aiScoreMax));
    }

    if (filters?.experienceMin !== undefined) {
      conditions.push(gte(candidates.totalExperienceYears, filters.experienceMin));
    }

    if (filters?.experienceMax !== undefined) {
      conditions.push(lte(candidates.totalExperienceYears, filters.experienceMax));
    }

    if (filters?.source && filters.source !== 'all') {
      conditions.push(eq(candidates.source, filters.source));
    }

    if (filters?.location) {
      conditions.push(ilike(candidates.currentLocation, `%${filters.location.trim()}%`));
    }

    return db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  static async findCandidateByEmailOrPhone(jobId: string, email?: string | null, phone?: string | null): Promise<Candidate | null> {
    if (!email && !phone) return null;
    const conditions = [eq(candidates.jobId, jobId)];
    const matchConditions = [];
    if (email && !email.endsWith('@pending.review')) {
      matchConditions.push(eq(candidates.email, email));
    }
    if (phone) {
      matchConditions.push(eq(candidates.phone, phone));
    }
    if (matchConditions.length === 0) return null;
    conditions.push(or(...matchConditions)!);
    const [existing] = await db
      .select()
      .from(candidates)
      .where(and(...conditions));
    return existing || null;
  }

  static async findCandidateByPhoneInJob(jobId: string, phone: string): Promise<Candidate | null> {
    const [existing] = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.jobId, jobId), eq(candidates.phone, phone)));
    return existing || null;
  }

  static async findCandidateByNameInJob(jobId: string, firstName: string, lastName?: string | null): Promise<Candidate | null> {
    const normalizedFirst = firstName.trim().toLowerCase();
    if (!normalizedFirst) return null;
    const conditions = [
      eq(candidates.jobId, jobId),
      sql`lower(trim(${candidates.firstName})) = ${normalizedFirst}`,
    ];
    if (lastName && lastName.trim()) {
      conditions.push(sql`lower(trim(${candidates.lastName})) = ${lastName.trim().toLowerCase()}`);
    } else {
      conditions.push(sql`(${candidates.lastName} IS NULL OR trim(${candidates.lastName}) = '')`);
    }
    const [existing] = await db
      .select()
      .from(candidates)
      .where(and(...conditions));
    return existing || null;
  }

  static async findDuplicateCandidateInJob(jobId: string, phone: string | null | undefined, firstName: string, lastName?: string | null): Promise<{ duplicate: Candidate | null; reason: string }> {
    if (phone) {
      const byPhone = await this.findCandidateByPhoneInJob(jobId, phone);
      if (byPhone) {
        return { duplicate: byPhone, reason: 'Candidate with this phone number already exists for this job' };
      }
    }
    const byName = await this.findCandidateByNameInJob(jobId, firstName, lastName);
    if (byName) {
      return { duplicate: byName, reason: `Candidate "${firstName}${lastName ? ' ' + lastName : ''}" already exists for this job` };
    }
    return { duplicate: null, reason: '' };
  }

  static async findCandidatePhoneInOtherJobs(phone: string, currentJobId: string, userId: string): Promise<{ jobId: string; jobTitle: string }[]> {
    const results = await db
      .select({
        jobId: candidates.jobId,
        jobTitle: jobs.title,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(
        eq(candidates.phone, phone),
        eq(candidates.userId, userId),
        sql`${candidates.jobId} != ${currentJobId}`
      ));
    return results.map(r => ({ jobId: r.jobId, jobTitle: r.jobTitle }));
  }

  static async findCandidatesByPhoneForUser(phone: string, userId: string): Promise<Array<{
    candidate: Candidate;
    jobId: string;
    jobTitle: string;
    jobStatus: string;
  }>> {
    if (!phone || !phone.trim()) return [];
    const normalizedPhone = phone.replace(/[\s\-\(\)\.\+]/g, '');
    if (!normalizedPhone) return [];
    const phoneVariants = [
      normalizedPhone,
      '+' + normalizedPhone,
    ];
    if (phone.trim().startsWith('+')) {
      phoneVariants.push(phone.trim().replace(/[\s\-\(\)\.]/g, ''));
    }

    const results = await db
      .select({
        candidate: candidates,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(
        eq(candidates.userId, userId),
        inArray(candidates.phone, phoneVariants)
      ))
      .orderBy(desc(candidates.createdAt));

    return results.map(r => ({
      candidate: r.candidate,
      jobId: r.candidate.jobId,
      jobTitle: r.jobTitle,
      jobStatus: r.jobStatus,
    }));
  }

  static async createOrMergeCandidate(data: InsertCandidate): Promise<Candidate> {
    const existing = await this.findCandidateByEmailOrPhone(data.jobId, data.email, data.phone);
    if (existing) {
      const mergeData: Partial<InsertCandidate> = {};
      const isEffectivelyEmpty = (val: any): boolean => {
        if (val === null || val === undefined) return true;
        if (typeof val === 'string' && (val.trim() === '' || val.endsWith('@pending.review'))) return true;
        if (Array.isArray(val) && val.length === 0) return true;
        if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true;
        return false;
      };
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && key !== 'id' && key !== 'userId' && key !== 'jobId') {
          const existingVal = (existing as any)[key];
          if (isEffectivelyEmpty(existingVal)) {
            (mergeData as any)[key] = value;
          }
        }
      }
      if (data.cvFileName && !existing.cvFileName) {
        mergeData.cvFileName = data.cvFileName;
        mergeData.cvFilePath = data.cvFilePath;
        mergeData.cvFileSize = data.cvFileSize;
        mergeData.cvMimeType = data.cvMimeType;
        mergeData.cvText = data.cvText;
        mergeData.cvUploadId = data.cvUploadId;
      }
      if (Object.keys(mergeData).length > 0) {
        return (await this.updateCandidate(existing.id, mergeData))!;
      }
      return existing;
    }
    return this.createCandidate(data);
  }

  static async createCandidate(data: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(data)
      .returning();

    return candidate;
  }

  static async createCandidates(data: InsertCandidate[]): Promise<Candidate[]> {
    if (data.length === 0) return [];

    return db
      .insert(candidates)
      .values(data)
      .returning();
  }

  static async updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<Candidate | null> {
    const [candidate] = await db
      .update(candidates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();

    return candidate || null;
  }

  static async updateCandidateStage(id: string, userId: string, stage: string, notes?: string): Promise<Candidate | null> {
    const existing = await this.getCandidate(id);
    if (!existing) return null;

    const fromStage = existing.pipelineStage;

    const [candidate] = await db
      .update(candidates)
      .set({
        pipelineStage: stage,
        stageChangedAt: new Date(),
        stageNotes: notes || existing.stageNotes,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, id))
      .returning();

    if (candidate) {
      await db
        .insert(candidatePipelineHistory)
        .values({
          candidateId: id,
          jobId: existing.jobId,
          userId,
          fromStage,
          toStage: stage,
          reason: notes,
          changedBy: 'user',
          metadata: { notes },
        });
    }

    return candidate || null;
  }

  static async deleteCandidate(id: string): Promise<boolean> {
    const result = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning();

    return result.length > 0;
  }

  // ============================================================
  // CV Uploads
  // ============================================================

  static async getCvUpload(id: string): Promise<CvUpload | null> {
    const [upload] = await db
      .select()
      .from(cvUploads)
      .where(eq(cvUploads.id, id));

    return upload || null;
  }

  static async getCvUploadsByJob(jobId: string): Promise<CvUpload[]> {
    return db
      .select()
      .from(cvUploads)
      .where(eq(cvUploads.jobId, jobId))
      .orderBy(desc(cvUploads.createdAt));
  }

  static async createCvUpload(data: InsertCvUpload): Promise<CvUpload> {
    const [upload] = await db
      .insert(cvUploads)
      .values(data)
      .returning();

    return upload;
  }

  static async updateCvUpload(id: string, data: Partial<CvUpload>): Promise<CvUpload | null> {
    const [upload] = await db
      .update(cvUploads)
      .set(data)
      .where(eq(cvUploads.id, id))
      .returning();

    return upload || null;
  }

  // ============================================================
  // Interview Sessions
  // ============================================================

  static async getInterviewSession(id: string): Promise<InterviewSession | null> {
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.id, id));

    return session || null;
  }

  static async getInterviewsByJob(jobId: string): Promise<InterviewSession[]> {
    return db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.jobId, jobId))
      .orderBy(desc(interviewSessions.createdAt));
  }

  static async getInterviewsByCandidate(candidateId: string): Promise<InterviewSession[]> {
    return db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.candidateId, candidateId))
      .orderBy(desc(interviewSessions.createdAt));
  }

  static async createInterviewSession(data: InsertInterviewSession): Promise<InterviewSession> {
    const [session] = await db
      .insert(interviewSessions)
      .values(data)
      .returning();

    return session;
  }

  static async updateInterviewSession(id: string, data: Partial<InterviewSession>): Promise<InterviewSession | null> {
    const [session] = await db
      .update(interviewSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(interviewSessions.id, id))
      .returning();

    return session || null;
  }

  // ============================================================
  // Pipeline History
  // ============================================================

  static async getCandidatePipelineHistory(candidateId: string): Promise<CandidatePipelineHistory[]> {
    return db
      .select()
      .from(candidatePipelineHistory)
      .where(eq(candidatePipelineHistory.candidateId, candidateId))
      .orderBy(desc(candidatePipelineHistory.createdAt));
  }

  static async createPipelineHistory(data: InsertCandidatePipelineHistory): Promise<CandidatePipelineHistory> {
    const [history] = await db
      .insert(candidatePipelineHistory)
      .values(data)
      .returning();

    return history;
  }

  // ============================================================
  // Job Applications
  // ============================================================

  static async getJobApplications(jobId: string): Promise<JobApplication[]> {
    return db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.createdAt));
  }

  static async createJobApplication(data: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db
      .insert(jobApplications)
      .values(data)
      .returning();

    return application;
  }

  static async updateJobApplication(id: string, data: Partial<JobApplication>): Promise<JobApplication | null> {
    const [application] = await db
      .update(jobApplications)
      .set(data)
      .where(eq(jobApplications.id, id))
      .returning();

    return application || null;
  }

  // ============================================================
  // Candidate Comments
  // ============================================================

  static async getCommentsByCandidate(candidateId: string): Promise<CandidateComment[]> {
    return db
      .select()
      .from(candidateComments)
      .where(eq(candidateComments.candidateId, candidateId))
      .orderBy(desc(candidateComments.createdAt));
  }

  static async createComment(data: InsertCandidateComment): Promise<CandidateComment> {
    const [comment] = await db
      .insert(candidateComments)
      .values(data)
      .returning();

    return comment;
  }

  static async deleteComment(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(candidateComments)
      .where(and(eq(candidateComments.id, id), eq(candidateComments.userId, userId)))
      .returning();

    return result.length > 0;
  }

  // ============================================================
  // Dashboard Stats
  // ============================================================

  static async getHRDashboardStats(userId: string): Promise<{
    totalJobs: number;
    openJobs: number;
    totalCandidates: number;
    candidatesByStage: Record<string, number>;
    jobsByStatus: Record<string, number>;
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    hireRate: number;
    recentJobs: Array<{
      id: string;
      title: string;
      department: string | null;
      status: string;
      candidateCount: number;
      createdAt: string;
    }>;
    recentCandidates: Array<{
      id: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      location: string | null;
      employmentType: string | null;
      pipelineStage: string;
      jobTitle: string;
      createdAt: string;
    }>;
  }> {
    const userJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const openJobs = userJobs.filter(j => j.status === 'open').length;

    const jobsByStatus: Record<string, number> = {};
    for (const j of userJobs) {
      jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
    }

    const allCandidates = await db.select().from(candidates).where(eq(candidates.userId, userId));
    const totalCandidates = allCandidates.length;

    const candidatesByStage: Record<string, number> = {};
    for (const c of allCandidates) {
      const stage = c.pipelineStage || 'uploaded';
      candidatesByStage[stage] = (candidatesByStage[stage] || 0) + 1;
    }

    const jobIds = userJobs.map(j => j.id);
    let totalInterviews = 0;
    let completedInterviews = 0;
    if (jobIds.length > 0) {
      const interviews = await db.select().from(interviewSessions).where(inArray(interviewSessions.jobId, jobIds));
      totalInterviews = interviews.length;
      completedInterviews = interviews.filter(i => i.status === 'completed').length;
    }

    const scoredCandidates = allCandidates.filter(c => c.aiScore != null && c.aiScore > 0);
    const averageScore = scoredCandidates.length > 0
      ? scoredCandidates.reduce((sum, c) => sum + (c.aiScore || 0), 0) / scoredCandidates.length
      : 0;

    const hired = candidatesByStage['hired'] || 0;
    const hireRate = totalCandidates > 0 ? (hired / totalCandidates) * 100 : 0;

    const jobMap = new Map(userJobs.map(j => [j.id, j]));

    const recentJobs = userJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        status: j.status,
        candidateCount: allCandidates.filter(c => c.jobId === j.id).length,
        createdAt: j.createdAt.toISOString(),
      }));

    const recentCandidates = allCandidates
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(c => {
        const job = jobMap.get(c.jobId);
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          location: job?.location || null,
          employmentType: job?.employmentType || null,
          pipelineStage: c.pipelineStage,
          jobTitle: job?.title || 'Unknown',
          createdAt: c.createdAt.toISOString(),
        };
      });

    return {
      totalJobs: userJobs.length,
      openJobs,
      totalCandidates,
      candidatesByStage,
      jobsByStatus,
      totalInterviews,
      completedInterviews,
      averageScore,
      hireRate,
      recentJobs,
      recentCandidates,
    };
  }

  // ============================================================
  // HR Calls
  // ============================================================

  static async createHrCall(data: InsertHrCall): Promise<HrCall> {
    const [call] = await db
      .insert(hrCalls)
      .values(data)
      .returning();
    return call;
  }

  static async updateHrCall(id: string, data: Partial<HrCall>): Promise<HrCall | null> {
    const [call] = await db
      .update(hrCalls)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(hrCalls.id, id))
      .returning();
    return call || null;
  }

  static async getHrCall(id: string): Promise<HrCall | null> {
    const [call] = await db
      .select()
      .from(hrCalls)
      .where(eq(hrCalls.id, id));
    return call || null;
  }

  static async getHrCallByCallSid(callSid: string): Promise<HrCall | null> {
    const [call] = await db
      .select()
      .from(hrCalls)
      .where(eq(hrCalls.callSid, callSid));
    return call || null;
  }

  static async getHrCallByConversationId(conversationId: string): Promise<HrCall | null> {
    const [call] = await db
      .select()
      .from(hrCalls)
      .where(
        sql`${hrCalls.metadata}->>'conversationId' = ${conversationId}`
      );
    return call || null;
  }

  static async getHrCallsByUser(userId: string, filters?: {
    jobId?: string;
    status?: string;
    provider?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ calls: HrCall[]; total: number }> {
    const conditions = [eq(hrCalls.userId, userId)];
    if (filters?.jobId) conditions.push(eq(hrCalls.jobId, filters.jobId));
    if (filters?.status) conditions.push(eq(hrCalls.status, filters.status));
    if (filters?.provider) conditions.push(eq(hrCalls.provider, filters.provider));

    const [{ total }] = await db
      .select({ total: count() })
      .from(hrCalls)
      .where(and(...conditions));

    const callResults = await db
      .select()
      .from(hrCalls)
      .where(and(...conditions))
      .orderBy(desc(hrCalls.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return { calls: callResults, total };
  }

  static async getHrCallsByJob(jobId: string): Promise<HrCall[]> {
    return db
      .select()
      .from(hrCalls)
      .where(eq(hrCalls.jobId, jobId))
      .orderBy(desc(hrCalls.createdAt));
  }

  static async getHrCallsByCandidate(candidateId: string, jobId?: string): Promise<HrCall[]> {
    const conditions = [eq(hrCalls.candidateId, candidateId)];
    if (jobId) conditions.push(eq(hrCalls.jobId, jobId));
    return db
      .select()
      .from(hrCalls)
      .where(and(...conditions))
      .orderBy(desc(hrCalls.createdAt));
  }



//   static async getCallReadyCandidates(jobId: string, minScore: number): Promise<Candidate[]> {

//   console.log("🔍 Fetching candidates for job:", jobId);
//   console.log("🎯 Min Score Required:", minScore);

//   // Step 1: Saare candidates fetch karo (debug ke liye)
//   const allCandidates = await db
//     .select()
//     .from(candidates)
//     .where(eq(candidates.jobId, jobId));

//   console.log("📦 Total Candidates Found:", allCandidates.length);

//   // Step 2: Har candidate ka status log karo
//   allCandidates.forEach(c => {
//     console.log("👤 Candidate:", {
//       id: c.id,
//       name: c.firstName,
//       pipelineStage: c.pipelineStage,
//       aiScore: c.aiScore,
//       callStatus: c.callStatus,
//       isEligible:
//         // c.pipelineStage === 'ai_screened' &&
//         c.aiScore >= minScore &&
//         (c.callStatus === 'pending' || c.callStatus === null)
//     });
//   });

//   // Step 3: Actual filtered query
//   const filteredCandidates = await db
//     .select()
//     .from(candidates)
//     .where(and(
//       eq(candidates.jobId, jobId),
//       eq(candidates.pipelineStage, 'ai_screened'),
//       gte(candidates.aiScore, minScore),
//       or(
//         eq(candidates.callStatus, 'pending'),
//         isNull(candidates.callStatus)
//       )
//     ))
//     .orderBy(desc(candidates.aiScore));

//   console.log("✅ Eligible Candidates:", filteredCandidates.length);

//   return filteredCandidates;
// }


static async getCallReadyCandidates(jobId: string, minScore: number): Promise<Candidate[]> {
  console.log("🔍 Fetching candidates for job:", jobId);
  console.log("🎯 Min Score Required:", minScore);

  // Step 1: Fetch all candidates for debug
  const allCandidates = await db
    .select()
    .from(candidates)
    .where(eq(candidates.jobId, jobId));

  console.log("📦 Total Candidates Found:", allCandidates.length);

  // Step 2: Log each candidate and eligibility based on updated logic
  allCandidates.forEach(c => {
    const isEligible =
      ['ai_screened', 'call_ready'].includes(c.pipelineStage) && // Include shortlisted
      c.aiScore >= minScore &&
      (c.callStatus === 'pending' || c.callStatus === null || ['failed', 'no_answer', 'busy'].includes(c.callStatus || ''));

    console.log("👤 Candidate:", {
      id: c.id,
      name: c.firstName,
      pipelineStage: c.pipelineStage,
      aiScore: c.aiScore,
      callStatus: c.callStatus,
      isEligible
    });
  });

  // Step 3: Filter eligible candidates from DB
  // const filteredCandidates = await db
  //   .select()
  //   .from(candidates)
  //   .where(and(
  //     eq(candidates.jobId, jobId),
  //     or(
  //       eq(candidates.pipelineStage, 'ai_screened'),

  //       eq(candidates.pipelineStage, 'shortlisted') // Include shortlisted
  //     ),
  //     gte(candidates.aiScore, minScore),
  //     or(
  //       // eq(candidates.callStatus, 'queued'),
  //       isNull(candidates.callStatus)
  //     )
  //   ))
  //   .orderBy(desc(candidates.aiScore));


  // Step 3: Actual filtered query
const filteredCandidates = await db
   .select()
  .from(candidates)
  .where(and(
    eq(candidates.jobId, jobId),

    or(
      eq(candidates.pipelineStage, 'ai_screened'),
      eq(candidates.pipelineStage, 'call_ready')
    ),

    gte(candidates.aiScore, minScore),

    or(
      eq(candidates.callStatus, 'pending'),
      isNull(candidates.callStatus),
      eq(candidates.callStatus, 'failed'),
      eq(candidates.callStatus, 'no_answer'),
      eq(candidates.callStatus, 'busy')
    )
  ))
  .orderBy(desc(candidates.aiScore));

  console.log("✅ Eligible Candidates:", filteredCandidates.length);

  return filteredCandidates;
}

  static async getCallReadyCandidatesold(jobId: string, minScore: number): Promise<Candidate[]> {
    return db
      .select()
      .from(candidates)
      .where(and(
        eq(candidates.jobId, jobId),
        eq(candidates.pipelineStage, 'ai_screened'),
        gte(candidates.aiScore, minScore),
        or(
          eq(candidates.callStatus, 'pending'),
          isNull(candidates.callStatus)
        )
      ))
      .orderBy(desc(candidates.aiScore));
  }

  static async getActiveCallingJobs(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.autoCallEnabled, true),
        eq(jobs.callingStatus, 'running'),
        eq(jobs.status, 'open')
      ));
  }

  static async getCallStats(jobId: string): Promise<{
    totalQueued: number;
    totalCalling: number;
    totalCompleted: number;
    totalFailed: number;
    totalNoAnswer: number;
    totalPending: number;
  }> {
    const results = await db
      .select({
        status: candidates.callStatus,
        cnt: count(),
      })
      .from(candidates)
      .where(eq(candidates.jobId, jobId))
      .groupBy(candidates.callStatus);

    const stats = {
      totalQueued: 0,
      totalCalling: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalNoAnswer: 0,
      totalPending: 0,
    };

    for (const row of results) {
      switch (row.status) {
        case 'queued': stats.totalQueued = row.cnt; break;
        case 'calling': stats.totalCalling = row.cnt; break;
        case 'completed': stats.totalCompleted = row.cnt; break;
        case 'failed': stats.totalFailed = row.cnt; break;
        case 'no_answer': case 'busy': case 'unreachable': stats.totalNoAnswer += row.cnt; break;
        case 'pending': case null: stats.totalPending = row.cnt; break;
      }
    }
    return stats;
  }
}
