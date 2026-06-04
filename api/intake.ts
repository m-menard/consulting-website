import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  appendIntakeToGoogleSheet,
  isIntakeSheetsConfigured,
} from "./lib/intake-sheets.js";
import { getAdminEmail, isEmailConfigured, sendEmail } from "./lib/email.js";

const companySizes = ["1-10", "11-50", "51-200", "200+"] as const;
const aiGoals = [
  "automate_workflows",
  "ai_chatbot",
  "ai_agents",
  "internal_tools",
  "not_sure",
] as const;
const budgets = ["under_5k", "5k_20k", "20k_50k", "50k_plus"] as const;
const timelines = ["asap", "1_3_months", "3_6_months", "flexible"] as const;

const aiGoalLabels: Record<(typeof aiGoals)[number], string> = {
  automate_workflows: "Automate Workflows",
  ai_chatbot: "AI Chatbot / Assistant",
  ai_agents: "AI Agents",
  internal_tools: "Internal Tools",
  not_sure: "Not Sure",
};
const budgetLabels: Record<(typeof budgets)[number], string> = {
  under_5k: "<$5k",
  "5k_20k": "$5k - $20k",
  "20k_50k": "$20k - $50k",
  "50k_plus": "$50k +",
};
const timelineLabels: Record<(typeof timelines)[number], string> = {
  asap: "ASAP",
  "1_3_months": "1 - 3 months",
  "3_6_months": "3 - 6 months",
  flexible: "Flexible",
};

const intakeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  companyDescription: z.string().optional(),
  industry: z.string().min(1),
  companySize: z.enum(companySizes).optional(),
  mainProblem: z.string().min(1),
  obstacles: z.string().min(1),
  aiGoals: z.array(z.enum(aiGoals)).min(1),
  idealOutcome: z.string().optional(),
  budget: z.enum(budgets).optional(),
  timeline: z.enum(timelines).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validationResult = intakeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0]?.message || "Invalid form data",
      });
    }

    const data = validationResult.data;

    if (!isIntakeSheetsConfigured()) {
      return res.status(500).json({
        error: "Intake form storage is not configured. Please contact support.",
      });
    }

    const aiGoalsLabel = data.aiGoals.map((g) => aiGoalLabels[g]).join(", ");
    const budgetLabel = data.budget ? budgetLabels[data.budget] : undefined;
    const timelineLabel = data.timeline ? timelineLabels[data.timeline] : undefined;

    await appendIntakeToGoogleSheet({
      name: data.name,
      email: data.email,
      phone: data.phone,
      linkedinUrl: data.linkedinUrl,
      companyDescription: data.companyDescription,
      industry: data.industry,
      companySize: data.companySize,
      mainProblem: data.mainProblem,
      obstacles: data.obstacles,
      aiGoalsLabel,
      idealOutcome: data.idealOutcome,
      budgetLabel,
      timelineLabel,
    });

    const appName = process.env.APP_NAME?.trim() || "AcceLLM";
    const adminEmail = getAdminEmail();

    if (adminEmail && isEmailConfigured()) {
      const textContent = [
        `New client intake from ${data.name} (${data.email})`,
        `Industry: ${data.industry}`,
        `Goals: ${aiGoalsLabel}`,
        data.mainProblem ? `Problem: ${data.mainProblem}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sendEmail({
        to: adminEmail,
        subject: `[${appName}] Client Intake: ${data.name}`,
        html: `<p>New intake submission from <strong>${data.name}</strong> (${data.email}).</p><p>Details are in Google Sheets.</p>`,
        text: textContent,
        replyTo: data.email,
      });
    }

    return res.json({
      success: true,
      message: "Thank you! We'll be in touch soon.",
    });
  } catch (error: unknown) {
    console.error("[Intake API]", error);
    return res.status(500).json({
      error: "Failed to save your submission. Please try again later.",
    });
  }
}
