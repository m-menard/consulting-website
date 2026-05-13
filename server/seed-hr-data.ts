import { db } from "./db";
import { jobs, candidates, interviewSessions, candidatePipelineHistory } from "@shared/schema";
import { sql } from "drizzle-orm";

const HR_SEED_JOBS = [
  {
    title: "Senior Software Engineer",
    description: "We are looking for an experienced software engineer to lead backend development for our core platform. You will design and implement scalable APIs, mentor junior developers, and drive technical decisions across the engineering team.",
    department: "Engineering",
    location: "San Francisco, CA",
    locationType: "hybrid" as const,
    employmentType: "full_time" as const,
    experienceLevel: "senior" as const,
    salaryMin: "140000",
    salaryMax: "200000",
    salaryCurrency: "USD",
    requiredSkills: ["TypeScript", "Node.js", "PostgreSQL", "REST APIs", "System Design"],
    preferredSkills: ["React", "Docker", "AWS", "GraphQL"],
    minExperienceYears: 5,
    maxExperienceYears: 12,
    educationLevel: "bachelors" as const,
    status: "open" as const,
    shortlistThreshold: 75,
  },
  {
    title: "Product Manager",
    description: "Join our product team to define and execute the roadmap for our AI-powered hiring platform. You will work closely with engineering, design, and customers to prioritize features, analyze market trends, and deliver impactful product improvements.",
    department: "Product",
    location: "New York, NY",
    locationType: "remote" as const,
    employmentType: "full_time" as const,
    experienceLevel: "mid" as const,
    salaryMin: "120000",
    salaryMax: "170000",
    salaryCurrency: "USD",
    requiredSkills: ["Product Strategy", "Agile", "User Research", "Data Analysis", "Roadmap Planning"],
    preferredSkills: ["SQL", "Figma", "A/B Testing", "SaaS Experience"],
    minExperienceYears: 3,
    maxExperienceYears: 8,
    educationLevel: "bachelors" as const,
    status: "open" as const,
    shortlistThreshold: 70,
  },
  {
    title: "UX Designer",
    description: "Design intuitive, accessible interfaces for our HR SaaS platform. You will conduct user research, create wireframes and prototypes, build and maintain our design system, and collaborate with engineers to deliver polished user experiences.",
    department: "Design",
    location: "Austin, TX",
    locationType: "onsite" as const,
    employmentType: "full_time" as const,
    experienceLevel: "mid" as const,
    salaryMin: "95000",
    salaryMax: "140000",
    salaryCurrency: "USD",
    requiredSkills: ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems"],
    preferredSkills: ["HTML/CSS", "Motion Design", "Accessibility", "Usability Testing"],
    minExperienceYears: 3,
    maxExperienceYears: 7,
    educationLevel: "bachelors" as const,
    status: "open" as const,
    shortlistThreshold: 70,
  },
  {
    title: "Data Analyst",
    description: "Analyze hiring data and candidate metrics to provide actionable insights for our customers. You will build dashboards, identify trends in recruitment pipelines, and help optimize AI screening algorithms through data-driven recommendations.",
    department: "Analytics",
    location: "Remote",
    locationType: "remote" as const,
    employmentType: "full_time" as const,
    experienceLevel: "entry" as const,
    salaryMin: "70000",
    salaryMax: "100000",
    salaryCurrency: "USD",
    requiredSkills: ["SQL", "Python", "Data Visualization", "Excel", "Statistics"],
    preferredSkills: ["Tableau", "R", "Machine Learning", "ETL Pipelines"],
    minExperienceYears: 1,
    maxExperienceYears: 4,
    educationLevel: "bachelors" as const,
    status: "open" as const,
    shortlistThreshold: 65,
  },
];

interface SeedCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentDesignation: string;
  totalExperienceYears: number;
  skills: string[];
  education: { degree: string; institution: string; field: string; endYear: number }[];
  aiScore: number;
  aiSummary: string;
  aiStrengths: string[];
  aiWeaknesses: string[];
  aiRecommendation: string;
  pipelineStage: string;
  source: string;
  jobIndex: number;
}

