"use strict";
/**
 * ElevenLabs SIP Service
 * Native SIP integration with ElevenLabs Conversational AI
 *
 * Official API Docs:
 * - Import Phone Number: https://elevenlabs.io/docs/api-reference/phone-numbers/create
 * - Outbound Call: https://elevenlabs.io/docs/api-reference/sip-trunk/outbound-call
 * - SIP Trunking Guide: https://elevenlabs.io/docs/agents-platform/phone-numbers/sip-trunking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsSipService = void 0;
const db_1 = require("../../../server/db");
const drizzle_orm_1 = require("drizzle-orm");
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const SIP_MOCK_MODE = process.env.SIP_MOCK_MODE === 'true';
// Provider SIP domains - some have universal domains, others require user-specific configuration
// Providers with empty host REQUIRE the user to provide their own account-specific termination URI
const PROVIDER_SIP_DOMAINS = {
    // These providers require account-specific termination URIs from user's provider console
    twilio: { host: '', port: 5060, requiresUserHost: true }, // User must enter: yourtrunk.pstn.twilio.com
    plivo: { host: '', port: 5060, requiresUserHost: true }, // User must enter: yourtrunk.sip.plivo.com
    vonage: { host: '', port: 5060, requiresUserHost: true }, // User must enter their Vonage SIP domain
    bandwidth: { host: '', port: 5060, requiresUserHost: true }, // User must enter their Bandwidth SIP domain
    ringcentral: { host: '', port: 5060, requiresUserHost: true }, // User must enter their RingCentral SIP domain
    sinch: { host: '', port: 5060, requiresUserHost: true }, // User must enter their Sinch SIP domain
    // These providers have universal SIP domains that work for all accounts
    telnyx: { host: 'sip.telnyx.com', port: 5060, requiresUserHost: false },
    exotel: { host: 'sip.exotel.com', port: 5060, requiresUserHost: false },
    didww: { host: 'sip.didww.com', port: 5060, requiresUserHost: false },
    zadarma: { host: 'pbx.zadarma.com', port: 5060, requiresUserHost: false },
    cloudonix: { host: 'sip.cloudonix.io', port: 5060, requiresUserHost: false },
    infobip: { host: 'sip.infobip.com', port: 5060, requiresUserHost: false },
    generic: { host: '', port: 5060, requiresUserHost: true },
};
/**
 * Convert snake_case database column names to camelCase for frontend
 * Handles special compound words like "elevenlabs" -> "ElevenLabs"
 */
