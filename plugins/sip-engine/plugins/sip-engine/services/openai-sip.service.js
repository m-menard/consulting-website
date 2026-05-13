"use strict";
/**
 * OpenAI SIP Service
 * Handles incoming calls via OpenAI Realtime SIP integration
 *
 * OpenAI SIP supports INCOMING calls only - for outbound, use ElevenLabs SIP
 *
 * Official Docs:
 * - OpenAI Realtime SIP: https://platform.openai.com/docs/guides/realtime-sip
 * - OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
 *
 * Flow:
 * 1. User configures SIP trunk pointing to: sip:$PROJECT_ID@sip.api.openai.com;transport=tls
 * 2. When call comes in, OpenAI sends webhook to AgentHR
 * 3. AgentHR accepts/rejects the call with agent configuration
 * 4. OpenAI handles the conversation directly
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAISipService = void 0;
const db_1 = require("../../../server/db");
const drizzle_orm_1 = require("drizzle-orm");
const SIP_MOCK_MODE = process.env.SIP_MOCK_MODE === 'true';
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const crypto = __importStar(require("crypto"));
class OpenAISipService {
    static async getOpenAIApiKey() {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT api_key FROM openai_keys 
      WHERE is_active = true 
      ORDER BY RANDOM() 
      LIMIT 1
    `);
        const row = result.rows[0];
        if (row?.api_key) {
            return row.api_key;
        }
        const envKey = process.env.OPENAI_API_KEY;
        if (envKey) {
            return envKey;
        }
        throw new Error('No OpenAI API key configured');
    }
    /**
     * Get webhook secret from database for signature verification
     */
    static async getWebhookSecret() {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT setting_value FROM global_settings 
        WHERE setting_key = 'openai_sip_webhook_secret' 
        LIMIT 1
      `);
            const row = result.rows[0];
            return row?.setting_value || null;
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Verify OpenAI webhook signature
     * Based on: https://platform.openai.com/docs/guides/webhooks
     *
     * OpenAI uses a standard webhook signature format:
     * - webhook-id: unique ID for idempotency
     * - webhook-timestamp: Unix timestamp of delivery attempt
     * - webhook-signature: v1,<base64-encoded-hmac-sha256>
     *
     * IMPORTANT: This method assumes the secret is already retrieved by the caller.
     * It should only be called after verifying that a secret exists.
     */
    static async verifyWebhookSignature(payload, signature, webhookId, timestamp) {
        const secret = await this.getWebhookSecret();
        if (!secret) {
            // This should not happen if caller checks first, but fail safely
            console.error('[OpenAI SIP] Cannot verify signature: No webhook secret configured');
            return false;
        }
        try {
            // Parse signature (format: v1,<base64-signature>)
            const parts = signature.split(',');
            if (parts.length < 2 || !parts[0].startsWith('v1')) {
                console.error('[OpenAI SIP] Invalid signature format - expected v1,<signature>');
                return false;
            }
            const expectedSignature = parts[1];
            // Construct signed payload: id.timestamp.body
            const signedPayload = `${webhookId}.${timestamp}.${payload}`;
            // Compute HMAC-SHA256
            const computedSignature = crypto
                .createHmac('sha256', secret)
                .update(signedPayload)
                .digest('base64');
            // Constant-time comparison - must handle different lengths
            try {
                const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'base64'), Buffer.from(computedSignature, 'base64'));
                if (!isValid) {
                    console.error('[OpenAI SIP] Webhook signature verification failed');
                }
                return isValid;
            }
            catch (e) {
                // timingSafeEqual throws if buffers have different lengths
                console.error('[OpenAI SIP] Signature length mismatch');
                return false;
            }
        }
        catch (error) {
            console.error('[OpenAI SIP] Error verifying webhook signature:', error);
            return false;
        }
    }
    static async getOpenAIProjectId() {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT setting_value FROM global_settings 
      WHERE setting_key = 'openai_sip_project_id' 
      LIMIT 1
    `);
        const setting = result.rows[0];
        if (setting?.setting_value) {
            return setting.setting_value;
        }
        const envProjectId = process.env.OPENAI_PROJECT_ID;
        if (envProjectId) {
            return envProjectId;
        }
        throw new Error('OpenAI Project ID not configured. Set it in Admin Settings.');
    }
    static getSipEndpoint(projectId) {
        return `sip:${projectId}@sip.api.openai.com;transport=tls`;
    }
    static async handleIncomingCall(event) {
        console.log(`[OpenAI SIP] Incoming call: ${event.data.call_id}`);
        const fromHeader = event.data.sip_headers.find(h => h.name.toLowerCase() === 'from');
        const toHeader = event.data.sip_headers.find(h => h.name.toLowerCase() === 'to');
        const fromNumber = this.extractPhoneNumber(fromHeader?.value || '');
        const toNumber = this.extractPhoneNumber(toHeader?.value || '');
        console.log(`[OpenAI SIP] Call from ${fromNumber} to ${toNumber}`);
        const phoneResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT spn.*, a.id as agent_id, a.system_prompt, a.first_message, 
             a.openai_voice, a.temperature, a.name as agent_name,
             st.user_id
      FROM sip_phone_numbers spn
      JOIN sip_trunks st ON spn.sip_trunk_id = st.id
      LEFT JOIN agents a ON spn.agent_id = a.id
      WHERE spn.phone_number = ${toNumber} 
        AND spn.engine = 'openai-sip'
        AND spn.is_active = true
        AND spn.inbound_enabled = true
      LIMIT 1
    `);
        const phoneNumber = phoneResult.rows[0];
        if (!phoneNumber || !phoneNumber.agent_id) {
            console.log(`[OpenAI SIP] No agent assigned to ${toNumber}`);
            return { action: 'reject', reason: 'No agent configured for this number' };
        }
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_calls (
        user_id, agent_id, sip_trunk_id, sip_phone_number_id, engine,
        external_call_id, openai_call_id, from_number, to_number, call_direction, direction, status
      )
      VALUES (
        ${phoneNumber.user_id}, ${phoneNumber.agent_id}, ${phoneNumber.sip_trunk_id},
        ${phoneNumber.id}, 'openai-sip', ${event.data.call_id}, ${event.data.call_id},
        ${fromNumber}, ${toNumber}, 'inbound', 'inbound', 'ringing'
      )
    `);
        const acceptConfig = {
            type: 'realtime',
            model: 'gpt-realtime-1.5',
            instructions: phoneNumber.system_prompt || 'You are a helpful AI assistant answering phone calls.',
            voice: phoneNumber.openai_voice || 'alloy',
            input_audio_transcription: {
                model: 'whisper-1',
            },
        };
        console.log(`[OpenAI SIP] Accepting call with agent: ${phoneNumber.agent_name}`);
        return { action: 'accept', config: acceptConfig };
    }
    static async acceptCall(callId, config) {
        if (SIP_MOCK_MODE) {
            console.log(`[OpenAI SIP] Mock mode: Simulating call accept for ${callId}`);
            return { success: true };
        }
        try {
            const apiKey = await this.getOpenAIApiKey();
            const response = await fetch(`${OPENAI_API_BASE}/realtime/calls/${callId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session: {
                        voice: config.voice,
                        instructions: config.instructions,
                        model: config.model,
                        input_audio_transcription: config.input_audio_transcription,
                        tools: config.tools,
                    },
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenAI SIP] Accept call failed: ${response.status} - ${errorText}`);
                return { success: false, error: errorText };
            }
            console.log(`[OpenAI SIP] Call ${callId} accepted`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        UPDATE sip_calls SET status = 'in-progress', answered_at = NOW(), updated_at = NOW()
        WHERE openai_call_id = ${callId}
      `);
            return { success: true };
        }
        catch (error) {
            console.error(`[OpenAI SIP] Error accepting call ${callId}:`, error);
            return { success: false, error: error.message };
        }
    }
    static async rejectCall(callId, reason) {
        if (SIP_MOCK_MODE) {
            console.log(`[OpenAI SIP] Mock mode: Simulating call reject for ${callId}`);
            return { success: true };
        }
        try {
            const apiKey = await this.getOpenAIApiKey();
            const response = await fetch(`${OPENAI_API_BASE}/realtime/calls/${callId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenAI SIP] Reject call failed: ${response.status} - ${errorText}`);
                return { success: false, error: errorText };
            }
            console.log(`[OpenAI SIP] Call ${callId} rejected: ${reason}`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        UPDATE sip_calls SET status = 'cancelled', ended_at = NOW(), updated_at = NOW()
        WHERE openai_call_id = ${callId}
      `);
            return { success: true };
        }
        catch (error) {
            console.error(`[OpenAI SIP] Error rejecting call ${callId}:`, error);
            return { success: false, error: error.message };
        }
    }
    static async handleCallCompleted(callId, duration, transcript) {
        console.log(`[OpenAI SIP] Call ${callId} completed`);
        // Get the SIP call's details for credit deduction
        const sipCallResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, user_id, from_number, to_number FROM sip_calls 
      WHERE openai_call_id = ${callId} LIMIT 1
    `);
        const sipCall = sipCallResult.rows[0];
        // Update call record - use 'transcript' column (matches SQL migration)
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_calls SET 
        status = 'completed',
        duration_seconds = ${duration || 0},
        transcript = ${JSON.stringify(transcript || [])}::jsonb,
        ended_at = NOW(),
        updated_at = NOW()
      WHERE openai_call_id = ${callId}
    `);
        // Deduct credits for completed SIP call using centralized credit service
        if (sipCall && duration && duration > 0) {
            try {
                // Use deductSipCallCredits from credit-service (stable module, not webhook helpers)
                const { deductSipCallCredits } = await Promise.resolve().then(() => __importStar(require('../../../server/services/credit-service')));
                console.log(`💳 [OpenAI SIP] Processing credit deduction for ${duration}s call`);
                const creditResult = await deductSipCallCredits(sipCall.id, duration, 'openai-sip');
                if (creditResult.success) {
                    console.log(`✅ [OpenAI SIP] Credits deducted: ${creditResult.creditsDeducted}`);
                }
                else {
                    console.error(`❌ [OpenAI SIP] Credit deduction failed: ${creditResult.error}`);
                }
            }
            catch (creditError) {
                console.error(`❌ [OpenAI SIP] Credit deduction error:`, creditError.message);
            }
        }
        // Update flow execution status if this call has an associated flow execution
        try {
            if (sipCall) {
                await db_1.db.execute((0, drizzle_orm_1.sql) `
          UPDATE flow_executions SET 
            status = 'completed',
            completed_at = NOW()
          WHERE call_id = ${sipCall.id} 
            AND (status = 'running' OR status = 'pending')
        `);
                console.log(`[OpenAI SIP] Updated flow execution for call ${sipCall.id} to completed`);
            }
        }
        catch (flowExecError) {
            console.warn(`[OpenAI SIP] Failed to update flow execution status: ${flowExecError.message}`);
        }
    }
    static async handleCallFailed(callId, reason) {
        console.log(`[OpenAI SIP] Call ${callId} failed: ${reason}`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_calls SET 
        status = 'failed',
        metadata = jsonb_set(COALESCE(metadata, '{}'), '{failureReason}', ${JSON.stringify(reason)}),
        ended_at = NOW(),
        updated_at = NOW()
      WHERE openai_call_id = ${callId}
    `);
        // Update flow execution status if this call has an associated flow execution
        try {
            // First get the SIP call's internal ID
            const sipCallResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT id FROM sip_calls WHERE openai_call_id = ${callId} LIMIT 1
      `);
            const sipCall = sipCallResult.rows[0];
            if (sipCall) {
                await db_1.db.execute((0, drizzle_orm_1.sql) `
          UPDATE flow_executions SET 
            status = 'failed',
            completed_at = NOW(),
            error = ${`Call failed: ${reason}`}
          WHERE call_id = ${sipCall.id} 
            AND (status = 'running' OR status = 'pending')
        `);
                console.log(`[OpenAI SIP] Updated flow execution for call ${sipCall.id} to failed`);
            }
        }
        catch (flowExecError) {
            console.warn(`[OpenAI SIP] Failed to update flow execution status: ${flowExecError.message}`);
        }
    }
    static async provisionTrunk(userId, trunk) {
        try {
            const projectId = await this.getOpenAIProjectId();
            const sipEndpoint = this.getSipEndpoint(projectId);
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        UPDATE sip_trunks SET 
          openai_project_id = ${projectId},
          inbound_uri = ${sipEndpoint},
          updated_at = NOW()
        WHERE id = ${trunk.id}
      `);
            console.log(`[OpenAI SIP] Trunk provisioned with endpoint: ${sipEndpoint}`);
            return { success: true, sipEndpoint };
        }
        catch (error) {
            console.error(`[OpenAI SIP] Error provisioning trunk:`, error);
            return { success: false, error: error.message };
        }
    }
    static async importPhoneNumber(userId, trunk, phoneNumber, label, agentId) {
        console.log(`[OpenAI SIP] Importing phone number: ${phoneNumber}`);
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_phone_numbers (
        user_id, sip_trunk_id, phone_number, label, engine,
        agent_id, inbound_enabled, outbound_enabled
      )
      VALUES (
        ${userId}, ${trunk.id}, ${phoneNumber}, ${label || null},
        'openai-sip', ${agentId || null}, true, false
      )
      RETURNING *
    `);
        return result.rows[0];
    }
    static extractPhoneNumber(sipUri) {
        const match = sipUri.match(/sip:([^@]+)@/);
        if (match) {
            return match[1].replace(/[^\d+]/g, '');
        }
        return sipUri.replace(/[^\d+]/g, '');
    }
}
exports.OpenAISipService = OpenAISipService;
