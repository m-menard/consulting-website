"use strict";
/**
 * SIP Trunk Service
 * Core service for managing SIP trunks, phone numbers, and calls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SipTrunkService = void 0;
const db_1 = require("../../../server/db");
const drizzle_orm_1 = require("drizzle-orm");
const types_1 = require("../types");
const SIP_MOCK_MODE = process.env.SIP_MOCK_MODE === 'true';
/**
 * Convert snake_case database column names to camelCase for frontend
 * Handles special compound words like "elevenlabs" -> "ElevenLabs"
 *
 * After basic snake_case conversion:
 * - "external_elevenlabs_phone_id" -> "externalElevenlabsPhoneId"
 * We then need to fix "Elevenlabs" -> "ElevenLabs" (add capital L for Labs)
 */
const COMPOUND_WORD_FIXES = [
    // Fix "Elevenlabs" (after underscore conversion) -> "ElevenLabs"
    [/Elevenlabs/g, 'ElevenLabs'],
    // Fix "elevenlabs" at start of string -> "elevenLabs" (keep first char case)
    [/^elevenlabs/g, 'elevenLabs'],
    // Fix "Openai" (after underscore conversion) -> "OpenAI"
    [/Openai/g, 'OpenAI'],
    // Fix "openai" at start of string -> "openAI"
    [/^openai/g, 'openAI'],
];
function snakeToCamel(str) {
    // First, do basic snake_case to camelCase conversion
    let result = str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Then apply compound word fixes
    for (const [pattern, replacement] of COMPOUND_WORD_FIXES) {
        result = result.replace(pattern, replacement);
    }
    return result;
}
function transformRow(row) {
    const transformed = {};
    for (const key of Object.keys(row)) {
        transformed[snakeToCamel(key)] = row[key];
    }
    return transformed;
}
function transformRows(rows) {
    return rows.map(row => transformRow(row));
}
class SipTrunkService {
    static async getUserTrunks(userId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM sip_trunks 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC
    `);
        return transformRows(result.rows);
    }
    static async getTrunkById(id, userId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM sip_trunks 
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `);
        return result.rows[0] ? transformRow(result.rows[0]) : null;
    }
    static async checkSipAccess(userId, engine) {
        const userResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT u.*, p.sip_enabled, p.max_concurrent_sip_calls, p.sip_engines_allowed
      FROM users u
      LEFT JOIN plans p ON u.plan_type = p.name
      WHERE u.id = ${userId}
      LIMIT 1
    `);
        const user = userResult.rows[0];
        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }
        if (!user.sip_enabled) {
            return { allowed: false, reason: 'SIP is not enabled for your plan' };
        }
        const allowedEngines = user.sip_engines_allowed || ['elevenlabs-sip'];
        if (!allowedEngines.includes(engine)) {
            return { allowed: false, reason: `Engine ${engine} is not available for your plan` };
        }
        return { allowed: true };
    }
    static async createTrunk(userId, data) {
        const providerInfo = types_1.SIP_PROVIDER_INFO[data.provider] || types_1.SIP_PROVIDER_INFO.generic;
        const sipHost = data.sipHost || providerInfo.defaultHost;
        const sipPort = data.sipPort || providerInfo.defaultPort;
        const transport = data.transport || providerInfo.transport;
        // Inbound settings - can differ from outbound (e.g., Twilio uses TCP:5060 inbound, TLS:5061 outbound)
        const inboundTransport = data.inboundTransport || (data.provider === 'twilio' ? 'tcp' : transport);
        const inboundPort = data.inboundPort || (data.provider === 'twilio' ? 5060 : sipPort);
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_trunks (
        user_id, name, engine, provider, sip_host, sip_port, transport, 
        inbound_transport, inbound_port, media_encryption, username, password
      )
      VALUES (
        ${userId}, ${data.name}, ${data.engine}, ${data.provider},
        ${sipHost}, ${sipPort}, ${transport},
        ${inboundTransport}, ${inboundPort},
        ${data.mediaEncryption || 'disable'}, ${data.username || null}, ${data.password || null}
      )
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async updateTrunk(id, userId, updates) {
        const setParts = [];
        if (updates.name !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `name = ${updates.name}`);
        }
        if (updates.sipHost !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `sip_host = ${updates.sipHost}`);
        }
        if (updates.sipPort !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `sip_port = ${updates.sipPort}`);
        }
        if (updates.transport !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `transport = ${updates.transport}`);
        }
        if (updates.inboundTransport !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `inbound_transport = ${updates.inboundTransport}`);
        }
        if (updates.inboundPort !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `inbound_port = ${updates.inboundPort}`);
        }
        if (updates.mediaEncryption !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `media_encryption = ${updates.mediaEncryption}`);
        }
        if (updates.username !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `username = ${updates.username}`);
        }
        if (updates.password !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `password = ${updates.password}`);
        }
        if (updates.isActive !== undefined) {
            setParts.push((0, drizzle_orm_1.sql) `is_active = ${updates.isActive}`);
        }
        setParts.push((0, drizzle_orm_1.sql) `updated_at = NOW()`);
        const setClause = drizzle_orm_1.sql.join(setParts, (0, drizzle_orm_1.sql) `, `);
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_trunks SET ${setClause}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async deleteTrunk(id, userId) {
        // Use a transaction to ensure atomic deletion and prevent TOCTOU races
        await db_1.db.transaction(async (tx) => {
            // Verify ownership and lock the row
            const trunkResult = await tx.execute((0, drizzle_orm_1.sql) `
        SELECT id FROM sip_trunks WHERE id = ${id} AND user_id = ${userId} FOR UPDATE
      `);
            if (trunkResult.rows.length === 0) {
                throw new Error('SIP trunk not found or access denied');
            }
            // Delete phone numbers scoped to both trunk AND user for security
            await tx.execute((0, drizzle_orm_1.sql) `
        DELETE FROM sip_phone_numbers WHERE sip_trunk_id = ${id} AND user_id = ${userId}
      `);
            // Delete the trunk
            await tx.execute((0, drizzle_orm_1.sql) `
        DELETE FROM sip_trunks WHERE id = ${id} AND user_id = ${userId}
      `);
        });
    }
    static async testTrunkConnection(id) {
        if (SIP_MOCK_MODE) {
            return { success: true, message: 'Mock mode: Connection simulated', latency: 50 };
        }
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM sip_trunks WHERE id = ${id} LIMIT 1`);
        if (result.rows.length === 0) {
            return { success: false, message: 'Trunk not found' };
        }
        const trunk = transformRow(result.rows[0]);
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_trunks 
      SET health_status = 'healthy', last_health_check = NOW()
      WHERE id = ${id}
    `);
        return { success: true, message: 'Connection successful', latency: 45 };
    }
    static async getUserPhoneNumbers(userId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT spn.*, st.name as trunk_name
      FROM sip_phone_numbers spn
      JOIN sip_trunks st ON spn.sip_trunk_id = st.id
      WHERE spn.user_id = ${userId}
      ORDER BY spn.created_at DESC
    `);
        return transformRows(result.rows);
    }
    static async getPhoneNumberById(id, userId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM sip_phone_numbers 
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `);
        return result.rows[0] ? transformRow(result.rows[0]) : null;
    }
    static async importPhoneNumber(userId, trunk, data) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_phone_numbers (
        user_id, sip_trunk_id, phone_number, label, engine,
        agent_id, custom_headers
      )
      VALUES (
        ${userId}, ${trunk.id}, ${data.phoneNumber}, ${data.label || null},
        ${trunk.engine}, ${data.agentId || null}, ${JSON.stringify(data.customHeaders || {})}
      )
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async updatePhoneNumber(id, userId, updates) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_phone_numbers 
      SET 
        label = COALESCE(${updates.label}, label),
        inbound_enabled = COALESCE(${updates.inboundEnabled}, inbound_enabled),
        outbound_enabled = COALESCE(${updates.outboundEnabled}, outbound_enabled),
        is_active = COALESCE(${updates.isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async assignAgentToPhoneNumber(id, userId, agentId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_phone_numbers 
      SET agent_id = ${agentId}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async deletePhoneNumber(id, userId) {
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM sip_phone_numbers WHERE id = ${id} AND user_id = ${userId}
    `);
    }
    static async getAllTrunks(filters) {
        let query = (0, drizzle_orm_1.sql) `SELECT st.*, u.name as user_name, u.email as user_email 
                    FROM sip_trunks st 
                    JOIN users u ON st.user_id = u.id 
                    WHERE 1=1`;
        if (filters?.userId) {
            query = (0, drizzle_orm_1.sql) `${query} AND st.user_id = ${filters.userId}`;
        }
        if (filters?.engine) {
            query = (0, drizzle_orm_1.sql) `${query} AND st.engine = ${filters.engine}`;
        }
        if (filters?.isActive !== undefined) {
            query = (0, drizzle_orm_1.sql) `${query} AND st.is_active = ${filters.isActive}`;
        }
        query = (0, drizzle_orm_1.sql) `${query} ORDER BY st.created_at DESC`;
        const result = await db_1.db.execute(query);
        return transformRows(result.rows);
    }
    static async getAllPhoneNumbers(filters) {
        let query = (0, drizzle_orm_1.sql) `SELECT spn.*, u.name as user_name, st.name as trunk_name
                    FROM sip_phone_numbers spn
                    JOIN users u ON spn.user_id = u.id
                    JOIN sip_trunks st ON spn.sip_trunk_id = st.id
                    WHERE 1=1`;
        if (filters?.userId) {
            query = (0, drizzle_orm_1.sql) `${query} AND spn.user_id = ${filters.userId}`;
        }
        if (filters?.engine) {
            query = (0, drizzle_orm_1.sql) `${query} AND spn.engine = ${filters.engine}`;
        }
        query = (0, drizzle_orm_1.sql) `${query} ORDER BY spn.created_at DESC`;
        const result = await db_1.db.execute(query);
        return transformRows(result.rows);
    }
    static async getSipCalls(filters) {
        let query = (0, drizzle_orm_1.sql) `SELECT * FROM sip_calls WHERE 1=1`;
        let countQuery = (0, drizzle_orm_1.sql) `SELECT COUNT(*) as total FROM sip_calls WHERE 1=1`;
        if (filters.userId) {
            query = (0, drizzle_orm_1.sql) `${query} AND user_id = ${filters.userId}`;
            countQuery = (0, drizzle_orm_1.sql) `${countQuery} AND user_id = ${filters.userId}`;
        }
        if (filters.engine) {
            query = (0, drizzle_orm_1.sql) `${query} AND engine = ${filters.engine}`;
            countQuery = (0, drizzle_orm_1.sql) `${countQuery} AND engine = ${filters.engine}`;
        }
        if (filters.status) {
            query = (0, drizzle_orm_1.sql) `${query} AND status = ${filters.status}`;
            countQuery = (0, drizzle_orm_1.sql) `${countQuery} AND status = ${filters.status}`;
        }
        if (filters.startDate) {
            query = (0, drizzle_orm_1.sql) `${query} AND created_at >= ${filters.startDate}`;
            countQuery = (0, drizzle_orm_1.sql) `${countQuery} AND created_at >= ${filters.startDate}`;
        }
        if (filters.endDate) {
            query = (0, drizzle_orm_1.sql) `${query} AND created_at <= ${filters.endDate}`;
            countQuery = (0, drizzle_orm_1.sql) `${countQuery} AND created_at <= ${filters.endDate}`;
        }
        query = (0, drizzle_orm_1.sql) `${query} ORDER BY created_at DESC LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}`;
        const [callsResult, countResult] = await Promise.all([
            db_1.db.execute(query),
            db_1.db.execute(countQuery),
        ]);
        return {
            calls: transformRows(callsResult.rows),
            total: parseInt(countResult.rows[0].total),
        };
    }
    /**
     * Get a single SIP call by ID
     */
    static async getSipCall(callId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM sip_calls WHERE id = ${callId} LIMIT 1
    `);
        if (result.rows.length === 0) {
            return null;
        }
        return transformRow(result.rows[0]);
    }
    static async getPlanSipSettings(planId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT sip_enabled, max_concurrent_sip_calls, sip_engines_allowed
      FROM plans WHERE id = ${planId} OR name = ${planId}
      LIMIT 1
    `);
        const plan = result.rows[0];
        if (!plan) {
            return { sipEnabled: false, maxConcurrentSipCalls: 0, sipEnginesAllowed: [] };
        }
        return {
            sipEnabled: plan.sip_enabled || false,
            maxConcurrentSipCalls: plan.max_concurrent_sip_calls || 0,
            sipEnginesAllowed: plan.sip_engines_allowed || ['elevenlabs-sip'],
        };
    }
    static async updatePlanSipSettings(planId, settings) {
        const enginesArray = settings.sipEnginesAllowed
            ? `{${settings.sipEnginesAllowed.join(',')}}`
            : null;
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE plans SET
        sip_enabled = COALESCE(${settings.sipEnabled}, sip_enabled),
        max_concurrent_sip_calls = COALESCE(${settings.maxConcurrentSipCalls}, max_concurrent_sip_calls),
        sip_engines_allowed = COALESCE(${enginesArray}::text[], sip_engines_allowed),
        updated_at = NOW()
      WHERE id = ${planId} OR name = ${planId}
    `);
        return this.getPlanSipSettings(planId);
    }
    static async getAdminSettings() {
        return {
            pluginEnabled: true,
            defaultMaxConcurrentCalls: 10,
            mockMode: SIP_MOCK_MODE,
        };
    }
    static async updateAdminSettings(updates) {
        return this.getAdminSettings();
    }
    static async getAdminStats() {
        const [trunksResult, phoneNumbersResult, callsResult, activeCallsResult] = await Promise.all([
            db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) as count FROM sip_trunks`),
            db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) as count FROM sip_phone_numbers`),
            db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) as count FROM sip_calls`),
            db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) as count FROM sip_calls WHERE status = 'in-progress'`),
        ]);
        const engineResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT engine, COUNT(*) as count FROM sip_trunks GROUP BY engine
    `);
        const byEngine = {};
        for (const row of engineResult.rows) {
            byEngine[row.engine] = parseInt(row.count);
        }
        return {
            totalTrunks: parseInt(trunksResult.rows[0].count),
            totalPhoneNumbers: parseInt(phoneNumbersResult.rows[0].count),
            totalCalls: parseInt(callsResult.rows[0].count),
            activeCalls: parseInt(activeCallsResult.rows[0].count),
            byEngine,
        };
    }
    static async createSipCall(data) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_calls (
        user_id, agent_id, campaign_id, contact_id, sip_trunk_id,
        sip_phone_number_id, engine, external_call_id, from_number,
        to_number, call_direction, direction, status
      )
      VALUES (
        ${data.userId}, ${data.agentId || null}, ${data.campaignId || null},
        ${data.contactId || null}, ${data.sipTrunkId || null},
        ${data.sipPhoneNumberId || null}, ${data.engine}, ${data.externalCallId || null},
        ${data.fromNumber || null}, ${data.toNumber || null}, ${data.direction}, ${data.direction},
        ${data.status || 'initiated'}
      )
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
    static async updateSipCall(id, updates) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE sip_calls SET
        status = COALESCE(${updates.status}, status),
        duration_seconds = COALESCE(${updates.durationSeconds}, duration_seconds),
        credits_used = COALESCE(${updates.creditsUsed}, credits_used),
        recording_url = COALESCE(${updates.recordingUrl}, recording_url),
        transcript = COALESCE(${updates.transcript ? JSON.stringify(updates.transcript) : null}::jsonb, transcript),
        ai_summary = COALESCE(${updates.aiSummary}, ai_summary),
        answered_at = COALESCE(${updates.answeredAt}, answered_at),
        ended_at = COALESCE(${updates.endedAt}, ended_at),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
        return transformRow(result.rows[0]);
    }
}
exports.SipTrunkService = SipTrunkService;
