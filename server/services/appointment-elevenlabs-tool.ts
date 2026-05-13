/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
/**
 * Appointment ElevenLabs Tool Configuration
 * 
 * Configures the book_appointment webhook tool for ElevenLabs agents.
 * When a Flow Agent needs to book an appointment during a call, ElevenLabs calls
 * our webhook with the appointment details, which saves it to the database.
 * 
 * Tool Type: "webhook" (server-side) - ElevenLabs calls our endpoint directly
 * Security: Uses a shared secret token in header for webhook authentication
 */

import { getDomain } from "../utils/domain";
import crypto from "crypto";

let appointmentWebhookSecret: string | null = null;

export function getAppointmentWebhookSecret(): string {
  if (!appointmentWebhookSecret) {
    appointmentWebhookSecret = process.env.APPOINTMENT_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    if (!process.env.APPOINTMENT_WEBHOOK_SECRET) {
      console.log(`📅 [Appointment Tool] Generated new webhook secret (set APPOINTMENT_WEBHOOK_SECRET env var for persistence)`);
    }
  }
  return appointmentWebhookSecret;
}

export function validateAppointmentWebhookToken(providedToken: string | undefined): boolean {
  if (!providedToken) {
    return false;
  }
  const secret = getAppointmentWebhookSecret();
  
  const providedBuffer = Buffer.from(providedToken);
  const secretBuffer = Buffer.from(secret);
  
  if (providedBuffer.length !== secretBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(providedBuffer, secretBuffer);
}

export interface AppointmentWebhookToolConfig {
  type: "webhook";
  name: string;
  description: string;
  api_schema: {
    url: string;
    method: "GET" | "POST";
    headers?: Record<string, string>;
    request_body_schema?: Record<string, any>;
  };
}

/**
 * Get the book_appointment webhook tool configuration for ElevenLabs
 * @param agentId - The database agent ID (not ElevenLabs agent ID) for appointment ownership
 * @param callId - Optional call ID to associate the appointment with
 */
export function getBookAppointmentWebhookTool(agentId: string, callId?: string): AppointmentWebhookToolConfig {
  const domain = getDomain();
  const secret = getAppointmentWebhookSecret();
  
  const queryParams = callId ? `?callId=${encodeURIComponent(callId)}` : '';
  const webhookUrl = `${domain}/api/webhooks/elevenlabs/appointment/${secret}/${agentId}${queryParams}`;
  
  const agentIdSuffix = agentId.slice(-8);
  const toolName = `book_appointment_${agentIdSuffix}`;
  
  // Get current date for context (so AI knows what "tomorrow" means)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentDateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  console.log(`📅 [Appointment Tool] Creating webhook tool config for agent ${agentId}`);
  console.log(`   Tool name: ${toolName}`);
  console.log(`   Current date context: ${currentDateStr}`);
  console.log(`   Webhook URL: ${webhookUrl.replace(secret, '[TOKEN]')}`);
  
  return {
    type: "webhook",
    name: toolName,
    description: `Book an appointment for the caller. TODAY IS ${currentDateStr}. The current year is ${currentYear}. NEVER book appointments in past years - all dates must be in ${currentYear} or later. Use this when the caller wants to schedule an appointment. When they say 'tomorrow', calculate the next day from today. IMPORTANT: For contactPhone - since this is a call, we already know the customer's number. Do NOT ask for their phone number unless they want to use a different one. If they confirm using their current number or say "same number" or "yes", set contactPhone to the literal string "USE_CALLER_NUMBER". Only collect an actual phone number if they explicitly give you a different one.`,
    api_schema: {
      url: webhookUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      request_body_schema: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the person booking the appointment"
          },
          contactPhone: {
            type: "string",
            description: "Set to the literal string 'USE_CALLER_NUMBER' if the caller wants to use the number from this call. Only provide an actual phone number if they explicitly give a DIFFERENT number. Never pass phrases like 'same number' or 'the one you called' - use 'USE_CALLER_NUMBER' instead."
          },
          contactEmail: {
            type: "string",
            description: "Optional email address of the person"
          },
          appointmentDate: {
            type: "string",
            description: "The appointment date. Can be relative like 'tomorrow', 'next Monday', 'in 3 days' OR in YYYY-MM-DD format. The server will parse relative dates automatically."
          },
          appointmentTime: {
            type: "string",
            description: "The appointment time in HH:MM format (24-hour). Convert spoken times: '2pm' becomes '14:00', '9:30am' becomes '09:30'"
          },
          duration: {
            type: "number",
            description: "Duration in minutes (default 30)"
          },
          serviceName: {
            type: "string",
            description: "Optional name of the service/reason for appointment"
          },
          notes: {
            type: "string",
            description: "Optional additional notes about the appointment"
          }
        },
        required: ["contactName", "appointmentDate", "appointmentTime"]
      }
    }
  };
}