const HR_SEED_CANDIDATES: SeedCandidate[] = [
  {
    firstName: "Priya", lastName: "Sharma", email: "priya.sharma@email.com", phone: "+14155551001",
    currentCompany: "TechCorp Inc.", currentDesignation: "Software Engineer",
    totalExperienceYears: 7,
    skills: ["TypeScript", "Node.js", "PostgreSQL", "React", "AWS"],
    education: [{ degree: "M.S.", institution: "Stanford University", field: "Computer Science", endYear: 2018 }],
    aiScore: 92, aiSummary: "Strong full-stack engineer with 7 years of experience. Excellent match for required tech stack.", aiStrengths: ["Deep TypeScript expertise", "System design experience", "Strong academic background"], aiWeaknesses: ["No GraphQL experience"], aiRecommendation: "advance",
    pipelineStage: "interviewed", source: "linkedin", jobIndex: 0,
  },
  {
    firstName: "James", lastName: "Chen", email: "james.chen@email.com", phone: "+14155551002",
    currentCompany: "ScaleUp Labs", currentDesignation: "Senior Backend Developer",
    totalExperienceYears: 9,
    skills: ["Node.js", "Python", "PostgreSQL", "Docker", "Kubernetes"],
    education: [{ degree: "B.S.", institution: "UC Berkeley", field: "Computer Science", endYear: 2016 }],
    aiScore: 88, aiSummary: "Seasoned backend developer with strong infrastructure skills. Good culture fit.", aiStrengths: ["Extensive backend experience", "DevOps proficiency", "Leadership mentoring"], aiWeaknesses: ["TypeScript is secondary skill", "No React experience"], aiRecommendation: "advance",
    pipelineStage: "shortlisted", source: "referral", jobIndex: 0,
  },
  {
    firstName: "Maria", lastName: "Gonzalez", email: "maria.g@email.com", phone: "+14155551003",
    currentCompany: "DataFlow Systems", currentDesignation: "Full Stack Developer",
    totalExperienceYears: 4,
    skills: ["JavaScript", "React", "Node.js", "MongoDB"],
    education: [{ degree: "B.S.", institution: "MIT", field: "Software Engineering", endYear: 2020 }],
    aiScore: 65, aiSummary: "Promising mid-level developer. Lacks PostgreSQL experience but shows strong learning ability.", aiStrengths: ["React proficiency", "Strong academic foundation"], aiWeaknesses: ["Below required experience years", "No PostgreSQL", "No TypeScript"], aiRecommendation: "hold",
    pipelineStage: "ai_screened", source: "indeed", jobIndex: 0,
  },
  {
    firstName: "Sarah", lastName: "Williams", email: "sarah.w@email.com", phone: "+14155551004",
    currentCompany: "ProductMinds", currentDesignation: "Senior Product Manager",
    totalExperienceYears: 6,
    skills: ["Product Strategy", "Agile", "User Research", "SQL", "A/B Testing"],
    education: [{ degree: "MBA", institution: "Wharton School", field: "Business Administration", endYear: 2019 }],
    aiScore: 95, aiSummary: "Exceptional PM candidate with SaaS background and strong analytical skills. Perfect fit.", aiStrengths: ["SaaS product experience", "Data-driven approach", "MBA from top school"], aiWeaknesses: ["No AI/ML product experience"], aiRecommendation: "advance",
    pipelineStage: "hired", source: "linkedin", jobIndex: 1,
  },
  {
    firstName: "David", lastName: "Kim", email: "david.kim@email.com", phone: "+14155551005",
    currentCompany: "InnoTech Solutions", currentDesignation: "Product Owner",
    totalExperienceYears: 4,
    skills: ["Agile", "Roadmap Planning", "JIRA", "Data Analysis", "Stakeholder Management"],
    education: [{ degree: "B.S.", institution: "Georgia Tech", field: "Industrial Engineering", endYear: 2020 }],
    aiScore: 78, aiSummary: "Solid PM candidate with good Agile experience. Could grow into the role quickly.", aiStrengths: ["Strong Agile methodology", "Good stakeholder management"], aiWeaknesses: ["Limited user research experience", "No SaaS background"], aiRecommendation: "advance",
    pipelineStage: "interview_scheduled", source: "glassdoor", jobIndex: 1,
  },
  {
    firstName: "Emma", lastName: "Taylor", email: "emma.t@email.com", phone: "+14155551006",
    currentCompany: "DesignCraft Studio", currentDesignation: "UI/UX Designer",
    totalExperienceYears: 5,
    skills: ["Figma", "User Research", "Wireframing", "Design Systems", "Usability Testing"],
    education: [{ degree: "B.F.A.", institution: "Rhode Island School of Design", field: "Graphic Design", endYear: 2019 }],
    aiScore: 91, aiSummary: "Outstanding designer with comprehensive UX skill set and SaaS portfolio.", aiStrengths: ["Complete UX skill set", "Design system experience", "Strong portfolio"], aiWeaknesses: ["No coding skills"], aiRecommendation: "advance",
    pipelineStage: "shortlisted", source: "company_website", jobIndex: 2,
  },
  {
    firstName: "Alex", lastName: "Rivera", email: "alex.r@email.com", phone: "+14155551007",
    currentCompany: "PixelPerfect Agency", currentDesignation: "Visual Designer",
    totalExperienceYears: 3,
    skills: ["Figma", "Sketch", "Prototyping", "Motion Design", "Adobe Creative Suite"],
    education: [{ degree: "B.A.", institution: "Parsons School of Design", field: "Communication Design", endYear: 2021 }],
    aiScore: 72, aiSummary: "Creative designer with good visual skills. Needs more UX research experience.", aiStrengths: ["Strong visual design", "Motion design skills"], aiWeaknesses: ["Limited user research", "No design system experience"], aiRecommendation: "hold",
    pipelineStage: "ai_screened", source: "referral", jobIndex: 2,
  },
  {
    firstName: "Michael", lastName: "Park", email: "michael.p@email.com", phone: "+14155551008",
    currentCompany: "Freelance", currentDesignation: "UX Consultant",
    totalExperienceYears: 2,
    skills: ["Figma", "Wireframing", "User Interviews"],
    education: [{ degree: "Certificate", institution: "General Assembly", field: "UX Design", endYear: 2022 }],
    aiScore: 45, aiSummary: "Entry-level candidate with bootcamp background. Insufficient experience for mid-level role.", aiStrengths: ["Enthusiasm for UX"], aiWeaknesses: ["Below required experience", "No formal degree", "Limited portfolio"], aiRecommendation: "reject",
    pipelineStage: "rejected", source: "indeed", jobIndex: 2,
  },
  {
    firstName: "Aisha", lastName: "Patel", email: "aisha.p@email.com", phone: "+14155551009",
    currentCompany: "InsightData Co.", currentDesignation: "Junior Data Analyst",
    totalExperienceYears: 2,
    skills: ["SQL", "Python", "Tableau", "Excel", "Statistics"],
    education: [{ degree: "B.S.", institution: "University of Michigan", field: "Statistics", endYear: 2022 }],
    aiScore: 85, aiSummary: "Strong analytical foundation with relevant tools experience. Great entry-level candidate.", aiStrengths: ["Solid statistics background", "Tableau proficiency", "Python skills"], aiWeaknesses: ["Limited professional experience"], aiRecommendation: "advance",
    pipelineStage: "interview_scheduled", source: "linkedin", jobIndex: 3,
  },
  {
    firstName: "Tom", lastName: "Anderson", email: "tom.a@email.com", phone: "+14155551010",
    currentCompany: "RetailMetrics", currentDesignation: "Business Analyst",
    totalExperienceYears: 3,
    skills: ["SQL", "Excel", "Data Visualization", "R", "Power BI"],
    education: [{ degree: "B.S.", institution: "University of Texas", field: "Mathematics", endYear: 2021 }],
    aiScore: 76, aiSummary: "Good analytical skills with relevant experience. Missing Python but has R as alternative.", aiStrengths: ["Strong SQL skills", "Visualization experience"], aiWeaknesses: ["No Python experience", "No Tableau"], aiRecommendation: "advance",
    pipelineStage: "shortlisted", source: "glassdoor", jobIndex: 3,
  },
  {
    firstName: "Lisa", lastName: "Zhang", email: "lisa.z@email.com", phone: "+14155551011",
    currentCompany: "Fresh Graduate", currentDesignation: "Research Assistant",
    totalExperienceYears: 1,
    skills: ["Python", "SQL", "Statistics", "Machine Learning"],
    education: [{ degree: "M.S.", institution: "Columbia University", field: "Data Science", endYear: 2024 }],
    aiScore: 80, aiSummary: "Recent grad with strong academic credentials and ML knowledge. Good potential.", aiStrengths: ["Advanced degree", "ML knowledge", "Python proficiency"], aiWeaknesses: ["Minimal industry experience", "No visualization tool proficiency"], aiRecommendation: "advance",
    pipelineStage: "ai_screened", source: "company_website", jobIndex: 3,
  },
  {
    firstName: "Robert", lastName: "Johnson", email: "robert.j@email.com", phone: "+14155551012",
    currentCompany: "BigData Corp", currentDesignation: "Data Engineer",
    totalExperienceYears: 5,
    skills: ["SQL", "Python", "ETL Pipelines", "Spark", "Data Warehousing"],
    education: [{ degree: "B.S.", institution: "Carnegie Mellon", field: "Information Systems", endYear: 2019 }],
    aiScore: 58, aiSummary: "Overqualified data engineer, more infrastructure-focused than analytics. Misaligned with role.", aiStrengths: ["Strong technical skills", "ETL expertise"], aiWeaknesses: ["Data engineering focus, not analytics", "No visualization skills", "Overqualified for entry level"], aiRecommendation: "hold",
    pipelineStage: "uploaded", source: "indeed", jobIndex: 3,
  },
];

