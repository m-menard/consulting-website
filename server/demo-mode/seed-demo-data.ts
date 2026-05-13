import { db } from "../db";
import {
  agents, knowledgeBase, campaigns, contacts, calls,
  creditTransactions, webhookSubscriptions, websiteWidgets,
} from "../../shared/schema";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";

async function seedDemoHRData(userId: string): Promise<void> {
  console.log("[Demo Seed] Seeding HR data for demo user (via shared seeder)...");
  const { seedHRData } = await import("../seed-hr-data");
  await seedHRData(userId);
  console.log("[Demo Seed] HR data seeded for demo user");
}

async function countUserRows(userId: string): Promise<Record<string, number>> {
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM agents WHERE user_id = ${userId}) AS agents,
      (SELECT count(*)::int FROM knowledge_base WHERE user_id = ${userId}) AS knowledge_base,
      (SELECT count(*)::int FROM campaigns WHERE user_id = ${userId}) AS campaigns,
      (SELECT count(*)::int FROM calls WHERE user_id = ${userId}) AS calls,
      (SELECT count(*)::int FROM credit_transactions WHERE user_id = ${userId}) AS credit_transactions,
      (SELECT count(*)::int FROM webhook_subscriptions WHERE user_id = ${userId}) AS webhook_subscriptions,
      (SELECT count(*)::int FROM website_widgets WHERE user_id = ${userId}) AS website_widgets,
      (SELECT count(*)::int FROM jobs WHERE user_id = ${userId}) AS jobs,
      (SELECT count(*)::int FROM candidates WHERE user_id = ${userId}) AS candidates
  `);
  const row = result.rows?.[0] as Record<string, number> | undefined;
  if (!row) return {};
  return {
    agents: Number(row.agents || 0),
    knowledge_base: Number(row.knowledge_base || 0),
    campaigns: Number(row.campaigns || 0),
    calls: Number(row.calls || 0),
    credit_transactions: Number(row.credit_transactions || 0),
    webhook_subscriptions: Number(row.webhook_subscriptions || 0),
    website_widgets: Number(row.website_widgets || 0),
    jobs: Number(row.jobs || 0),
    candidates: Number(row.candidates || 0),
  };
}

async function cleanDemoData(userId: string): Promise<void> {
  console.log("[Demo Seed] Cleaning partial demo data for re-seed...");
  await db.execute(sql`DELETE FROM calls WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM contacts WHERE campaign_id IN (SELECT id FROM campaigns WHERE user_id = ${userId})`);
  await db.execute(sql`DELETE FROM campaigns WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM agents WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM knowledge_base WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM credit_transactions WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM webhook_subscriptions WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM website_widgets WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM interview_sessions WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM candidate_pipeline_history WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM candidates WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM jobs WHERE user_id = ${userId}`);
}

export async function seedDemoData(userId: string): Promise<void> {
  console.log("[Demo Seed] Seeding demo data for user:", userId);

  try {
    const counts = await countUserRows(userId);
    const expectedCounts = {
      agents: 3, campaigns: 3, calls: 11, website_widgets: 1,
      jobs: 4, candidates: 12, knowledge_base: 4,
      credit_transactions: 5, webhook_subscriptions: 2,
    };
    const isComplete = Object.entries(expectedCounts).every(([key, val]) => (counts[key] || 0) >= val);

    if (isComplete) {
      console.log("[Demo Seed] Demo data already complete. Skipping.");
      return;
    }

    const hasAnyData = Object.values(counts).some(c => c > 0);
    if (hasAnyData) {
      console.log("[Demo Seed] Partial demo data detected. Cleaning and re-seeding...");
      await cleanDemoData(userId);
    }

    const insertedAgents = await db.insert(agents).values([
      {
        userId,
        name: "HR Screening Agent",
        type: "incoming",
        telephonyProvider: "twilio",
        systemPrompt: "You are a professional HR screening agent for a technology company. Your role is to conduct initial phone screenings with candidates. Ask about their experience, skills, salary expectations, and availability. Be friendly but professional. Evaluate communication skills and cultural fit.",
        personality: "professional",
        voiceTone: "warm",
        firstMessage: "Hello! Thank you for applying. I'm the AI interviewer and I'd like to ask you a few quick questions about your background and experience. Shall we begin?",
        language: "en",
        llmModel: "gpt-4o-mini",
        temperature: 0.7,
        transferEnabled: true,
        transferPhoneNumber: "+14155550100",
        isActive: true,
      },
      {
        userId,
        name: "Technical Interview Bot",
        type: "incoming",
        telephonyProvider: "twilio",
        systemPrompt: "You are a technical interviewer specializing in software engineering roles. Ask candidates about their technical skills, problem-solving approach, system design experience, and coding practices. Evaluate depth of knowledge and practical experience.",
        personality: "analytical",
        voiceTone: "professional",
        firstMessage: "Hi there! I'll be conducting your technical screening today. We'll go through some questions about your technical background. Ready to start?",
        language: "en",
        llmModel: "gpt-4o-mini",
        temperature: 0.5,
        transferEnabled: false,
        isActive: true,
      },
      {
        userId,
        name: "Candidate Follow-up Agent",
        type: "flow",
        telephonyProvider: "twilio",
        systemPrompt: "You are a follow-up agent that contacts candidates after their interviews. Share next steps, answer questions about the role, and gauge continued interest. Be encouraging and informative.",
        personality: "friendly",
        voiceTone: "conversational",
        firstMessage: "Hi {{firstName}}! I'm calling from the hiring team to follow up on your recent interview. Do you have a moment to chat?",
        language: "en",
        llmModel: "gpt-4o-mini",
        temperature: 0.8,
        maxDurationSeconds: 300,
        isActive: true,
      },
    ]).returning();

    console.log(`[Demo Seed] Created ${insertedAgents.length} agents`);

    const kbItems = await db.insert(knowledgeBase).values([
      {
        userId,
        type: "text",
        title: "Company Overview & Culture",
        content: "TechVision Inc. is a Series B startup building AI-powered developer tools. Founded in 2021, we have 85 employees across San Francisco, New York, and London. Our culture values innovation, transparency, and work-life balance. We offer competitive salaries, equity, unlimited PTO, and remote-first flexibility.",
        storageSize: 2048,
      },
      {
        userId,
        type: "text",
        title: "Benefits & Compensation Guide",
        content: "Compensation packages include base salary, equity grants (ISOs), annual performance bonuses (10-20%), 401(k) with 4% match, premium health/dental/vision insurance, $2,000 annual learning budget, $500/month home office stipend, and 16 weeks paid parental leave. Relocation assistance available for select roles.",
        storageSize: 1536,
      },
      {
        userId,
        type: "text",
        title: "Interview Process FAQ",
        content: "Our hiring process consists of 4 stages: 1) AI Phone Screen (15 min), 2) Technical Assessment or Portfolio Review (45 min), 3) Team Interview Panel (60 min), 4) Final Round with Hiring Manager (30 min). Total process takes 2-3 weeks. We provide feedback within 48 hours of each stage. Candidates can reschedule any round once without penalty.",
        storageSize: 1024,
      },
      {
        userId,
        type: "url",
        title: "Engineering Blog - Tech Stack",
        url: "https://example.com/blog/our-tech-stack",
        storageSize: 512,
      },
    ]).returning();

    console.log(`[Demo Seed] Created ${kbItems.length} knowledge base items`);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const insertedCampaigns = await db.insert(campaigns).values([
      {
        userId,
        agentId: insertedAgents[2].id,
        name: "Q1 Engineering Hiring Drive",
        type: "outbound",
        goal: "Screen shortlisted engineering candidates for Senior Software Engineer and Data Analyst positions",
        script: "Hello {{firstName}}, this is an automated call from TechVision's hiring team. We reviewed your application for the {{position}} role and would like to conduct a brief phone screening. Are you available for a few questions?",
        status: "completed",
        totalContacts: 27,
        completedCalls: 22,
        successfulCalls: 18,
        failedCalls: 4,
        scheduledFor: twoWeeksAgo,
        startedAt: twoWeeksAgo,
        completedAt: oneWeekAgo,
        scheduleEnabled: true,
        scheduleTimeStart: "09:00",
        scheduleTimeEnd: "17:00",
        scheduleDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        scheduleTimezone: "America/New_York",
        retryEnabled: true,
      },
      {
        userId,
        agentId: insertedAgents[2].id,
        name: "Product Team Candidate Outreach",
        type: "outbound",
        goal: "Contact qualified Product Manager candidates for initial screening",
        script: "Hi {{firstName}}, I'm reaching out from TechVision regarding the Product Manager position you expressed interest in. We'd love to learn more about your background. Do you have a few minutes?",
        status: "active",
        totalContacts: 15,
        completedCalls: 8,
        successfulCalls: 6,
        failedCalls: 2,
        scheduledFor: threeDaysAgo,
        startedAt: threeDaysAgo,
        scheduleEnabled: true,
        scheduleTimeStart: "10:00",
        scheduleTimeEnd: "18:00",
        scheduleDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        scheduleTimezone: "America/New_York",
        retryEnabled: true,
      },
      {
        userId,
        agentId: insertedAgents[2].id,
        name: "Design Team Interview Callbacks",
        type: "outbound",
        goal: "Schedule follow-up interviews with shortlisted UX Designer candidates",
        status: "pending",
        totalContacts: 8,
        completedCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        scheduledFor: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        scheduleEnabled: true,
        scheduleTimeStart: "09:00",
        scheduleTimeEnd: "16:00",
        scheduleDays: ["monday", "wednesday", "friday"],
        scheduleTimezone: "America/Chicago",
      },
    ]).returning();

    console.log(`[Demo Seed] Created ${insertedCampaigns.length} campaigns`);

    const campaignContactsData = [
      { campaignId: insertedCampaigns[0].id, firstName: "Arjun", lastName: "Mehta", phone: "+14155552001", email: "arjun.m@email.com", status: "completed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Rachel", lastName: "Foster", phone: "+14155552002", email: "rachel.f@email.com", status: "completed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Kevin", lastName: "O'Brien", phone: "+14155552003", email: "kevin.ob@email.com", status: "completed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Yuki", lastName: "Tanaka", phone: "+14155552004", email: "yuki.t@email.com", status: "failed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Fatima", lastName: "Al-Hassan", phone: "+14155552005", email: "fatima.ah@email.com", status: "completed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Tom", lastName: "Henderson", phone: "+14155552013", email: "tom.h@email.com", status: "completed" },
      { campaignId: insertedCampaigns[0].id, firstName: "Priya", lastName: "Sharma", phone: "+14155552014", email: "priya.s@email.com", status: "completed" },
      { campaignId: insertedCampaigns[1].id, firstName: "Marcus", lastName: "Brown", phone: "+14155552006", email: "marcus.b@email.com", status: "completed" },
      { campaignId: insertedCampaigns[1].id, firstName: "Sophie", lastName: "Laurent", phone: "+14155552007", email: "sophie.l@email.com", status: "completed" },
      { campaignId: insertedCampaigns[1].id, firstName: "Daniel", lastName: "Park", phone: "+14155552008", email: "daniel.p@email.com", status: "pending" },
      { campaignId: insertedCampaigns[1].id, firstName: "Isabella", lastName: "Costa", phone: "+14155552009", email: "isabella.c@email.com", status: "failed" },
      { campaignId: insertedCampaigns[1].id, firstName: "James", lastName: "Wilson", phone: "+14155552015", email: "james.w@email.com", status: "completed" },
      { campaignId: insertedCampaigns[1].id, firstName: "Aisha", lastName: "Khan", phone: "+14155552016", email: "aisha.k@email.com", status: "pending" },
      { campaignId: insertedCampaigns[2].id, firstName: "Nina", lastName: "Petrov", phone: "+14155552010", email: "nina.p@email.com", status: "pending" },
      { campaignId: insertedCampaigns[2].id, firstName: "Liam", lastName: "Murray", phone: "+14155552011", email: "liam.m@email.com", status: "pending" },
      { campaignId: insertedCampaigns[2].id, firstName: "Chen", lastName: "Wei", phone: "+14155552012", email: "chen.w@email.com", status: "pending" },
      { campaignId: insertedCampaigns[2].id, firstName: "Elena", lastName: "Rodriguez", phone: "+14155552017", email: "elena.r@email.com", status: "pending" },
      { campaignId: insertedCampaigns[2].id, firstName: "Oliver", lastName: "Schmidt", phone: "+14155552018", email: "oliver.s@email.com", status: "pending" },
    ];

    const insertedContacts = await db.insert(contacts).values(campaignContactsData).returning();
    console.log(`[Demo Seed] Created ${insertedContacts.length} contacts`);

    const completedContacts = insertedContacts.filter(c => c.status === "completed");
    const failedContacts = insertedContacts.filter(c => c.status === "failed");

    const callRecords = [
      ...completedContacts.map((contact, i) => ({
        userId,
        campaignId: contact.campaignId,
        contactId: contact.id,
        phoneNumber: contact.phone,
        fromNumber: "+14155550100",
        toNumber: contact.phone,
        status: "completed" as const,
        callDirection: "outgoing" as const,
        duration: 180 + Math.floor(Math.random() * 600),
        transcript: `Agent: Hello ${contact.firstName}, this is TechVision's hiring team calling about your application.\n${contact.firstName}: Yes, hi! I've been expecting your call.\nAgent: Great! Let me ask you a few questions about your background...\n${contact.firstName}: Sure, I'd be happy to answer.\nAgent: Could you tell me about your most recent role and key responsibilities?\n${contact.firstName}: Of course. I've been working as a ${i % 2 === 0 ? 'software engineer' : 'product lead'} for the past ${2 + i} years...\nAgent: That's very relevant. Thank you for your time. We'll be in touch with next steps.`,
        aiSummary: `Strong candidate with relevant experience. ${contact.firstName} demonstrated clear communication and enthusiasm for the role. Recommended for next round.`,
        classification: i % 3 === 0 ? "strong_match" : "good_match",
        sentiment: "positive",
        startedAt: new Date(now.getTime() - (7 - i) * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - (7 - i) * 24 * 60 * 60 * 1000 + (180 + i * 60) * 1000),
        createdAt: new Date(now.getTime() - (7 - i) * 24 * 60 * 60 * 1000),
      })),
      ...failedContacts.map((contact) => ({
        userId,
        campaignId: contact.campaignId,
        contactId: contact.id,
        phoneNumber: contact.phone,
        fromNumber: "+14155550100",
        toNumber: contact.phone,
        status: "no-answer" as const,
        callDirection: "outgoing" as const,
        duration: 0,
        startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      })),
    ];

    if (callRecords.length > 0) {
      await db.insert(calls).values(callRecords);
      console.log(`[Demo Seed] Created ${callRecords.length} call records`);
    }

    await db.insert(creditTransactions).values([
      {
        userId,
        type: "purchase",
        amount: 500,
        description: "Pro Plan - Monthly credit allocation",
        reference: `demo-plan-credit-${userId}`,
        createdAt: twoWeeksAgo,
      },
      {
        userId,
        type: "deduction",
        amount: -22,
        description: "Campaign: Q1 Engineering Hiring Drive - 22 calls",
        reference: `demo-campaign-deduct-1-${userId}`,
        createdAt: oneWeekAgo,
      },
      {
        userId,
        type: "deduction",
        amount: -8,
        description: "Campaign: Product Team Candidate Outreach - 8 calls",
        reference: `demo-campaign-deduct-2-${userId}`,
        createdAt: threeDaysAgo,
      },
      {
        userId,
        type: "purchase",
        amount: 200,
        description: "Credit top-up purchase",
        reference: `demo-topup-${userId}`,
        createdAt: oneWeekAgo,
      },
      {
        userId,
        type: "deduction",
        amount: -5,
        description: "Widget: Career Page Widget - 5 incoming calls",
        reference: `demo-widget-deduct-${userId}`,
        createdAt: threeDaysAgo,
      },
    ]);

    console.log("[Demo Seed] Created 5 credit transactions");

    await db.insert(webhookSubscriptions).values([
      {
        id: `demo-wh-1-${userId.slice(0, 8)}`,
        userId,
        name: "ATS Integration",
        description: "Sends call results and candidate scores to the Applicant Tracking System",
        url: "https://ats.example.com/webhooks/agenthr",
        method: "POST",
        secret: "whsec_demo_ats_" + userId.slice(0, 16),
        events: ["call.completed", "candidate.scored", "campaign.completed"],
        isActive: true,
      },
      {
        id: `demo-wh-2-${userId.slice(0, 8)}`,
        userId,
        name: "Slack Notifications",
        description: "Posts hiring updates to the #recruitment Slack channel",
        url: "https://hooks.slack.com/services/DEMO/WEBHOOK/example",
        method: "POST",
        secret: "whsec_demo_slack_" + userId.slice(0, 16),
        events: ["call.completed", "campaign.started", "campaign.completed"],
        isActive: true,
      },
    ]);

    console.log("[Demo Seed] Created 2 webhook subscriptions");

    await db.insert(websiteWidgets).values([
      {
        userId,
        name: "Career Page Widget",
        description: "Embeddable voice interview widget for the company careers page",
        status: "active",
        agentId: insertedAgents[0].id,
        agentType: "incoming",
        brandName: "TechVision Careers",
        buttonLabel: "START INTERVIEW",
        primaryColor: "#176BD0",
        accentColor: "#0B2D68",
        backgroundColor: "#FFFFFF",
        textColor: "#1F2937",
        welcomeMessage: "Apply for your dream role with a quick AI interview",
        launcherText: "Start Interview",
        launcherPosition: "bottom-right",
        offlineMessage: "Applications are currently paused. Please check back later.",
        requireTermsAcceptance: true,
        embedToken: randomBytes(24).toString("hex"),
      },
    ]);

    console.log("[Demo Seed] Created 1 website widget");

    await seedDemoHRData(userId);

    console.log("[Demo Seed] Demo data seeding complete!");
  } catch (error) {
    console.error("[Demo Seed] Error seeding demo data:", error);
  }
}
