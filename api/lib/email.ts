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
  return value.replace(/^["']|["']$/g, "");
}

function envSmtpPass(): string | undefined {
  const value = envTrim("SMTP_PASS");
  if (!value) return undefined;
  // Google App Passwords are 16 chars; users often paste with spaces
  return value.replace(/\s+/g, "");
}

export function isResendConfigured(): boolean {
  return Boolean(envTrim("RESEND_API_KEY"));
}

export function isEmailConfigured(): boolean {
  return Boolean(
    isResendConfigured() ||
      (envTrim("SMTP_HOST") && envTrim("SMTP_USER") && envSmtpPass())
  );
}

export function formatEmailSendError(error?: string): string {
  if (!error) {
    return "Failed to send message. Please try again later or email contact@accellm.ai.";
  }
  if (error.includes("535") || error.includes("BadCredentials")) {
    return "Gmail rejected the SMTP login. Set SMTP_USER to your Gmail address and SMTP_PASS to a 16-character Google App Password (not your regular password). Create one at myaccount.google.com/apppasswords";
  }
  if (process.env.NODE_ENV === "development" || process.env.VERCEL !== "1") {
    return error.split("\n")[0] || error;
  }
  return "Failed to send message. Please try again later or email contact@accellm.ai.";
}

async function sendViaResend(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const apiKey = envTrim("RESEND_API_KEY");
  if (!apiKey) {
    return { success: false, error: "Resend is not configured" };
  }

  const from =
    envTrim("RESEND_FROM") ||
    envTrim("SMTP_FROM") ||
    envTrim("SMTP_FROM_EMAIL") ||
    envTrim("SMTP_USER") ||
    "AcceLLM <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    const data = (await response.json()) as { message?: string; id?: string };
    if (!response.ok) {
      const message = data.message || `Resend error (${response.status})`;
      console.error("[Email Resend]", message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Resend send failed";
    console.error("[Email Resend]", message);
    return { success: false, error: message };
  }
}

async function sendViaSmtp(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const host = envTrim("SMTP_HOST");
  const user = envTrim("SMTP_USER");
  const pass = envSmtpPass();

  if (!host || !user || !pass) {
    return { success: false, error: "SMTP is not configured" };
  }

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
    console.error("[Email SMTP]", message);
    return { success: false, error: message };
  }
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (isResendConfigured()) {
    return sendViaResend(options);
  }
  return sendViaSmtp(options);
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || CONTACT_INBOX_EMAIL;
}