export async function seedHRData(userId?: string) {
  console.log("\n🏢 Seeding HR Sample Data...");

  const targetUserId = userId || "system";

  const existingJobs = await db.select().from(jobs).where(sql`user_id = ${targetUserId}`);
  if (existingJobs.length > 0) {
    console.log(`   ⚠️  Found ${existingJobs.length} existing jobs. Skipping HR seed.`);
    return;
  }

  const insertedJobs = await db.insert(jobs).values(
    HR_SEED_JOBS.map(job => ({
      ...job,
      userId: targetUserId,
      autoScreenEnabled: true,
      screeningCriteria: { skillsWeight: 40, experienceWeight: 35, educationWeight: 25 },
      interviewQuestions: [],
      publishedAt: new Date(),
    }))
  ).returning();

  console.log(`   ✅ Created ${insertedJobs.length} sample jobs`);

  const now = new Date();
  const candidateValues = HR_SEED_CANDIDATES.map(c => ({
    userId: targetUserId,
    jobId: insertedJobs[c.jobIndex].id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    currentCompany: c.currentCompany,
    currentDesignation: c.currentDesignation,
    totalExperienceYears: c.totalExperienceYears,
    skills: c.skills,
    education: c.education,
    aiScore: c.aiScore,
    aiSummary: c.aiSummary,
    aiStrengths: c.aiStrengths,
    aiWeaknesses: c.aiWeaknesses,
    aiRecommendation: c.aiRecommendation,
    pipelineStage: c.pipelineStage,
    source: c.source,
    screenedAt: c.pipelineStage !== "uploaded" ? now : null,
    stageChangedAt: now,
  }));

  const insertedCandidates = await db.insert(candidates).values(candidateValues).returning();
  console.log(`   ✅ Created ${insertedCandidates.length} sample candidates`);

  const pipelineEntries: {
    candidateId: string;
    jobId: string;
    userId: string;
    fromStage: string | null;
    toStage: string;
    changedBy: string;
    reason: string;
    metadata: { aiScore?: number; notes?: string };
  }[] = [];

  for (const candidate of insertedCandidates) {
    const seedCandidate = HR_SEED_CANDIDATES.find(c => c.email === candidate.email);
    if (!seedCandidate) continue;

    pipelineEntries.push({
      candidateId: candidate.id,
      jobId: candidate.jobId,
      userId: targetUserId,
      fromStage: null,
      toStage: "uploaded",
      changedBy: "system",
      reason: `CV uploaded from ${seedCandidate.source}`,
      metadata: {},
    });

    const stageProgression: Record<string, string[]> = {
      ai_screened: ["ai_screened"],
      shortlisted: ["ai_screened", "shortlisted"],
      interview_scheduled: ["ai_screened", "shortlisted", "interview_scheduled"],
      interviewed: ["ai_screened", "shortlisted", "interview_scheduled", "interviewed"],
      hired: ["ai_screened", "shortlisted", "interview_scheduled", "interviewed", "hired"],
      rejected: ["ai_screened", "rejected"],
    };

    const stages = stageProgression[seedCandidate.pipelineStage] || [];
    let prevStage = "uploaded";
    for (const stage of stages) {
      pipelineEntries.push({
        candidateId: candidate.id,
        jobId: candidate.jobId,
        userId: targetUserId,
        fromStage: prevStage,
        toStage: stage,
        changedBy: stage === "ai_screened" ? "ai" : "system",
        reason: stage === "ai_screened" ? `AI screening completed. Score: ${seedCandidate.aiScore}/100` :
                stage === "shortlisted" ? `Shortlisted based on AI score of ${seedCandidate.aiScore}` :
                stage === "interview_scheduled" ? "Interview scheduled with AI hiring agent" :
                stage === "interviewed" ? "AI phone interview completed" :
                stage === "hired" ? "Offer accepted" :
                stage === "rejected" ? `Below threshold score (${seedCandidate.aiScore}/100)` : "Stage updated",
        metadata: { aiScore: seedCandidate.aiScore },
      });
      prevStage = stage;
    }
  }

  if (pipelineEntries.length > 0) {
    await db.insert(candidatePipelineHistory).values(pipelineEntries);
    console.log(`   ✅ Created ${pipelineEntries.length} pipeline history entries`);
  }

  const interviewCandidates = insertedCandidates.filter(c => {
    const seed = HR_SEED_CANDIDATES.find(s => s.email === c.email);
    return seed && ["interviewed", "hired", "interview_scheduled"].includes(seed.pipelineStage);
  });

  if (interviewCandidates.length > 0) {
    const sessionValues = interviewCandidates.map(c => {
      const seed = HR_SEED_CANDIDATES.find(s => s.email === c.email)!;
      const isCompleted = ["interviewed", "hired"].includes(seed.pipelineStage);
      return {
        userId: targetUserId,
        jobId: c.jobId,
        candidateId: c.id,
        interviewType: "phone" as const,
        status: isCompleted ? "completed" as const : "scheduled" as const,
        scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        startedAt: isCompleted ? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) : null,
        completedAt: isCompleted ? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000) : null,
        duration: isCompleted ? 900 : null,
        candidatePhone: c.phone,
        overallScore: isCompleted ? Math.round(seed.aiScore * 0.95) : null,
        communicationScore: isCompleted ? Math.round(70 + Math.random() * 25) : null,
        technicalScore: isCompleted ? Math.round(65 + Math.random() * 30) : null,
        cultureFitScore: isCompleted ? Math.round(75 + Math.random() * 20) : null,
        aiEvaluation: isCompleted ? `${c.firstName} demonstrated strong capabilities during the interview. ${seed.aiSummary}` : null,
        aiRecommendation: isCompleted ? seed.aiRecommendation : null,
        sentiment: isCompleted ? "positive" as const : null,
        confidenceLevel: isCompleted ? "high" as const : null,
      };
    });

    const insertedSessions = await db.insert(interviewSessions).values(sessionValues).returning();
    console.log(`   ✅ Created ${insertedSessions.length} interview sessions`);

    for (const session of insertedSessions) {
      if (session.status === "completed" || session.status === "scheduled") {
        await db.update(candidates)
          .set({ interviewSessionId: session.id, interviewScore: session.overallScore })
          .where(sql`id = ${session.candidateId}`);
      }
    }
  }

  for (const job of insertedJobs) {
    const jobCandidates = insertedCandidates.filter(c => c.jobId === job.id);
    const counts = {
      totalCandidates: jobCandidates.length,
      totalScreened: jobCandidates.filter(c => c.pipelineStage !== "uploaded").length,
      totalShortlisted: jobCandidates.filter(c => ["shortlisted", "interview_scheduled", "interviewed", "hired"].includes(c.pipelineStage)).length,
      totalInterviewed: jobCandidates.filter(c => ["interviewed", "hired"].includes(c.pipelineStage)).length,
      totalHired: jobCandidates.filter(c => c.pipelineStage === "hired").length,
    };
    await db.update(jobs).set(counts).where(sql`id = ${job.id}`);
  }

  console.log(`   ✅ Updated job statistics`);
  console.log(`   📋 HR Seed Summary:`);
  console.log(`      - ${insertedJobs.length} jobs across departments`);
  console.log(`      - ${insertedCandidates.length} candidates at various pipeline stages`);
  console.log(`      - ${pipelineEntries.length} pipeline history entries`);
  console.log(`      - ${interviewCandidates.length} interview sessions`);
}