const COMPOUND_WORD_FIXES = [
    [/Elevenlabs/g, 'ElevenLabs'],
    [/^elevenlabs/g, 'elevenLabs'],
    [/Openai/g, 'OpenAI'],
    [/^openai/g, 'openAI'],
];
function snakeToCamel(str) {
    let result = str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
class ElevenLabsSipService {
    static async getApiKey(userId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT elc.api_key
      FROM users u
      LEFT JOIN eleven_labs_credentials elc ON u.eleven_labs_credential_id = elc.id
      WHERE u.id = ${userId}
      LIMIT 1
    `);
        const user = result.rows[0];
        if (user?.api_key) {
            return user.api_key;
        }
        const defaultResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT api_key FROM eleven_labs_credentials 
      WHERE is_active = true 
      ORDER BY is_primary DESC 
      LIMIT 1
    `);
        const defaultCred = defaultResult.rows[0];
        if (defaultCred?.api_key) {
            return defaultCred.api_key;
        }
        throw new Error('No ElevenLabs API key configured');
    }
    /**
     * Find an existing phone number in ElevenLabs by phone number digits
     * Used to adopt orphaned phone numbers that exist in ElevenLabs but not in local DB
     */
    static async findExistingPhoneNumber(apiKey, phoneDigits) {
        try {
            const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers`, {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                },
            });
            if (!response.ok) {
                console.error(`[ElevenLabs SIP] Failed to list phone numbers: ${response.status}`);
                return null;
            }
            const data = await response.json();
            const phoneNumbers = data.phone_numbers || data || [];
            // Find matching phone number by comparing digits
            for (const phone of phoneNumbers) {
                const existingDigits = (phone.phone_number || '').replace(/[^\d]/g, '');
                if (existingDigits === phoneDigits || existingDigits.endsWith(phoneDigits) || phoneDigits.endsWith(existingDigits)) {
                    return {
                        phone_number_id: phone.phone_number_id,
                        phone_number: phone.phone_number,
                    };
                }
            }
            return null;
        }
        catch (error) {
            console.error(`[ElevenLabs SIP] Error finding existing phone number:`, error);
            return null;
        }
    }
    static async importPhoneNumber(userId, trunk, data) {
        if (SIP_MOCK_MODE) {
            console.log('[ElevenLabs SIP] Mock mode: Simulating phone number import');
            return this.createMockPhoneNumber(userId, trunk, data);
        }
        // Normalize phone number: remove +, spaces, dashes, parentheses - keep only digits
        const phoneNumberWithoutPlus = data.phoneNumber.replace(/[^\d]/g, '');
        // Check for existing phone number in local database to prevent duplicates
        // Use regex replacement in SQL to compare normalized digits
        const existingLocal = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, phone_number FROM sip_phone_numbers 
      WHERE user_id = ${userId}
      AND engine = 'elevenlabs-sip'
    `);
        // Compare normalized digits using same logic as findExistingPhoneNumber (endsWith either way)
        // This handles country code vs local number variants
        for (const row of existingLocal.rows) {
            const existingDigits = (row.phone_number || '').replace(/[^\d]/g, '');
            if (existingDigits === phoneNumberWithoutPlus ||
                existingDigits.endsWith(phoneNumberWithoutPlus) ||
                phoneNumberWithoutPlus.endsWith(existingDigits)) {
                const error = new Error('This phone number is already imported in your account.');
                error.statusCode = 409;
                throw error;
            }
        }
        const apiKey = await this.getApiKey(userId);
        // OUTBOUND settings (ElevenLabs → Provider for outgoing calls)
        const outboundTransport = trunk.transport === 'tls' ? 'tls' : 'tcp';
        // Both CREATE and PATCH endpoints use: "disabled", "allowed", "required"
        const mediaEncryption = trunk.mediaEncryption === 'require' ? 'required' :
            trunk.mediaEncryption === 'allow' ? 'allowed' : 'disabled';
        const providerDomain = PROVIDER_SIP_DOMAINS[trunk.provider] || PROVIDER_SIP_DOMAINS.generic;
        // Determine correct port based on OUTBOUND transport: TLS uses 5061, TCP uses 5060
        const defaultOutboundPort = outboundTransport === 'tls' ? 5061 : 5060;
        const { host: sipHost, port: parsedPort } = this.parseHostAndPort(trunk.sipHost || providerDomain.host || '', defaultOutboundPort);
        // Use transport-appropriate port unless user explicitly set a custom port
        const sipPort = trunk.sipPort || parsedPort;
        if (!sipHost) {
            const providerName = trunk.provider.charAt(0).toUpperCase() + trunk.provider.slice(1);
            if (providerDomain.requiresUserHost) {
                throw new Error(`SIP host is required for ${providerName}. Please enter your termination URI from your ${providerName} console (SIP Trunk settings).`);
            }
            throw new Error('SIP host is required. Please configure the SIP trunk with a valid host address.');
        }
        // Build inbound_trunk_config per ElevenLabs API:
        // - media_encryption: "disabled" | "allowed" | "required"
        // - remote_domains: array of domains allowed to send SIP
        // NOTE: NO credentials for inbound (Twilio doesn't authenticate TO ElevenLabs)
        // NOTE: NO allowed_numbers - allow all numbers to receive calls
        const inboundConfig = {
            media_encryption: mediaEncryption,
            remote_domains: [sipHost],
        };
        // Build outbound_trunk_config per ElevenLabs API:
        // - address: required (host:port)
        // - transport: "tcp" | "tls"
        // - media_encryption: "disabled" | "allowed" | "required"
        // - credentials: {username, password} - required for outbound auth to Twilio
        const outboundConfig = {
            address: `${sipHost}:${sipPort}`,
            transport: outboundTransport,
            media_encryption: mediaEncryption,
        };
        // Outbound REQUIRES credentials for authentication to Twilio/provider
        if (trunk.username && trunk.password) {
            outboundConfig.credentials = {
                username: trunk.username,
                password: trunk.password,
            };
        }
        const requestBody = {
            label: data.label || `SIP - ${data.phoneNumber}`,
            phone_number: phoneNumberWithoutPlus,
            provider_type: 'sip_trunk',
            inbound_trunk_config: inboundConfig,
            outbound_trunk_config: outboundConfig,
            ...(data.customHeaders ? { custom_headers: data.customHeaders } : {}),
        };
        console.log(`[ElevenLabs SIP] Importing phone number: ${data.phoneNumber}`);
        console.log(`[ElevenLabs SIP] Request body:`, JSON.stringify(requestBody, null, 2));
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ElevenLabs SIP] Import failed: ${response.status} - ${errorText}`);
            // Parse error and check for conflict (phone already exists)
            let errorMessage = 'Failed to import phone number';
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail?.status === 'phone_number_conflict') {
                    // Try to adopt the existing phone number
                    console.log(`[ElevenLabs SIP] Phone number conflict - attempting to adopt existing number...`);
                    const existingPhone = await this.findExistingPhoneNumber(apiKey, phoneNumberWithoutPlus);
                    if (existingPhone) {
                        console.log(`[ElevenLabs SIP] Found existing phone number: ${existingPhone.phone_number_id}`);
                        // Check if already in our database - first by external ID, then by normalized digits
                        const existingDbRecord = await db_1.db.execute((0, drizzle_orm_1.sql) `
              SELECT id, phone_number, external_elevenlabs_phone_id FROM sip_phone_numbers 
              WHERE user_id = ${userId}
              AND (external_elevenlabs_phone_id = ${existingPhone.phone_number_id}
                   OR engine = 'elevenlabs-sip')
            `);
                        // Check by external ID first, then by normalized digits (same logic as pre-import check)
                        for (const row of existingDbRecord.rows) {
                            const rec = row;
                            if (rec.external_elevenlabs_phone_id === existingPhone.phone_number_id) {
                                const error = new Error('This phone number is already registered in your account.');
                                error.statusCode = 409;
                                throw error;
                            }
                            const existingDigits = (rec.phone_number || '').replace(/[^\d]/g, '');
                            if (existingDigits === phoneNumberWithoutPlus ||
                                existingDigits.endsWith(phoneNumberWithoutPlus) ||
                                phoneNumberWithoutPlus.endsWith(existingDigits)) {
                                const error = new Error('This phone number is already registered in your account.');
                                error.statusCode = 409;
                                throw error;
                            }
                        }
                        // Adopt the orphaned phone number by creating local record
                        console.log(`[ElevenLabs SIP] Adopting orphaned phone number into local database...`);
                        const dbResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
              INSERT INTO sip_phone_numbers (
                user_id, trunk_id, sip_trunk_id, phone_number, label, engine,
                external_elevenlabs_phone_id, agent_id
              )
              VALUES (
                ${userId}, ${trunk.id}, ${trunk.id}, ${data.phoneNumber}, ${data.label || null},
                'elevenlabs-sip', ${existingPhone.phone_number_id}, ${data.agentId || null}
              )
              RETURNING *
            `);
                        console.log(`[ElevenLabs SIP] Successfully adopted existing phone number`);
                        return transformRow(dbResult.rows[0]);
                    }
                    // Could not find the number - might be in another account
                    const error = new Error('This phone number already exists in ElevenLabs but could not be adopted. It may be registered under a different account.');
                    error.statusCode = 409;
                    throw error;
                }
                errorMessage = errorJson.detail?.message || errorJson.message || errorMessage;
            }
            catch (parseError) {
                if (parseError.statusCode)
                    throw parseError;
                errorMessage = errorText || errorMessage;
            }
            const error = new Error(errorMessage);
            error.statusCode = response.status;
            throw error;
        }
        const result = await response.json();
        const phoneNumberId = result.phone_number_id;
        console.log(`[ElevenLabs SIP] Phone number imported: ${phoneNumberId}`);
        // POST (import) doesn't always set all fields properly.
        // Follow up with PATCH to ensure full configuration is applied.
        console.log(`[ElevenLabs SIP] Applying full SIP configuration via PATCH...`);
        const patchBody = {
            label: data.label || `SIP - ${data.phoneNumber}`,
            inbound_trunk_config: {
                media_encryption: mediaEncryption,
                remote_domains: [sipHost],
            },
            outbound_trunk_config: {
                address: `${sipHost}:${sipPort}`,
                transport: outboundTransport,
                media_encryption: mediaEncryption,
                ...(trunk.username && trunk.password ? {
                    credentials: {
                        username: trunk.username,
                        password: trunk.password,
                    }
                } : {}),
            },
        };
        console.log(`[ElevenLabs SIP] PATCH body:`, JSON.stringify(patchBody, null, 2));
        const patchResponse = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers/${phoneNumberId}`, {
            method: 'PATCH',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patchBody),
        });
        if (!patchResponse.ok) {
            const patchError = await patchResponse.text();
            console.warn(`[ElevenLabs SIP] PATCH config failed (non-fatal): ${patchResponse.status} - ${patchError}`);
            // Continue anyway - the phone number was imported successfully
        }
        else {
            console.log(`[ElevenLabs SIP] Full SIP configuration applied successfully`);
        }
        const dbResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_phone_numbers (
        user_id, trunk_id, sip_trunk_id, phone_number, label, engine,
        external_elevenlabs_phone_id, agent_id
      )
      VALUES (
        ${userId}, ${trunk.id}, ${trunk.id}, ${data.phoneNumber}, ${data.label || null},
        'elevenlabs-sip', ${phoneNumberId}, ${data.agentId || null}
      )
      RETURNING *
    `);
        return transformRow(dbResult.rows[0]);
    }
    static async makeOutboundCall(userId, phoneNumber, toNumber, agentId, clientData) {
        if (SIP_MOCK_MODE) {
            console.log('[ElevenLabs SIP] Mock mode: Simulating outbound call');
            return {
                success: true,
                conversationId: `mock_conv_${Date.now()}`,
                callId: `mock_call_${Date.now()}`,
            };
        }
        const apiKey = await this.getApiKey(userId);
        if (!phoneNumber.externalElevenLabsPhoneId) {
            throw new Error('Phone number not registered with ElevenLabs');
        }
        const agentResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT eleven_labs_agent_id FROM agents WHERE id = ${agentId} LIMIT 1
    `);
        const agent = agentResult.rows[0];
        if (!agent?.eleven_labs_agent_id) {
            throw new Error('Agent does not have an ElevenLabs agent ID');
        }
        const requestBody = {
            agent_id: agent.eleven_labs_agent_id,
            agent_phone_number_id: phoneNumber.externalElevenLabsPhoneId,
            to_number: toNumber.startsWith('+') ? toNumber : `+${toNumber}`,
            conversation_initiation_client_data: clientData,
        };
        console.log(`[ElevenLabs SIP] Making outbound call to ${toNumber}`);
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/sip-trunk/outbound-call`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ElevenLabs SIP] Outbound call failed: ${response.status} - ${errorText}`);
            return { success: false, error: errorText };
        }
        const result = await response.json();
        console.log(`[ElevenLabs SIP] Outbound call initiated: ${result.conversation_id}`);
        // Create sip_calls record for tracking and billing
        try {
            const sipCallResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO sip_calls (
          user_id, agent_id, sip_trunk_id, sip_phone_number_id,
          engine, elevenlabs_conversation_id, external_call_id, from_number, to_number,
          call_direction, direction, status, started_at
        )
        VALUES (
          ${userId}, ${agentId}, ${phoneNumber.sipTrunkId}, ${phoneNumber.id},
          'elevenlabs-sip', ${result.conversation_id}, ${result.sip_call_id || null},
          ${phoneNumber.phoneNumber}, ${toNumber.startsWith('+') ? toNumber : `+${toNumber}`},
          'outbound', 'outbound', 'initiated', NOW()
        )
        RETURNING *
      `);
            const sipCallRecord = sipCallResult.rows[0];
            console.log(`[ElevenLabs SIP] Created SIP call record: ${sipCallRecord?.id}`);
        }
        catch (dbError) {
            console.error(`[ElevenLabs SIP] Failed to create SIP call record:`, dbError.message);
            // Don't fail the call if DB insert fails
        }
        return {
            success: true,
            conversationId: result.conversation_id,
            callId: result.sip_call_id,
        };
    }
    static async assignAgentToPhoneNumber(userId, elevenLabsPhoneNumberId, agentId) {
        if (SIP_MOCK_MODE) {
            console.log('[ElevenLabs SIP] Mock mode: Simulating agent assignment');
            return;
        }
        const apiKey = await this.getApiKey(userId);
        let elevenLabsAgentId = null;
        if (agentId) {
            const agentResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT eleven_labs_agent_id FROM agents WHERE id = ${agentId} LIMIT 1
      `);
            const agent = agentResult.rows[0];
            elevenLabsAgentId = agent?.eleven_labs_agent_id;
        }
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers/${elevenLabsPhoneNumberId}`, {
            method: 'PATCH',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: elevenLabsAgentId,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ElevenLabs SIP] Agent assignment failed: ${response.status} - ${errorText}`);
            throw new Error(`Failed to assign agent: ${errorText}`);
        }
        console.log(`[ElevenLabs SIP] Agent ${agentId} assigned to phone number ${elevenLabsPhoneNumberId}`);
    }
    static async deletePhoneNumber(userId, elevenLabsPhoneNumberId) {
        if (SIP_MOCK_MODE) {
            console.log('[ElevenLabs SIP] Mock mode: Simulating phone number deletion');
            return;
        }
        const apiKey = await this.getApiKey(userId);
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers/${elevenLabsPhoneNumberId}`, {
            method: 'DELETE',
            headers: {
                'xi-api-key': apiKey,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ElevenLabs SIP] Delete failed: ${response.status} - ${errorText}`);
            throw new Error(`Failed to delete phone number: ${errorText}`);
        }
        console.log(`[ElevenLabs SIP] Phone number ${elevenLabsPhoneNumberId} deleted`);
    }
    static async getPhoneNumberDetails(userId, elevenLabsPhoneNumberId) {
        if (SIP_MOCK_MODE) {
            return { phone_number_id: elevenLabsPhoneNumberId, status: 'active' };
        }
        const apiKey = await this.getApiKey(userId);
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers/${elevenLabsPhoneNumberId}`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get phone number details: ${errorText}`);
        }
        return response.json();
    }
    static async updatePhoneNumberSipConfig(userId, elevenLabsPhoneNumberId, trunk, phoneNumber) {
        if (SIP_MOCK_MODE) {
            console.log('[ElevenLabs SIP] Mock mode: Simulating SIP config update');
            return { success: true };
        }
        const apiKey = await this.getApiKey(userId);
        // Normalize phone number: remove +, spaces, dashes, parentheses - keep only digits
        const phoneNumberWithoutPlus = phoneNumber.replace(/[^\d]/g, '');
        // OUTBOUND settings (ElevenLabs → Provider for outgoing calls)
        const outboundTransport = trunk.transport === 'tls' ? 'tls' : 'tcp';
        const mediaEncryption = trunk.mediaEncryption === 'require' ? 'required' :
            trunk.mediaEncryption === 'allow' ? 'allowed' : 'disabled';
        const providerDomain = PROVIDER_SIP_DOMAINS[trunk.provider] || PROVIDER_SIP_DOMAINS.generic;
        // Determine correct port based on OUTBOUND transport: TLS uses 5061, TCP uses 5060
        const defaultOutboundPort = outboundTransport === 'tls' ? 5061 : 5060;
        const { host: sipHost, port: parsedPort } = this.parseHostAndPort(trunk.sipHost || providerDomain.host || '', defaultOutboundPort);
        // Use transport-appropriate port unless user explicitly set a custom port
        const sipPort = trunk.sipPort || parsedPort;
        if (!sipHost) {
            const providerName = trunk.provider.charAt(0).toUpperCase() + trunk.provider.slice(1);
            if (providerDomain.requiresUserHost) {
                throw new Error(`SIP host is required for ${providerName}. Please enter your termination URI from your ${providerName} console (SIP Trunk settings).`);
            }
            throw new Error('SIP host is required. Please configure the SIP trunk with a valid host address.');
        }
        // Build inbound_trunk_config per ElevenLabs PATCH API:
        // - media_encryption: "disabled" | "allowed" | "required"
        // - remote_domains: array of domains allowed to send SIP
        // NOTE: NO credentials for inbound (Twilio doesn't authenticate TO ElevenLabs)
        // NOTE: NO allowed_numbers - allow all numbers to receive calls
        const inboundConfig = {
            media_encryption: mediaEncryption,
            remote_domains: [sipHost],
        };
        // Build outbound_trunk_config per ElevenLabs PATCH API:
        // - address: required (host:port)
        // - transport: "tcp" | "tls"
        // - media_encryption: "disabled" | "allowed" | "required"
        // - credentials: {username, password} - required for outbound auth to Twilio
        const outboundConfig = {
            address: `${sipHost}:${sipPort}`,
            transport: outboundTransport,
            media_encryption: mediaEncryption,
        };
        // Outbound REQUIRES credentials for authentication to Twilio/provider
        if (trunk.username && trunk.password) {
            outboundConfig.credentials = {
                username: trunk.username,
                password: trunk.password,
            };
        }
        const requestBody = {
            inbound_trunk_config: inboundConfig,
            outbound_trunk_config: outboundConfig,
        };
        console.log(`[ElevenLabs SIP] Updating SIP config for phone number: ${elevenLabsPhoneNumberId}`);
        console.log(`[ElevenLabs SIP] Request body:`, JSON.stringify(requestBody, null, 2));
        const response = await fetch(`${ELEVENLABS_API_BASE}/convai/phone-numbers/${elevenLabsPhoneNumberId}`, {
            method: 'PATCH',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ElevenLabs SIP] SIP config update failed: ${response.status} - ${errorText}`);
            throw new Error(`Failed to update SIP config: ${errorText}`);
        }
        console.log(`[ElevenLabs SIP] SIP config updated successfully for ${elevenLabsPhoneNumberId}`);
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { success: true, phoneNumberId: elevenLabsPhoneNumberId };
        }
        try {
            return await response.json();
        }
        catch {
            return { success: true, phoneNumberId: elevenLabsPhoneNumberId };
        }
    }
    static async createMockPhoneNumber(userId, trunk, data) {
        const mockElevenLabsId = `mock_${Date.now()}`;
        const dbResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO sip_phone_numbers (
        user_id, trunk_id, sip_trunk_id, phone_number, label, engine,
        external_elevenlabs_phone_id, agent_id
      )
      VALUES (
        ${userId}, ${trunk.id}, ${trunk.id}, ${data.phoneNumber}, ${data.label || null},
        'elevenlabs-sip', ${mockElevenLabsId}, ${data.agentId || null}
      )
      RETURNING *
    `);
        return transformRow(dbResult.rows[0]);
    }
    static parseHostAndPort(rawHost, defaultPort) {
        if (!rawHost) {
            return { host: '', port: defaultPort };
        }
        if (rawHost.startsWith('[')) {
            const bracketEnd = rawHost.indexOf(']');
            if (bracketEnd > 0) {
                const host = rawHost.substring(1, bracketEnd);
                const portPart = rawHost.substring(bracketEnd + 1);
                if (portPart.startsWith(':')) {
                    const parsed = parseInt(portPart.substring(1), 10);
                    return { host, port: !isNaN(parsed) ? parsed : defaultPort };
                }
                return { host, port: defaultPort };
            }
        }
        const atIndex = rawHost.indexOf('@');
        const hostPart = atIndex > -1 ? rawHost.substring(atIndex + 1) : rawHost;
        const lastColonIndex = hostPart.lastIndexOf(':');
        if (lastColonIndex > -1) {
            const possiblePort = hostPart.substring(lastColonIndex + 1);
            const parsed = parseInt(possiblePort, 10);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 65535) {
                return { host: hostPart.substring(0, lastColonIndex), port: parsed };
            }
        }
        return { host: hostPart, port: defaultPort };
    }
    static isIpAddress(host) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        return ipv4Regex.test(host) || ipv6Regex.test(host);
    }
}
exports.ElevenLabsSipService = ElevenLabsSipService;
