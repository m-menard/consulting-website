import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  getAdminEmail,
  isEmailConfigured,
  sendEmail,
  usesDevEmailSink,
} from "./lib/email.js";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(10),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validationResult = contactSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0]?.message || "Invalid form data",
      });
    }

    const { name, email, company, phone, message } = validationResult.data;
    const adminEmail = getAdminEmail();
    const appName = process.env.APP_NAME?.trim() || "AcceLLM";

    if (!usesDevEmailSink() && !isEmailConfigured()) {
      return res.status(500).json({
        error: "Contact form is not configured. Please email us directly at contact@accellm.ai.",
      });
    }

    const htmlContent = `
      <h2>${appName} - New Contact</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${company ? `<p><strong>Company:</strong> ${company}</p>` : ""}
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
      <p><strong>Message:</strong></p>
      <pre>${message}</pre>
    `;

    const result = await sendEmail({
      to: adminEmail,
      subject: `[${appName}] Contact: ${name}${company ? ` (${company})` : ""}`,
      html: htmlContent,
      text: `Contact from ${name} <${email}>\n\n${message}`,
      replyTo: email,
    });

    if (!result.success) {
      if (result.error) {
        console.error("[Contact API] SMTP failed:", result.error);
      }
      const publicError = usesDevEmailSink()
        ? result.error ||
          "Failed to send message. Please try again later."
        : "Failed to send message. Please try again later or email contact@accellm.ai.";
      return res.status(500).json({ error: publicError });
    }

    return res.json({
      success: true,
      message: usesDevEmailSink()
        ? "Thank you! (Local dev: message logged in the API terminal — not emailed.)"
        : "Thank you! We'll get back to you soon.",
    });
  } catch (error: unknown) {
    console.error("[Contact API]", error);
    return res.status(500).json({
      error: "Failed to send message. Please try again later.",
    });
  }
}