/**
 * Get the appointment webhook tool for a specific ElevenLabs agent
 * Used when creating/updating Flow agents
 * 
 * @param elevenLabsAgentId - The ElevenLabs agent ID (required after agent is created in ElevenLabs)
 */
export function getAppointmentToolForAgent(elevenLabsAgentId: string): AppointmentWebhookToolConfig {
  const domain = getDomain();
  const secret = getAppointmentWebhookSecret();
  
  const webhookUrl = `${domain}/api/webhooks/elevenlabs/appointment/${secret}/${elevenLabsAgentId}`;
  
  // Use agent-specific tool name to prevent conflicts
  const agentIdSuffix = elevenLabsAgentId.slice(-8);
  const toolName = `book_appointment_${agentIdSuffix}`;
  
  // Get current date for context (so AI knows what "tomorrow" means)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentDateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  console.log(`📅 [Appointment Tool] Creating webhook tool for ElevenLabs agent ${elevenLabsAgentId}`);
  console.log(`   Tool name: ${toolName}`);
  console.log(`   Current date context: ${currentDateStr}`);
  console.log(`   Webhook URL: ${webhookUrl.replace(secret, '[TOKEN]')}`);
  
  return {
    type: "webhook",
    name: toolName,
    description: `Book an appointment for the caller. TODAY IS ${currentDateStr}. The current year is ${currentYear}. NEVER book appointments in past years - all dates must be in ${currentYear} or later. Use this when the caller wants to schedule an appointment. When they say 'tomorrow', calculate the next day from today. IMPORTANT: For contactPhone - since this is a call, we already know the customer's number. Do NOT ask for their phone number unless they want to use a different one. If they confirm using their current number or say "same number" or "yes", set contactPhone to the literal string "USE_CALLER_NUMBER". Only collect an actual phone number if they explicitly give you a different one.`,
    api_schema: {
      url: webhookUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      request_body_schema: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the person booking the appointment"
          },
          contactPhone: {
            type: "string",
            description: "Set to the literal string 'USE_CALLER_NUMBER' if the caller wants to use the number from this call. Only provide an actual phone number if they explicitly give a DIFFERENT number. Never pass phrases like 'same number' or 'the one you called' - use 'USE_CALLER_NUMBER' instead."
          },
          contactEmail: {
            type: "string",
            description: "Optional email address of the person"
          },
          appointmentDate: {
            type: "string",
            description: "The appointment date. Can be relative like 'tomorrow', 'next Monday', 'in 3 days' OR in YYYY-MM-DD format. The server will parse relative dates automatically."
          },
          appointmentTime: {
            type: "string",
            description: "The appointment time in HH:MM format (24-hour). Convert spoken times: '2pm' becomes '14:00', '9:30am' becomes '09:30'"
          },
          duration: {
            type: "number",
            description: "Duration in minutes (default 30)"
          },
          serviceName: {
            type: "string",
            description: "Optional name of the service/reason for appointment"
          },
          notes: {
            type: "string",
            description: "Optional additional notes about the appointment"
          }
        },
        required: ["contactName", "appointmentDate", "appointmentTime"]
      }
    }
  };
}
