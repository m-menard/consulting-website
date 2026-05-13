import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { seedDemoData } from "./seed-demo-data";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@diploy.in";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@123";
const DEMO_NAME = process.env.DEMO_NAME || "Demo User";

function isRouteBlocked(path: string): boolean {
  if (path.startsWith("/api/admin/")) return true;
  return false;
}

function maskEmail(email: string): string {
  if (!email || typeof email !== "string" || !email.includes("@")) return email;
  if (email === DEMO_EMAIL) return email;
  const [local] = email.split("@");
  const prefix = local.substring(0, 2);
  return `${prefix}***@***.com`;
}

function maskPhone(phone: string): string {
  if (!phone || typeof phone !== "string") return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

function maskName(name: string): string {
  if (!name || typeof name !== "string") return name;
  if (name === DEMO_NAME) return name;
  return `${name.charAt(0)}***`;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i, /secret/i, /apikey/i, /api_key/i,
  /auth_id/i, /private/i, /credential/i,
  /smtp_pass/i, /webhook_secret/i,
];

const AUTH_RESPONSE_SKIP_PATHS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/register",
  "/api/auth/me",
];

const EMAIL_KEYS = [
  "email", "userEmail", "user_email", "contactEmail", "contact_email",
  "fromAddress", "from_address", "toAddress", "to_address",
  "billing_email", "billingEmail",
];

const PHONE_KEYS = [
  "phone", "phoneNumber", "phone_number", "mobile", "mobileNumber",
  "mobile_number", "contactPhone", "contact_phone", "twilioNumber",
  "twilio_number", "plivoNumber", "plivo_number", "fromNumber",
  "from_number", "toNumber", "to_number", "callerNumber", "caller_number",
];

const NAME_KEYS = [
  "name", "fullName", "full_name", "firstName", "first_name",
  "lastName", "last_name", "userName", "user_name", "contactName",
  "contact_name", "candidateName", "candidate_name", "billingName",
  "billing_name", "companyName", "company_name",
];

const SKIP_NAME_VALUES = [
  "AgentHR", "Demo User", "Agentlabs", "Free", "Pro", "Enterprise",
];

function shouldSkipNameMask(value: string): boolean {
  return SKIP_NAME_VALUES.some(s => s.toLowerCase() === value.toLowerCase());
}

function maskValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    for (const pattern of SENSITIVE_KEY_PATTERNS) {
      if (pattern.test(key) && value.length > 0) {
        return "********";
      }
    }

    const keyLower = key.toLowerCase();

    if (EMAIL_KEYS.some(k => k.toLowerCase() === keyLower)) {
      return maskEmail(value);
    }

    if (PHONE_KEYS.some(k => k.toLowerCase() === keyLower)) {
      return maskPhone(value);
    }

    if (NAME_KEYS.some(k => k.toLowerCase() === keyLower)) {
      if (shouldSkipNameMask(value)) return value;
      return maskName(value);
    }
  }

  return value;
}

function maskObject(obj: any, depth = 0): any {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => maskObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    if (obj instanceof Date) return obj;
    if (obj instanceof Buffer) return obj;
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date || value instanceof Buffer) {
        masked[key] = value;
      } else if (typeof value === "object" && value !== null) {
        masked[key] = maskObject(value, depth + 1);
      } else {
        masked[key] = maskValue(key, value);
      }
    }
    return masked;
  }

  return obj;
}

async function seedDemoAccount(): Promise<void> {
  try {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1);

    let demoUserId: string;

    if (existingUser) {
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: "admin",
          planType: "pro",
          credits: 1000,
          isActive: true,
          isDeleted: false,
          name: DEMO_NAME,
          updatedAt: new Date(),
        })
        .where(eq(users.email, DEMO_EMAIL));
      demoUserId = existingUser.id;
      console.log(`[Demo Mode] Demo account updated: ${DEMO_EMAIL}`);
    } else {
      const [newUser] = await db.insert(users).values({
        email: DEMO_EMAIL,
        password: hashedPassword,
        name: DEMO_NAME,
        role: "admin",
        planType: "pro",
        credits: 1000,
        isActive: true,
      }).returning();
      demoUserId = newUser.id;
      console.log(`[Demo Mode] Demo account created: ${DEMO_EMAIL}`);
    }

    await seedDemoData(demoUserId);
  } catch (error) {
    console.error("[Demo Mode] Failed to seed demo account:", error);
  }
}

export function initDemoMode(app: Express): void {
  console.log("[Demo Mode] Initializing demo mode...");

  seedDemoAccount();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) {
      return next();
    }

    if (isRouteBlocked(req.path)) {
      console.log(`[Demo Mode] Blocked ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        error: "Demo mode: admin operations are disabled for security",
        demoMode: true,
      });
    }

    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const shouldSkipMask = AUTH_RESPONSE_SKIP_PATHS.some(p => req.path === p);
    const origJson = res.json.bind(res);
    res.json = function (body: any) {
      if (!shouldSkipMask && body && typeof body === "object") {
        try {
          body = maskObject(body);
        } catch (e) {
          // fail silently
        }
      }
      return origJson(body);
    };
    next();
  });

  console.log("[Demo Mode] Demo mode middleware installed");
}

export function registerDemoModeRoutes(app: Express): void {
  app.get("/api/demo-mode/status", (_req: Request, res: Response) => {
    res.json({
      enabled: true,
      message: "Demo Mode Active - All user features are available. Admin panel operations are disabled for security.",
    });
  });

  console.log("[Demo Mode] Demo mode routes registered");
}
