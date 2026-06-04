import nodemailer from "nodemailer";
import { CONTACT_INBOX_EMAIL } from "../../shared/contact-inbox.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function envTrim(key: string): string | undefined {
  const value = process.env[key]?.trim();
  if (!value) return undefined;
  // Strip accidental quotes when pasting into Vercel / .env
  return value.replace(/^["']|["']$/g, "");
}

export function isEmailConfigured(): boolean {
  return Boolean(
    envTrim("SMTP_HOST") && envTrim("SMTP_USER") && envTrim("SMTP_PASS")
  );
}

/** Local/off-Vercel: log contact mail instead of SMTP unless CONTACT_USE_SMTP=true */
export function usesDevEmailSink(): boolean {
  if (process.env.CONTACT_USE_SMTP === "true") return false;
  if (process.env.VERCEL === "1") return false;
  if (process.env.CONTACT_DEV_LOG === "false") return false;
  return true;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (usesDevEmailSink()) {
    console.log(
      `[Email Dev] → ${options.to}\n` +
        `  Subject: ${options.subject}\n` +
        `  Reply-To: ${options.replyTo ?? "(none)"}\n` +
        `  Body:\n${options.text ?? options.html}`
    );
    return { success: true };
  }

  if (!isEmailConfigured()) {
    return { success: false, error: "SMTP is not configured" };
  }

  const host = envTrim("SMTP_HOST")!;
  const user = envTrim("SMTP_USER")!;
  const pass = envTrim("SMTP_PASS")!;
  const port = parseInt(envTrim("SMTP_PORT") || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const from =
    envTrim("SMTP_FROM") ||
    envTrim("SMTP_FROM_EMAIL") ||
    user ||
    "noreply@example.com";

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Send failed";
    console.error("[Email]", message);
    return { success: false, error: message };
  }
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || CONTACT_INBOX_EMAIL;
}
