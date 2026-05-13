/**
 * ============================================================
 * SIP Engine Plugin - Type Definitions
 * 
 * Updated to support multiple SIP providers for ElevenLabs and OpenAI SIP engines
 * ============================================================
 */

export type SipEngine = 'elevenlabs-sip' | 'openai-sip';

export type SipProvider = 
  | 'twilio' 
  | 'plivo' 
  | 'telnyx' 
  | 'vonage' 
  | 'exotel' 
  | 'bandwidth' 
  | 'didww'
  | 'zadarma'
  | 'cloudonix'
  | 'ringcentral'
  | 'sinch'
  | 'infobip'
  | 'generic';

export type SipTransport = 'tcp' | 'tls' | 'udp';

export type MediaEncryption = 'disable' | 'allow' | 'require';

export type SipCallDirection = 'inbound' | 'outbound';

export type SipCallStatus = 
  | 'initiated'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no-answer'
  | 'cancelled';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface SipProviderCredentials {
  id: string;
  userId: string;
  provider: SipProvider;
  name: string;
  sipHost: string;
  sipPort: number;
  transport: SipTransport;
  mediaEncryption: MediaEncryption;
  username?: string;
  password?: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  isActive: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SipTrunk {
  id: string;
  userId: string;
  name: string;
  engine: SipEngine;
  provider: SipProvider;
  sipHost: string;
  sipPort: number;
  transport: SipTransport; // Outbound transport (ElevenLabs → Provider)
  mediaEncryption: MediaEncryption;
  // Inbound-specific settings (Provider → ElevenLabs)
  // Can differ from outbound - e.g., Twilio uses TCP:5060 inbound but TLS:5061 outbound
  inboundTransport?: SipTransport;
  inboundPort?: number;
  username?: string;
  password?: string;
  elevenLabsTrunkId?: string;
  openaiProjectId?: string;
  inboundUri?: string;
  isActive: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SipPhoneNumber {
  id: string;
  userId: string;
  sipTrunkId: string;
  phoneNumber: string;
  label?: string;
  engine: SipEngine;
  externalElevenLabsPhoneId?: string;
  externalFonosterPhoneId?: string;
  agentId?: string;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SipCall {
  id: string;
  userId: string;
  agentId?: string;
  campaignId?: string;
  contactId?: string;
  sipTrunkId?: string;
  sipPhoneNumberId?: string;
  engine: SipEngine;
  externalCallId?: string;
  openaiCallId?: string;
  elevenlabsConversationId?: string;
  fromNumber?: string;
  toNumber?: string;
  direction: SipCallDirection;
  status: SipCallStatus;
  durationSeconds: number;
  creditsUsed: number;
  recordingUrl?: string;
  transcript?: TranscriptEntry[];
  aiSummary?: string;
  sipHeaders?: Record<string, string>;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface CreateSipTrunkRequest {
  name: string;
  engine: SipEngine;
  provider: SipProvider;
  sipHost: string;
  sipPort?: number;
  transport?: SipTransport;  // Outbound transport (ElevenLabs → Provider)
  inboundTransport?: SipTransport;  // Inbound transport (Provider → ElevenLabs)
  inboundPort?: number;  // Inbound port (ElevenLabs listens here)
  mediaEncryption?: MediaEncryption;
  username?: string;
  password?: string;
}

export interface ImportSipPhoneNumberRequest {
  sipTrunkId: string;
  phoneNumber: string;
  label?: string;
  agentId?: string;
  customHeaders?: Record<string, string>;
}

export interface ElevenLabsSipTrunkConfig {
  outbound: {
    address: string;
    transport: 'tcp' | 'tls';
    media_encryption: 'allowed' | 'disabled' | 'required';
    username?: string;
    password?: string;
  };
  inbound?: {
    transport: 'tcp' | 'tls';
    media_encryption: 'allowed' | 'disabled' | 'required';
  };
  custom_headers?: Record<string, string>;
}

export interface ElevenLabsCredentials {
  username: string;
  password?: string;
}

export interface ElevenLabsInboundTrunkConfig {
  transport?: 'auto' | 'udp' | 'tcp' | 'tls';
  media_encryption: 'allowed' | 'disabled' | 'required';
  allowed_addresses?: string[];  // IP addresses/CIDR blocks
  allowed_numbers?: string[];    // Phone numbers allowed to call
  remote_domains?: string[];     // For TLS certificate validation
  credentials?: ElevenLabsCredentials;  // Digest auth (optional for inbound)
}

export interface ElevenLabsOutboundTrunkConfig {
  address: string;
  transport?: 'auto' | 'udp' | 'tcp' | 'tls';  // ElevenLabs API uses 'transport' for outbound
  media_encryption: 'allowed' | 'disabled' | 'required';
  headers?: Record<string, string>;  // SIP X-* headers for INVITE
  credentials?: ElevenLabsCredentials;  // Digest auth for outbound calls
}

export interface ElevenLabsImportPhoneNumberRequest {
  label: string;
  phone_number: string;
  provider_type: 'sip_trunk';
  inbound_trunk_config: ElevenLabsInboundTrunkConfig;
  outbound_trunk_config: ElevenLabsOutboundTrunkConfig;
  custom_headers?: Record<string, string>;
}

export interface ElevenLabsSipConfigUpdateRequest {
  inbound_trunk_config: ElevenLabsInboundTrunkConfig;
  outbound_trunk_config: ElevenLabsOutboundTrunkConfig;
  agent_id?: string | null;
}

export interface ElevenLabsOutboundCallRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
  conversation_initiation_client_data?: Record<string, unknown>;
}

export interface OpenAIRealtimeCallIncomingEvent {
  object: 'event';
  id: string;
  type: 'realtime.call.incoming';
  created_at: number;
  data: {
    call_id: string;
    sip_headers: Array<{
      name: string;
      value: string;
    }>;
  };
}

export interface OpenAIAcceptCallRequest {
  type: 'realtime';
  model: string;
  instructions: string;
  voice?: string;
  tools?: Array<{
    type: string;
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  }>;
  input_audio_transcription?: {
    model: string;
  };
}

export interface PlanSipSettings {
  sipEnabled: boolean;
  maxConcurrentSipCalls: number;
  sipEnginesAllowed: SipEngine[];
}

export interface AdminSipSettings {
  pluginEnabled: boolean;
  defaultMaxConcurrentCalls: number;
  mockMode: boolean;
}

export const SIP_PROVIDER_INFO: Record<SipProvider, { name: string; defaultHost: string; defaultPort: number; transport: SipTransport }> = {
  twilio: { name: 'Twilio', defaultHost: 'sip.twilio.com', defaultPort: 5061, transport: 'tls' },
  plivo: { name: 'Plivo', defaultHost: 'sip.plivo.com', defaultPort: 5060, transport: 'tcp' },
  telnyx: { name: 'Telnyx', defaultHost: 'sip.telnyx.com', defaultPort: 5061, transport: 'tls' },
  vonage: { name: 'Vonage', defaultHost: 'sip.vonage.com', defaultPort: 5060, transport: 'tcp' },
  exotel: { name: 'Exotel', defaultHost: 'sip.exotel.com', defaultPort: 5060, transport: 'tcp' },
  bandwidth: { name: 'Bandwidth', defaultHost: 'sip.bandwidth.com', defaultPort: 5060, transport: 'tcp' },
  didww: { name: 'DIDWW', defaultHost: 'sip.didww.com', defaultPort: 5060, transport: 'tcp' },
  zadarma: { name: 'Zadarma', defaultHost: 'sip.zadarma.com', defaultPort: 5060, transport: 'tcp' },
  cloudonix: { name: 'Cloudonix', defaultHost: 'sip.cloudonix.io', defaultPort: 5060, transport: 'tcp' },
  ringcentral: { name: 'RingCentral', defaultHost: 'sip.ringcentral.com', defaultPort: 5060, transport: 'tcp' },
  sinch: { name: 'Sinch', defaultHost: 'sip.sinch.com', defaultPort: 5060, transport: 'tcp' },
  infobip: { name: 'Infobip', defaultHost: 'sip.infobip.com', defaultPort: 5060, transport: 'tcp' },
  generic: { name: 'Generic SIP', defaultHost: '', defaultPort: 5060, transport: 'tcp' },
};
