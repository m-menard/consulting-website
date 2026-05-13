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
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, doublePrecision, serial, date, time, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  planType: text("plan_type").notNull().default("free"), // 'free' or 'pro'
  planExpiresAt: timestamp("plan_expires_at"),
  credits: integer("credits").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  maxWebhooks: integer("max_webhooks").notNull().default(3), // Webhook subscription limit (admin can adjust)
  isDeleted: boolean("is_deleted").notNull().default(false), // Soft delete flag - user requested account deletion
  deletedAt: timestamp("deleted_at"), // When the user requested deletion
  deletedBy: varchar("deleted_by"), // Who deleted: 'user' for self-deletion, admin user ID for admin deletion
  // Timezone preference - IANA timezone string (e.g., "America/New_York", "Europe/London")
  timezone: text("timezone"),
  // GDPR Consent preferences
  cookieConsent: boolean("cookie_consent"), // Essential cookies always enabled, this tracks analytics/marketing consent
  analyticsConsent: boolean("analytics_consent"),
  marketingConsent: boolean("marketing_consent"),
  consentTimestamp: timestamp("consent_timestamp"), // When user gave/updated consent
  termsAcceptedAt: timestamp("terms_accepted_at"), // When user accepted Terms of Service
  privacyAcceptedAt: timestamp("privacy_accepted_at"), // When user accepted Privacy Policy
  // User blocking for content violations
  blockedReason: text("blocked_reason"), // Reason for blocking (e.g., "Content violation: banned words detected")
  blockedAt: timestamp("blocked_at"), // When the user was blocked
  blockedBy: varchar("blocked_by"), // Admin who blocked the user
  // ElevenLabs Multi-Key Pool Affinity - Once assigned, user's agents and phone numbers stay on this key
  elevenLabsCredentialId: varchar("eleven_labs_credential_id"), // References elevenLabsCredentials.id (can't use .references() due to declaration order)
  // User-level KYC for phone number purchases
  kycStatus: text("kyc_status").default("pending"), // pending, submitted, approved, rejected
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycApprovedAt: timestamp("kyc_approved_at"),
  kycRejectionReason: text("kyc_rejection_reason"),
  // Billing Details - Stored for payment processing and pre-filling
  billingName: text("billing_name"),
  billingAddressLine1: text("billing_address_line1"),
  billingAddressLine2: text("billing_address_line2"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingPostalCode: text("billing_postal_code"),
  billingCountry: text("billing_country"),
  company: text("company"), // Company name for profile and team naming
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// OTP Verifications for signup
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  otpCode: text("otp_code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Refresh Tokens for session management
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ElevenLabs API Key Pool
export const elevenLabsCredentials = pgTable("eleven_labs_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Friendly name for the key (e.g., "Primary Account", "Backup Key 1")
  apiKey: text("api_key").notNull(),
  webhookSecret: text("webhook_secret"), // HMAC secret for verifying webhooks from this ElevenLabs workspace (nullable for migration)
  isActive: boolean("is_active").notNull().default(true),
  maxConcurrency: integer("max_concurrency").notNull().default(30), // ElevenLabs default limit
  currentLoad: integer("current_load").notNull().default(0), // Current active calls using this key
  totalAssignedAgents: integer("total_assigned_agents").notNull().default(0), // How many agents use this key
  totalAssignedUsers: integer("total_assigned_users").notNull().default(0), // How many users are assigned to this key
  maxAgentsThreshold: integer("max_agents_threshold").notNull().default(100), // Soft limit before moving to next key
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status").notNull().default("healthy"), // healthy, degraded, unhealthy
  metadata: jsonb("metadata"), // For storing additional info like account tier, limits, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Synced Voices - Tracks which shared library voices have been synced to which pool credentials
export const syncedVoices = pgTable("synced_voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: varchar("credential_id").notNull().references(() => elevenLabsCredentials.id, { onDelete: "cascade" }),
  voiceId: text("voice_id").notNull(), // ElevenLabs voice_id
  publicOwnerId: text("public_owner_id").notNull(), // Voice owner's public ID for API call
  voiceName: text("voice_name"), // Cached voice name for display
  status: text("status").notNull().default("synced"), // synced, failed, pending
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => ({
  credentialVoiceUnique: unique().on(table.credentialId, table.voiceId),
}));

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  elevenLabsCredentialId: varchar("eleven_labs_credential_id").references(() => elevenLabsCredentials.id, { onDelete: "set null" }), // Which API key this agent uses
  
  // Telephony Provider Configuration - Determines which engine handles calls
  // 'twilio' = ElevenLabs Conversational AI via Twilio (default)
  // 'plivo' = Plivo telephony + OpenAI Realtime API
  // 'twilio_openai' = Twilio telephony + OpenAI Realtime API
  // 'elevenlabs-sip' = ElevenLabs native SIP (user's own SIP trunk)
  // 'openai-sip' = OpenAI Realtime API with SIP (incoming only)
  telephonyProvider: text("telephony_provider").default("twilio"), // 'twilio' | 'plivo' | 'twilio_openai' | 'elevenlabs-sip' | 'openai-sip'
  
  // SIP Trunk Configuration (used when telephonyProvider='elevenlabs-sip' or 'openai-sip')
  sipTrunkId: varchar("sip_trunk_id"), // References sip_trunks.id for SIP-based engines
  sipPhoneNumberId: varchar("sip_phone_number_id"), // References sip_phone_numbers.id for SIP-based calls
  
  // OpenAI Realtime Configuration (used when telephonyProvider='plivo', 'twilio_openai', or 'openai-sip')
  openaiVoice: text("openai_voice"), // 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse' | 'cedar' | 'marin'
  openaiCredentialId: varchar("openai_credential_id"), // References openaiCredentials.id (can't use .references() due to declaration order)
  
  // Agent Type: Determines execution pipeline and usage
  // NO DEFAULT - must be explicitly set to prevent misconfiguration
  type: text("type").notNull(), // 'incoming' (ElevenLabs Conversational AI for receiving calls) or 'flow' (STT+TTS+FlowExecutionBridge for campaigns)
  
  // Incoming Agent Fields (used when type='incoming')
  // Incoming agents are used for receiving calls on purchased phone numbers with call transfer capability
  name: text("name").notNull(),
  voiceTone: text("voice_tone"),
  personality: text("personality"),
  systemPrompt: text("system_prompt"),
  language: text("language").default("en"),
  firstMessage: text("first_message").default("Hello! How can I help you today?"),
  llmModel: text("llm_model").default("gpt-4o-mini"),
  temperature: doublePrecision("temperature").default(0.5),
  elevenLabsAgentId: text("eleven_labs_agent_id"),
  
  // Call Transfer Configuration (for incoming agents)
  transferPhoneNumber: text("transfer_phone_number"),
  transferEnabled: boolean("transfer_enabled").default(false),
  
  // ElevenLabs System Tools Configuration (for incoming agents)
  detectLanguageEnabled: boolean("detect_language_enabled").default(false),
  endConversationEnabled: boolean("end_conversation_enabled").default(false),
  appointmentBookingEnabled: boolean("appointment_booking_enabled").default(false),
  
  // Knowledge Base (for incoming agents)
  knowledgeBaseIds: text("knowledge_base_ids").array(),
  
  // Shared Voice Configuration (used by both Incoming and Flow agents)
  elevenLabsVoiceId: text("eleven_labs_voice_id"),
  voiceStability: doublePrecision("voice_stability").default(0.55),
  voiceSimilarityBoost: doublePrecision("voice_similarity_boost").default(0.85),
  voiceSpeed: doublePrecision("voice_speed").default(1.0),
  
  // Flow Agent Fields (used when type='flow')
  flowId: varchar("flow_id"), // Reference to flows table for Flow Agents
  maxDurationSeconds: integer("max_duration_seconds").default(600), // Max conversation duration in seconds (default 10 min, range 60-1800)
  
  // Incoming Calls Configuration (unified - any agent can receive incoming calls)
  incomingEnabled: boolean("incoming_enabled").default(false),
  incomingPhoneNumberId: varchar("incoming_phone_number_id"),

  // Legacy/Common Fields
  agentLink: text("agent_link"),
  config: jsonb("config"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  fileUrl: text("file_url"),
  elevenLabsDocId: text("eleven_labs_doc_id"),
  metadata: jsonb("metadata"),
  storageSize: integer("storage_size").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Incoming Agents - Completely isolated from campaign agents
// Used for receiving calls on purchased phone numbers with call transfer capability
export const incomingAgents = pgTable("incoming_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  elevenLabsCredentialId: varchar("eleven_labs_credential_id").references(() => elevenLabsCredentials.id, { onDelete: "set null" }),
  
  // Basic Configuration
  name: text("name").notNull(),
  elevenLabsAgentId: text("eleven_labs_agent_id").notNull(), // Always uses ElevenLabs Conversational AI
  elevenLabsVoiceId: text("eleven_labs_voice_id").notNull(),
  language: text("language").notNull().default("en"),
  
  // AI Configuration
  systemPrompt: text("system_prompt").notNull(),
  personality: text("personality").default("helpful"),
  voiceTone: text("voice_tone").default("professional"),
  firstMessage: text("first_message").notNull().default("Hello! How can I help you today?"),
  llmModel: text("llm_model").default("gpt-4o-mini"),
  temperature: doublePrecision("temperature").default(0.5),
  
  // Call Transfer Configuration
  transferPhoneNumber: text("transfer_phone_number"), // Phone number to transfer calls to
  transferEnabled: boolean("transfer_enabled").notNull().default(false),
  
  // Business Hours Configuration
  businessHoursEnabled: boolean("business_hours_enabled").notNull().default(false),
  businessHoursStart: text("business_hours_start"), // Format: "09:00"
  businessHoursEnd: text("business_hours_end"), // Format: "17:00"
  businessDays: text("business_days").array(), // ["monday", "tuesday", etc.]
  businessHoursTimezone: text("business_hours_timezone").default("America/New_York"),
  afterHoursMessage: text("after_hours_message").default("Thank you for calling. We're currently closed. Please call back during business hours."),
  
  // Knowledge Base
  knowledgeBaseIds: text("knowledge_base_ids").array(),
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const phoneNumbers = pgTable("phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for system pool numbers
  phoneNumber: text("phone_number").notNull().unique(),
  twilioSid: text("twilio_sid").notNull().unique(),
  elevenLabsPhoneNumberId: text("eleven_labs_phone_number_id"), // ElevenLabs phone_number_id for synced numbers
  elevenLabsCredentialId: varchar("eleven_labs_credential_id").references(() => elevenLabsCredentials.id, { onDelete: "set null" }), // Which API key this phone number uses (for multi-API key pool isolation)
  friendlyName: text("friendly_name"),
  country: text("country").notNull().default("US"),
  capabilities: jsonb("capabilities"),
  status: text("status").notNull().default("active"),
  isSystemPool: boolean("is_system_pool").notNull().default(false), // For free plan numbers
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  monthlyCredits: integer("monthly_credits"), // Credits charged per month for user-purchased numbers
  nextBillingDate: timestamp("next_billing_date"), // Next date when credits will be charged
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  
  // DEPRECATED: Use incoming_connections table instead
  assignedIncomingAgentId: varchar("assigned_incoming_agent_id").references(() => incomingAgents.id, { onDelete: "set null" }),
});

// Incoming Connections - Links incoming agents (type='incoming') to phone numbers
// One connection per phone number, allowing users to route incoming calls to specific agents
export const incomingConnections = pgTable("incoming_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }), // Must be type='incoming'
  phoneNumberId: varchar("phone_number_id").notNull().references(() => phoneNumbers.id, { onDelete: "cascade" }).unique(), // One connection per phone number
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  voiceId: text("voice_id"),
  phoneNumberId: varchar("phone_number_id").references(() => phoneNumbers.id, { onDelete: "set null" }),
  sipPhoneNumberId: varchar("sip_phone_number_id"), // References sip_phone_numbers.id for SIP-based campaigns (plugin)
  plivoPhoneNumberId: varchar("plivo_phone_number_id"), // References plivo_phone_numbers.id for Plivo-based campaigns
  flowId: varchar("flow_id"),  // Reference to visual conversation flow (mutually exclusive with script)
  name: text("name").notNull(),
  type: text("type").notNull(),
  goal: text("goal"),
  script: text("script"),
  status: text("status").notNull().default("pending"),
  totalContacts: integer("total_contacts").notNull().default(0),
  completedCalls: integer("completed_calls").notNull().default(0),
  successfulCalls: integer("successful_calls").notNull().default(0),
  failedCalls: integer("failed_calls").notNull().default(0),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  deletedAt: timestamp("deleted_at"),
  // Campaign Time Scheduling
  scheduleEnabled: boolean("schedule_enabled").notNull().default(false), // Whether to respect time windows
  scheduleTimeStart: text("schedule_time_start"), // Start time in HH:MM format (e.g., "09:00")
  scheduleTimeEnd: text("schedule_time_end"), // End time in HH:MM format (e.g., "17:00")
  scheduleDays: text("schedule_days").array(), // Array of days: ["monday", "tuesday", "wednesday", etc.]
  scheduleTimezone: text("schedule_timezone").default("America/New_York"), // Timezone for the schedule
  
  // ElevenLabs Batch Calling Integration
  batchJobId: text("batch_job_id"), // ElevenLabs batch job ID when campaign is running
  batchJobStatus: text("batch_job_status"), // pending, in_progress, completed, failed, cancelled
  retryEnabled: boolean("retry_enabled").notNull().default(false), // Whether to auto-retry failed/no-response calls
  
  // Error tracking for failed campaigns
  errorMessage: text("error_message"), // Detailed error message when campaign fails
  errorCode: text("error_code"), // Error code for categorization (e.g., AGENT_NOT_SYNCED, NO_CONTACTS)
  
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  phone: text("phone").notNull(),
  email: text("email"),
  customFields: jsonb("custom_fields"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Direct user ownership for guaranteed isolation
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }), // Nullable for test/manual/incoming calls
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }), // Nullable for test/incoming calls
  
  // Agent references - either from campaign (agentId via campaigns table) or incoming call (via connection)
  incomingConnectionId: varchar("incoming_connection_id").references(() => incomingConnections.id, { onDelete: "set null" }), // For incoming calls
  
  // Website Widget reference - for calls initiated through embeddable widgets
  widgetId: varchar("widget_id"), // References websiteWidgets.id (added later in schema)
  
  // DEPRECATED: Use incomingConnectionId instead
  incomingAgentId: varchar("incoming_agent_id").references(() => incomingAgents.id, { onDelete: "set null" }),
  
  phoneNumber: text("phone_number"), // Phone number dialed/caller (for test calls without contacts, or incoming caller)
  fromNumber: text("from_number"), // The phone number that initiated the call (caller ID)
  toNumber: text("to_number"), // The phone number that received the call (destination)
  twilioSid: text("twilio_sid"),
  elevenLabsConversationId: text("elevenlabs_conversation_id"), // ElevenLabs conversation ID for fetching details/recordings
  status: text("status").notNull().default("pending"),
  callDirection: text("call_direction").notNull().default("outgoing"), // 'incoming' or 'outgoing'
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  classification: text("classification"),
  sentiment: text("sentiment"),
  metadata: jsonb("metadata"),
  wasTransferred: boolean("was_transferred").default(false), // Whether call was transferred
  transferredTo: text("transferred_to"), // Number call was transferred to
  transferredAt: timestamp("transferred_at"), // When call was transferred
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  stripePaymentId: text("stripe_payment_id").unique(), // Unique constraint for idempotency
  widgetId: varchar("widget_id"), // For widget-originated credit deductions
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userReferenceUnique: uniqueIndex("credit_transactions_user_reference_unique")
    .on(table.userId, table.reference)
    .where(sql`reference IS NOT NULL`),
}));

export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voices = pgTable("voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  elevenLabsVoiceId: text("eleven_labs_voice_id"),
  gender: text("gender"),
  accent: text("accent"),
  tone: text("tone"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New SaaS Platform Tables
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // 'free' or 'pro'
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(), // USD price
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }), // USD price
  razorpayMonthlyPrice: decimal("razorpay_monthly_price", { precision: 10, scale: 2 }), // INR price
  razorpayYearlyPrice: decimal("razorpay_yearly_price", { precision: 10, scale: 2 }), // INR price
  stripeMonthlyPriceId: text("stripe_monthly_price_id"), // Stripe Price ID for monthly plan
  stripeYearlyPriceId: text("stripe_yearly_price_id"), // Stripe Price ID for yearly plan
  stripeProductId: text("stripe_product_id"), // Stripe Product ID
  razorpayPlanId: text("razorpay_plan_id"), // Razorpay Plan ID (monthly)
  razorpayYearlyPlanId: text("razorpay_yearly_plan_id"), // Razorpay Plan ID (yearly)
  
  // PayPal pricing and plan IDs
  paypalMonthlyPrice: decimal("paypal_monthly_price", { precision: 10, scale: 2 }), // PayPal price (supports multiple currencies)
  paypalYearlyPrice: decimal("paypal_yearly_price", { precision: 10, scale: 2 }),
  paypalProductId: text("paypal_product_id"), // PayPal Product ID
  paypalMonthlyPlanId: text("paypal_monthly_plan_id"), // PayPal Plan ID for monthly
  paypalYearlyPlanId: text("paypal_yearly_plan_id"), // PayPal Plan ID for yearly
  
  // Paystack pricing and plan codes (Africa: NGN, GHS, ZAR, KES)
  paystackMonthlyPrice: decimal("paystack_monthly_price", { precision: 10, scale: 2 }),
  paystackYearlyPrice: decimal("paystack_yearly_price", { precision: 10, scale: 2 }),
  paystackMonthlyPlanCode: text("paystack_monthly_plan_code"), // Paystack Plan Code for monthly
  paystackYearlyPlanCode: text("paystack_yearly_plan_code"), // Paystack Plan Code for yearly
  
  // MercadoPago pricing and plan IDs (LATAM: BRL, MXN, ARS, CLP, COP)
  mercadopagoMonthlyPrice: decimal("mercadopago_monthly_price", { precision: 10, scale: 2 }),
  mercadopagoYearlyPrice: decimal("mercadopago_yearly_price", { precision: 10, scale: 2 }),
  mercadopagoMonthlyPlanId: text("mercadopago_monthly_plan_id"), // MercadoPago preapproval_plan_id
  mercadopagoYearlyPlanId: text("mercadopago_yearly_plan_id"),
  
  maxAgents: integer("max_agents").notNull().default(1),
  maxCampaigns: integer("max_campaigns").notNull().default(1),
  maxContactsPerCampaign: integer("max_contacts_per_campaign").notNull().default(5),
  maxWebhooks: integer("max_webhooks").notNull().default(3), // Max webhook subscriptions
  maxKnowledgeBases: integer("max_knowledge_bases").notNull().default(5), // Max knowledge base items
  maxFlows: integer("max_flows").notNull().default(3), // Max flow automations
  maxPhoneNumbers: integer("max_phone_numbers").notNull().default(1), // Max rented phone numbers
  maxWidgets: integer("max_widgets").notNull().default(1), // Max website widgets
  includedCredits: integer("included_credits").notNull().default(0),
  defaultLlmModel: text("default_llm_model"), // For free plan restrictions
  canChooseLlm: boolean("can_choose_llm").notNull().default(false),
  canPurchaseNumbers: boolean("can_purchase_numbers").notNull().default(false),
  useSystemPool: boolean("use_system_pool").notNull().default(true), // Free plan uses system pool
  features: jsonb("features"), // Additional feature flags
  
  // SIP Engine Plugin - Plan-level access control
  sipEnabled: boolean("sip_enabled").notNull().default(false),
  maxConcurrentSipCalls: integer("max_concurrent_sip_calls").notNull().default(1),
  sipEnginesAllowed: text("sip_engines_allowed").array().default(sql`ARRAY['elevenlabs-sip']::text[]`), // ['elevenlabs-sip', 'openai-sip']
  
  // REST API Plugin - Plan-level access control
  restApiEnabled: boolean("rest_api_enabled").notNull().default(false),
  
  // Team Management Plugin - Plan-level access control
  teamManagementEnabled: boolean("team_management_enabled").notNull().default(false),
  maxTeamMembers: integer("max_team_members").notNull().default(0), // 0 = disabled
  maxCustomRoles: integer("max_custom_roles").notNull().default(0), // 0 = disabled
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Global Platform Settings
export const globalSettings = pgTable("global_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LLM Models - Available models with tier restrictions
export const llmModels = pgTable("llm_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelId: text("model_id").notNull().unique(), // e.g., 'gpt-4o-mini', 'claude-3-5-sonnet'
  name: text("name").notNull(), // Display name e.g., 'GPT-4o Mini (OpenAI)'
  provider: text("provider").notNull(), // 'openai', 'anthropic', 'google', 'elevenlabs'
  tier: text("tier").notNull(), // 'free' or 'pro'
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // For custom ordering in UI
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Supported Languages - Available languages with provider support
export const supportedLanguages = pgTable("supported_languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO 639-1 code e.g., 'en', 'es', 'fr'
  label: text("label").notNull(), // Display name e.g., 'English', 'Spanish'
  providers: text("providers").notNull(), // 'elevenlabs', 'openai', or 'both'
  sortOrder: integer("sort_order").notNull().default(0), // For custom ordering in UI
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit Packages
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // USD price
  razorpayPrice: decimal("razorpay_price", { precision: 10, scale: 2 }), // INR price
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  razorpayItemId: text("razorpay_item_id"), // Razorpay Item ID for credit package
  
  // PayPal credit package pricing
  paypalPrice: decimal("paypal_price", { precision: 10, scale: 2 }), // PayPal price
  
  // Paystack credit package pricing (Africa)
  paystackPrice: decimal("paystack_price", { precision: 10, scale: 2 }), // Paystack price
  
  // MercadoPago credit package pricing (LATAM)
  mercadopagoPrice: decimal("mercadopago_price", { precision: 10, scale: 2 }), // MercadoPago price
  isPopular: boolean("is_popular").default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(), // Unique constraint for idempotency
  razorpaySubscriptionId: text("razorpay_subscription_id").unique(), // Razorpay Subscription ID
  
  // PayPal subscription tracking
  paypalSubscriptionId: text("paypal_subscription_id").unique(), // PayPal Subscription ID
  
  // Paystack subscription tracking (Africa)
  paystackSubscriptionCode: text("paystack_subscription_code").unique(), // Paystack Subscription Code
  paystackCustomerCode: text("paystack_customer_code"), // Paystack Customer Code
  paystackEmailToken: text("paystack_email_token"), // Token for customer management
  
  // MercadoPago subscription tracking (LATAM)
  mercadopagoSubscriptionId: text("mercadopago_subscription_id").unique(), // MercadoPago preapproval ID
  
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  billingPeriod: text("billing_period").notNull().default("monthly"), // 'monthly' or 'yearly'
  
  // Admin-set per-user limit overrides (null = use plan defaults)
  overrideMaxAgents: integer("override_max_agents"), // Override plan's maxAgents
  overrideMaxCampaigns: integer("override_max_campaigns"), // Override plan's maxCampaigns
  overrideMaxContactsPerCampaign: integer("override_max_contacts_per_campaign"), // Override plan's maxContactsPerCampaign
  overrideMaxWebhooks: integer("override_max_webhooks"), // Override plan's maxWebhooks
  overrideMaxKnowledgeBases: integer("override_max_knowledge_bases"), // Override plan's maxKnowledgeBases
  overrideMaxFlows: integer("override_max_flows"), // Override plan's maxFlows
  overrideMaxPhoneNumbers: integer("override_max_phone_numbers"), // Override plan's maxPhoneNumbers
  overrideMaxWidgets: integer("override_max_widgets"), // Override plan's maxWidgets
  overrideIncludedCredits: integer("override_included_credits"), // Override plan's includedCredits
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Phone Number Rental Billing History
export const phoneNumberRentals = pgTable("phone_number_rentals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumberId: varchar("phone_number_id").notNull().references(() => phoneNumbers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditsCharged: integer("credits_charged").notNull(),
  billingDate: timestamp("billing_date").notNull().defaultNow(),
  status: text("status").notNull().default("success"), // 'success', 'failed', 'insufficient_credits'
  transactionId: varchar("transaction_id").references(() => creditTransactions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Usage Records
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id, { onDelete: "cascade" }),
  callId: varchar("call_id").references(() => calls.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  minutesUsed: integer("minutes_used").notNull().default(0),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  billingStatus: text("billing_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Legacy Webhooks - DEPRECATED: Use webhookSubscriptions from flow-automation
// Uses original database table name 'webhooks' to preserve existing data
export const legacyWebhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Legacy Webhook Delivery Logs - DEPRECATED
// Uses original database table name 'webhook_deliveries' to preserve existing data
export const legacyWebhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => legacyWebhooks.id, { onDelete: "cascade" }),
  callId: varchar("call_id").references(() => calls.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  payload: jsonb("payload").notNull(),
  errorMessage: text("error_message"),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for broadcast notifications
  type: text("type").notNull(), // low_credits, membership_upgraded, membership_expiry, campaign_completed, campaign_failed, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to navigate when clicked
  icon: text("icon"), // Custom icon name (lucide icon name)
  displayType: text("display_type").notNull().default("bell"), // 'bell', 'banner', or 'both'
  priority: integer("priority").notNull().default(0), // For ordering banner notifications (higher = more important)
  dismissible: boolean("dismissible").notNull().default(true), // Whether the notification can be dismissed
  expiresAt: timestamp("expires_at"), // When the notification should expire (null = never)
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false), // For banner dismissals
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email Templates - Customizable email templates for system notifications
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateType: text("template_type").notNull().unique(), // 'otp', 'welcome', 'low_credits', 'campaign_complete', 'membership_upgrade', etc.
  name: text("name").notNull(), // Display name for admin
  subject: text("subject").notNull(), // Email subject line with variable support
  htmlBody: text("html_body").notNull(), // HTML email body with variable support
  textBody: text("text_body").notNull(), // Plain text fallback with variable support
  variables: text("variables").array(), // Available variables: ['userName', 'companyName', 'code', etc.]
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Prompt Templates - Reusable system prompts with variable placeholders
// Users can create templates with {{variable}} syntax for personalization
export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null = system template
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"), // 'sales', 'support', 'appointment', 'survey', 'general'
  systemPrompt: text("system_prompt").notNull(),
  firstMessage: text("first_message"),
  variables: text("variables").array(), // Available variables: ['company', 'product', 'customerName', etc.]
  suggestedVoiceTone: text("suggested_voice_tone"), // Recommended voice settings
  suggestedPersonality: text("suggested_personality"),
  isSystemTemplate: boolean("is_system_template").notNull().default(false), // System-provided templates
  isPublic: boolean("is_public").notNull().default(false), // Can be used by other users
  usageCount: integer("usage_count").notNull().default(0), // Track popularity
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Agent Version History - Track changes to agents for rollback and audit
export const agentVersions = pgTable("agent_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  snapshot: jsonb("snapshot").notNull().$type<{
    name: string;
    type: string;
    voiceTone?: string | null;
    personality?: string | null;
    systemPrompt?: string | null;
    language?: string | null;
    firstMessage?: string | null;
    llmModel?: string | null;
    temperature?: number | null;
    elevenLabsVoiceId?: string | null;
    voiceStability?: number | null;
    voiceSimilarityBoost?: number | null;
    voiceSpeed?: number | null;
    transferPhoneNumber?: string | null;
    transferEnabled?: boolean | null;
    detectLanguageEnabled?: boolean | null;
    endConversationEnabled?: boolean | null;
    knowledgeBaseIds?: string[] | null;
    maxDurationSeconds?: number | null;
    config?: Record<string, unknown> | null;
  }>(),
  changesSummary: text("changes_summary"), // Human-readable summary of what changed
  changedFields: text("changed_fields").array(), // Array of field names that changed
  editedBy: varchar("edited_by").references(() => users.id, { onDelete: "set null" }),
  note: text("note"), // Optional note about why changes were made
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit Logs - Track sensitive operations for security and compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // e.g., 'user.login', 'admin.user_update', 'payment.subscription_created'
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // User who performed the action
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "set null" }), // User affected by the action
  resourceType: text("resource_type"), // e.g., 'agent', 'campaign', 'payment'
  resourceId: varchar("resource_id"), // ID of the affected resource
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional context
  severity: text("severity").notNull().default("info"), // 'info', 'warning', 'error', 'critical'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Platform Languages - UI languages with translations (admin-managed)
export const platformLanguages = pgTable("platform_languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO 639-1 code e.g., 'en', 'es', 'ar'
  name: text("name").notNull(), // Display name e.g., 'English', 'Spanish'
  nativeName: text("native_name").notNull(), // Native name e.g., 'English', 'Español'
  flag: text("flag"), // Flag emoji e.g., '🇺🇸', '🇪🇸'
  direction: text("direction").notNull().default("ltr"), // 'ltr' or 'rtl'
  isEnabled: boolean("is_enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false), // Only one can be default
  sortOrder: integer("sort_order").notNull().default(0),
  translations: jsonb("translations").notNull().$type<Record<string, unknown>>(), // Full translation keys
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
});

export const insertElevenLabsCredentialSchema = createInsertSchema(elevenLabsCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentLoad: true,
  totalAssignedAgents: true,
});

export const insertSyncedVoiceSchema = createInsertSchema(syncedVoices).omit({
  id: true,
  syncedAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
});

export const insertIncomingAgentSchema = createInsertSchema(incomingAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export const insertAgentVersionSchema = createInsertSchema(agentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertIncomingConnectionSchema = createInsertSchema(incomingConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  completedCalls: true,
  successfulCalls: true,
  failedCalls: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});


export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceSchema = createInsertSchema(voices).omit({
  id: true,
  createdAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGlobalSettingsSchema = createInsertSchema(globalSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertLlmModelSchema = createInsertSchema(llmModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportedLanguageSchema = createInsertSchema(supportedLanguages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformLanguageSchema = createInsertSchema(platformLanguages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Coerce number inputs to strings for decimal fields (frontend sends numbers)
  isPopular: z.boolean().optional().default(false),
  price: z.union([z.string(), z.number()]).transform(v => String(v)),
  razorpayPrice: z.union([z.string(), z.number()]).transform(v => v != null ? String(v) : null).nullable().optional(),
  paypalPrice: z.union([z.string(), z.number()]).transform(v => v != null ? String(v) : null).nullable().optional(),
  paystackPrice: z.union([z.string(), z.number()]).transform(v => v != null ? String(v) : null).nullable().optional(),
  mercadopagoPrice: z.union([z.string(), z.number()]).transform(v => v != null ? String(v) : null).nullable().optional(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
});

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  createdAt: true,
});

// Legacy webhook schemas - DEPRECATED: Use flow-automation webhook schemas
export const insertLegacyWebhookSchema = createInsertSchema(legacyWebhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLegacyWebhookDeliverySchema = createInsertSchema(legacyWebhookDeliveries).omit({
  id: true,
  createdAt: true,
});

export const insertPhoneNumberRentalSchema = createInsertSchema(phoneNumberRentals).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
  isDismissed: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Twilio Supported Countries for Phone Number Purchasing
export const twilioCountries = pgTable("twilio_countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 2 }).notNull().unique(), // ISO 3166-1 alpha-2 code (e.g., "US", "GB")
  name: text("name").notNull(),
  dialCode: text("dial_code").notNull(), // International dialing code (e.g., "+1", "+44")
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100), // For display ordering (popular countries first)
});

export const insertTwilioCountrySchema = createInsertSchema(twilioCountries).omit({
  id: true,
});

export type TwilioCountry = typeof twilioCountries.$inferSelect;
export type InsertTwilioCountry = z.infer<typeof insertTwilioCountrySchema>;

// ============================================
// RAG KNOWLEDGE BASE SYSTEM
// ============================================
// Separate from legacy ElevenLabs KB - stores chunks with embeddings locally
// Allows unlimited per-user storage without ElevenLabs 20MB limit

// User storage limits for RAG knowledge base
export const userKnowledgeStorageLimits = pgTable("user_knowledge_storage_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  maxStorageBytes: integer("max_storage_bytes").notNull().default(20971520), // 20MB default per user
  usedStorageBytes: integer("used_storage_bytes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge chunks with embeddings for RAG retrieval
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(), // Order within the document
  chunkText: text("chunk_text").notNull(), // The actual text content
  embedding: jsonb("embedding"), // Vector embedding as JSON array of floats
  tokenCount: integer("token_count").notNull().default(0),
  metadata: jsonb("metadata"), // Page number, section, source info
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Processing queue for async embedding generation
export const knowledgeProcessingQueue = pgTable("knowledge_processing_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  totalChunks: integer("total_chunks").default(0),
  processedChunks: integer("processed_chunks").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserKnowledgeStorageLimitSchema = createInsertSchema(userKnowledgeStorageLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeProcessingQueueSchema = createInsertSchema(knowledgeProcessingQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserKnowledgeStorageLimit = typeof userKnowledgeStorageLimits.$inferSelect;
export type InsertUserKnowledgeStorageLimit = z.infer<typeof insertUserKnowledgeStorageLimitSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeProcessingQueue = typeof knowledgeProcessingQueue.$inferSelect;
export type InsertKnowledgeProcessingQueue = z.infer<typeof insertKnowledgeProcessingQueueSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ElevenLabsCredential = typeof elevenLabsCredentials.$inferSelect;
export type InsertElevenLabsCredential = z.infer<typeof insertElevenLabsCredentialSchema>;
export type SyncedVoice = typeof syncedVoices.$inferSelect;
export type InsertSyncedVoice = z.infer<typeof insertSyncedVoiceSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type IncomingAgent = typeof incomingAgents.$inferSelect;
export type InsertIncomingAgent = z.infer<typeof insertIncomingAgentSchema>;
export type IncomingConnection = typeof incomingConnections.$inferSelect;
export type InsertIncomingConnection = z.infer<typeof insertIncomingConnectionSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Voice = typeof voices.$inferSelect;
export type InsertVoice = z.infer<typeof insertVoiceSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type GlobalSettings = typeof globalSettings.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;
export type LlmModel = typeof llmModels.$inferSelect;
export type InsertLlmModel = z.infer<typeof insertLlmModelSchema>;
export type SupportedLanguage = typeof supportedLanguages.$inferSelect;
export type InsertSupportedLanguage = z.infer<typeof insertSupportedLanguageSchema>;
export type PlatformLanguage = typeof platformLanguages.$inferSelect;
export type InsertPlatformLanguage = z.infer<typeof insertPlatformLanguageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
// Legacy webhook types - DEPRECATED: Use Webhook/WebhookLog from flow-automation
export type LegacyWebhook = typeof legacyWebhooks.$inferSelect;
export type InsertLegacyWebhook = z.infer<typeof insertLegacyWebhookSchema>;
export type LegacyWebhookDelivery = typeof legacyWebhookDeliveries.$inferSelect;
export type InsertLegacyWebhookDelivery = z.infer<typeof insertLegacyWebhookDeliverySchema>;
export type PhoneNumberRental = typeof phoneNumberRentals.$inferSelect;
export type InsertPhoneNumberRental = z.infer<typeof insertPhoneNumberRentalSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

export type AgentVersion = typeof agentVersions.$inferSelect;
export type InsertAgentVersion = z.infer<typeof insertAgentVersionSchema>;

// ============================================
// AGENT CONFIG INTERFACE (for agents.config JSONB field)
// ============================================

/**
 * AgentConfig represents the JSONB config stored on agents table.
 * Contains ElevenLabs-specific configuration and transfer rules.
 */
export interface AgentConfig {
  elevenLabsVoiceId?: string;
  model?: string;
  firstMessage?: string;
  temperature?: number;
  transferRules?: TransferRule[];
  knowledgeBaseIds?: string[];
}

/**
 * Transfer rule configuration for call transfers
 */
export interface TransferRule {
  transfer_type: "conference" | "warm_transfer" | "cold_transfer";
  number_type: "phone" | "sip";
  destination: string;
  condition?: string;
  customer_message?: string;
  operator_message?: string;
}

/**
 * CallMetadata represents the JSONB metadata stored on calls table.
 * Contains call-specific metadata and tracking information.
 */
export interface CallMetadata {
  elevenLabsNative?: boolean;
  conversationId?: string;
  error?: string;
  [key: string]: unknown; // Allow additional metadata fields
}

// ============================================
// FLOW AUTOMATION TABLES
// ============================================

// Flow node types
export type FlowNodeType = 
  | "message"      // AI speaks text
  | "question"     // AI asks and waits for response
  | "condition"    // Branch based on response
  | "appointment"  // Book appointment
  | "form"         // Collect form data
  | "webhook"      // Fire webhook
  | "transfer"     // Transfer call
  | "delay"        // Pause conversation
  | "play_audio"   // Play audio file
  | "end";         // End call

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: NodeConfig;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Node-specific configurations
export type NodeConfig = 
  | MessageNodeConfig
  | QuestionNodeConfig
  | ConditionNodeConfig
  | AppointmentNodeConfig
  | FormNodeConfig
  | WebhookNodeConfig
  | TransferNodeConfig
  | DelayNodeConfig
  | PlayAudioNodeConfig
  | EndNodeConfig;

export interface MessageNodeConfig {
  type: "message";
  message: string;
  waitForResponse?: boolean; // Default: false - proceed immediately after speaking
}

export interface QuestionNodeConfig {
  type: "question";
  question: string;
  variableName: string;
  expectedResponseType?: "text" | "number" | "yes_no";
  waitForResponse?: boolean; // Default: true - wait for user answer before proceeding
}

export interface ConditionNodeConfig {
  type: "condition";
  conditions: {
    type: "keyword" | "sentiment" | "yes_no";
    value: string;
    targetNodeId: string;
    label: string;
  }[];
  defaultTargetNodeId?: string;
}

export interface AppointmentNodeConfig {
  type: "appointment";
  confirmMessage: string;
  serviceName?: string;
  duration: number;
  waitForResponse?: boolean; // Default: true - wait for data collection to complete
}

export interface FormNodeConfig {
  type: "form";
  formId: string;
  waitForResponse?: boolean; // Default: true - wait for form data collection to complete
}

export interface WebhookNodeConfig {
  type: "webhook";
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  payload: Record<string, any>;
}

export interface TransferNodeConfig {
  type: "transfer";
  transferNumber: string;
  message: string;
}

export interface DelayNodeConfig {
  type: "delay";
  seconds: number;
  waitForResponse?: boolean; // Default: false - proceed after delay
}

export interface PlayAudioNodeConfig {
  type: "play_audio";
  audioUrl: string;           // Server URL after upload (e.g., /audio/uuid.mp3)
  audioFileName?: string;     // Original filename for display
  interruptible?: boolean;    // Allow user to interrupt playback (default: false)
  waitForComplete?: boolean;  // Wait for audio to finish before continuing (default: true)
}

export interface EndNodeConfig {
  type: "end";
  message?: string;
  waitForResponse?: boolean; // Not used for end nodes, included for consistency
}

// Voice & Execution Settings
export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  speakingRate?: number;
  pitch?: number;
  style?: number;
}

export interface ExecutionConfig {
  enableRecording?: boolean;
  maxDuration?: number;
  timeoutBehavior?: "end" | "repeat_last";
  noInputRetries?: number;
  enableTranscript?: boolean;
}

// Compiled OpenAI Voice Agent types for flows
export interface CompiledConversationState {
  id: string;
  description: string;
  instructions: string[];
  examples?: string[];
  transitions: Array<{ next_step: string; condition: string }>;
}

export interface CompiledFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

// Flows table
export const flows = pgTable("flows", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().$type<FlowNode[]>(),
  edges: jsonb("edges").notNull().$type<FlowEdge[]>(),
  agentId: varchar("agent_id"),
  voiceSettings: jsonb("voice_settings").$type<VoiceSettings>(),
  executionConfig: jsonb("execution_config").$type<ExecutionConfig>(),
  isActive: boolean("is_active").default(true).notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  compiledSystemPrompt: text("compiled_system_prompt"),
  compiledFirstMessage: text("compiled_first_message"),
  compiledStates: jsonb("compiled_states").$type<CompiledConversationState[]>(),
  compiledTools: jsonb("compiled_tools").$type<CompiledFunctionTool[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFlowSchema = createInsertSchema(flows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  compiledSystemPrompt: true,
  compiledFirstMessage: true,
  compiledStates: true,
  compiledTools: true,
});
export const createFlowSchema = insertFlowSchema.omit({ userId: true });
export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type CreateFlow = z.infer<typeof createFlowSchema>;
export type Flow = typeof flows.$inferSelect;

// Flow Executions table
export const flowExecutions = pgTable("flow_executions", {
  id: varchar("id").primaryKey(),
  callId: varchar("call_id").notNull(),
  flowId: varchar("flow_id").notNull().references(() => flows.id),
  currentNodeId: varchar("current_node_id"),
  status: varchar("status", { length: 50 }).notNull(),
  variables: jsonb("variables").default({}).$type<Record<string, any>>(),
  pathTaken: jsonb("path_taken").default([]).$type<string[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertFlowExecutionSchema = createInsertSchema(flowExecutions).omit({
  id: true,
  startedAt: true,
});
export type InsertFlowExecution = z.infer<typeof insertFlowExecutionSchema>;
export type FlowExecution = typeof flowExecutions.$inferSelect;

// Webhook Subscriptions table
export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  method: varchar("method", { length: 10 }).default("POST").notNull(),
  headers: jsonb("headers").$type<Record<string, string>>(),
  secret: varchar("secret", { length: 64 }).notNull(),
  authType: varchar("auth_type", { length: 50 }),
  authCredentials: jsonb("auth_credentials").$type<Record<string, string>>(),
  events: jsonb("events").notNull().$type<string[]>(),
  campaignIds: jsonb("campaign_ids").$type<string[] | null>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alias for backward compatibility
export const webhooks = webhookSubscriptions;

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const createWebhookSchema = insertWebhookSchema.omit({ userId: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type CreateWebhook = z.infer<typeof createWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Webhook Delivery Logs table
export const webhookDeliveryLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookId: varchar("webhook_id").references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  success: boolean("success").notNull(),
  httpStatus: integer("status_code"),
  responseBody: text("response_body"),
  responseTime: integer("response_time"),
  error: text("error"),
  attemptNumber: integer("attempt").default(1).notNull(),
  maxAttempts: integer("max_attempts").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookLogs = webhookDeliveryLogs;

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  callId: varchar("call_id"),
  flowId: varchar("flow_id").references(() => flows.id),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: time("appointment_time").notNull(),
  duration: integer("duration").notNull(),
  serviceName: varchar("service_name", { length: 255 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).default("scheduled").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const createAppointmentSchema = insertAppointmentSchema.omit({ userId: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Appointment Settings table
export const appointmentSettings = pgTable("appointment_settings", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  allowOverlapping: boolean("allow_overlapping").default(false).notNull(),
  bufferMinutes: integer("buffer_minutes").default(0).notNull(),
  workingHours: jsonb("working_hours").notNull().$type<{
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentSettingsSchema = createInsertSchema(appointmentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const createAppointmentSettingsSchema = insertAppointmentSettingsSchema.omit({ userId: true });
export type InsertAppointmentSettings = z.infer<typeof insertAppointmentSettingsSchema>;
export type CreateAppointmentSettings = z.infer<typeof createAppointmentSettingsSchema>;
export type AppointmentSettings = typeof appointmentSettings.$inferSelect;

// Forms table
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const createFormSchema = insertFormSchema.omit({ userId: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type CreateForm = z.infer<typeof createFormSchema>;
export type Form = typeof forms.$inferSelect;

// Form Fields table
export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey(),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(),
  options: jsonb("options").$type<string[]>(),
  isRequired: boolean("is_required").default(true).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
  createdAt: true,
});
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type FormField = typeof formFields.$inferSelect;

// Form Submissions table
export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey(),
  formId: varchar("form_id").notNull().references(() => forms.id),
  callId: varchar("call_id"),
  flowExecutionId: varchar("flow_execution_id").references(() => flowExecutions.id),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  responses: jsonb("responses").notNull().$type<{
    fieldId: string;
    question: string;
    answer: string;
  }[]>(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
});
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

// SEO Settings table - Platform-wide SEO configuration
export interface SitemapUrl {
  url: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  lastmod?: string;
}

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export interface StructuredDataConfig {
  organizationName: string;
  organizationUrl: string;
  organizationLogo: string;
  organizationDescription: string;
  socialProfiles: string[];
  contactEmail: string;
  contactPhone: string;
}

// FAQ structured data for Google FAQ rich snippets
export interface FaqItem {
  question: string;
  answer: string;
}

// Product structured data for Google Product rich snippets
export interface ProductStructuredData {
  name: string;
  description: string;
  image: string;
  brand: string;
  sku: string;
  price: string;
  priceCurrency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  url: string;
  ratingValue?: string;
  ratingCount?: string;
}

export const seoSettings = pgTable("seo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Meta Tags - Default values for pages without specific SEO
  defaultTitle: text("default_title").default("AI Calling Platform"),
  defaultDescription: text("default_description").default("Enterprise AI-powered bulk calling platform with voice agents, Twilio integration, and intelligent lead classification."),
  defaultKeywords: text("default_keywords").array().default(sql`ARRAY[]::text[]`),
  defaultOgImage: text("default_og_image").default("/og-image.png"),
  
  // Sitemap Configuration
  sitemapEnabled: boolean("sitemap_enabled").default(true),
  sitemapUrls: jsonb("sitemap_urls").$type<SitemapUrl[]>().default([]),
  sitemapAutoGenerate: boolean("sitemap_auto_generate").default(true),
  
  // Robots.txt Configuration
  robotsEnabled: boolean("robots_enabled").default(true),
  robotsRules: jsonb("robots_rules").$type<RobotsRule[]>().default([
    {
      userAgent: "*",
      allow: ["/", "/pricing", "/features", "/blog", "/contact"],
      disallow: ["/app/", "/admin/", "/api/"]
    }
  ]),
  robotsCrawlDelay: integer("robots_crawl_delay").default(0),
  
  // Structured Data / Schema.org
  structuredDataEnabled: boolean("structured_data_enabled").default(true),
  structuredData: jsonb("structured_data").$type<StructuredDataConfig>().default({
    organizationName: "",
    organizationUrl: "",
    organizationLogo: "/logo.png",
    organizationDescription: "AI-powered voice agents for automated calling",
    socialProfiles: [],
    contactEmail: "",
    contactPhone: ""
  }),
  
  // FAQ Structured Data for rich snippets
  structuredDataFaq: jsonb("structured_data_faq").$type<FaqItem[]>().default([]),
  structuredDataFaqEnabled: boolean("structured_data_faq_enabled").default(false),
  
  // Product Structured Data for rich snippets
  structuredDataProduct: jsonb("structured_data_product").$type<ProductStructuredData | null>().default(null),
  structuredDataProductEnabled: boolean("structured_data_product_enabled").default(false),
  
  // Social Media Meta Tags
  twitterHandle: text("twitter_handle"),
  facebookAppId: text("facebook_app_id"),
  
  // Advanced Settings
  canonicalBaseUrl: text("canonical_base_url"),
  googleVerification: text("google_verification"),
  bingVerification: text("bing_verification"),
  
  // Audit
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type SeoSettings = typeof seoSettings.$inferSelect;

// ============================================================
// ANALYTICS & TRACKING SCRIPTS
// ============================================================

// Analytics Scripts - Admin-configurable tracking scripts (GTM, GA4, Facebook Pixel, etc.)
export const analyticsScripts = pgTable("analytics_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Script Identity
  name: text("name").notNull(), // Display name (e.g., "Google Tag Manager", "Facebook Pixel")
  type: text("type").notNull().default("custom"), // 'gtm', 'ga4', 'facebook_pixel', 'linkedin', 'twitter', 'tiktok', 'hotjar', 'clarity', 'custom'
  
  // Script Content
  code: text("code").notNull(), // Legacy single code field (for backward compatibility)
  headCode: text("head_code"), // Code to inject in <head> section
  bodyCode: text("body_code"), // Code to inject after <body> tag (e.g., GTM noscript)
  
  // Placement Configuration - Array supports multiple placements (e.g., both head and body for some scripts like GTM)
  placement: text("placement").array().notNull().default(sql`ARRAY['head']::text[]`), // Array of 'head' and/or 'body' - where to inject the script
  loadPriority: integer("load_priority").notNull().default(0), // Higher priority = loads first (within placement group)
  
  // Script Attributes (for <script> tag configuration)
  async: boolean("async").default(false), // Add async attribute
  defer: boolean("defer").default(false), // Add defer attribute
  
  // Status
  enabled: boolean("enabled").notNull().default(true),
  
  // Page Scope - Control where scripts are injected
  hideOnInternalPages: boolean("hide_on_internal_pages").notNull().default(false), // Hide on admin/user dashboard pages
  
  // Notes for admin reference
  description: text("description"),
  
  // Audit
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnalyticsScriptSchema = createInsertSchema(analyticsScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnalyticsScript = z.infer<typeof insertAnalyticsScriptSchema>;
export type AnalyticsScript = typeof analyticsScripts.$inferSelect;

// ============================================================
// PAYMENT TRANSACTIONS & INVOICING SYSTEM
// ============================================================

// Payment Transactions - Unified log of all payments (plans + credits) across all gateways
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Transaction Type
  type: text("type").notNull(), // 'subscription' or 'credits'
  
  // Gateway Information
  gateway: text("gateway").notNull(), // 'stripe', 'razorpay', 'paypal', 'paystack', 'mercadopago'
  gatewayTransactionId: text("gateway_transaction_id"), // Payment intent ID, order ID, etc.
  gatewaySubscriptionId: text("gateway_subscription_id"), // For subscription payments
  
  // Amount & Currency
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  
  // Related Records
  planId: varchar("plan_id").references(() => plans.id, { onDelete: "set null" }),
  creditPackageId: varchar("credit_package_id").references(() => creditPackages.id, { onDelete: "set null" }),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id, { onDelete: "set null" }),
  
  // Transaction Details
  description: text("description").notNull(),
  billingPeriod: text("billing_period"), // 'monthly', 'yearly' for subscriptions
  creditsAwarded: integer("credits_awarded"), // For credit purchases
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
  
  // Invoice Reference
  invoiceId: varchar("invoice_id"), // Will be linked after invoice generation
  
  // Metadata
  metadata: jsonb("metadata"), // Additional gateway-specific data
  
  // Timestamps
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Refunds - Track all refunds across gateways
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => paymentTransactions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Refund Details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  
  // Gateway Information
  gateway: text("gateway").notNull(), // Same as original transaction
  gatewayRefundId: text("gateway_refund_id"), // Refund ID from gateway
  
  // Refund Type
  reason: text("reason").notNull(), // 'admin_request', 'chargeback', 'customer_request', 'duplicate', 'fraudulent'
  initiatedBy: text("initiated_by").notNull(), // 'admin', 'customer', 'gateway' (for chargebacks)
  adminId: varchar("admin_id").references(() => users.id, { onDelete: "set null" }), // Admin who processed refund
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  
  // Credits Reversal
  creditsReversed: integer("credits_reversed"), // Credits taken back
  
  // User Suspension (for chargebacks)
  userSuspended: boolean("user_suspended").notNull().default(false),
  
  // Notes
  adminNote: text("admin_note"), // Internal note from admin
  customerNote: text("customer_note"), // Note visible to customer
  
  // Metadata
  metadata: jsonb("metadata"), // Gateway-specific refund data
  
  // Refund Note PDF
  refundNoteNumber: text("refund_note_number"), // e.g., RN-2024-0001
  pdfUrl: text("pdf_url"), // URL to stored refund note PDF
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  
  // Timestamps
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// Invoices - PDF invoices for all transactions
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => paymentTransactions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Invoice Number (human-readable)
  invoiceNumber: text("invoice_number").notNull().unique(), // e.g., INV-2024-00001
  
  // Customer Details (snapshot at time of invoice)
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerAddress: text("customer_address"),
  
  // Invoice Details
  description: text("description").notNull(),
  lineItems: jsonb("line_items").notNull().$type<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[]>(),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  
  // Gateway & Payment Info
  gateway: text("gateway").notNull(),
  paymentMethod: text("payment_method"), // 'card', 'bank_transfer', etc.
  
  // PDF Storage
  pdfUrl: text("pdf_url"), // URL to stored PDF
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  
  // Status
  status: text("status").notNull().default("draft"), // 'draft', 'sent', 'paid', 'void'
  
  // Email Delivery
  emailSentAt: timestamp("email_sent_at"),
  emailSentTo: text("email_sent_to"),
  
  // Timestamps
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Payment Webhook Queue - For retry logic on failed webhook processing
export const paymentWebhookQueue = pgTable("payment_webhook_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Webhook Source
  gateway: text("gateway").notNull(), // 'stripe', 'razorpay', 'paypal', 'paystack', 'mercadopago'
  eventType: text("event_type").notNull(), // e.g., 'payment_intent.succeeded', 'subscription.created'
  eventId: text("event_id").notNull(), // Gateway's event ID for idempotency
  
  // Payload
  payload: jsonb("payload").notNull(), // Full webhook payload
  
  // Processing Status
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'expired'
  
  // Retry Information
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Error Tracking
  lastError: text("last_error"),
  errorHistory: jsonb("error_history").$type<{
    attempt: number;
    error: string;
    timestamp: string;
  }[]>(),
  
  // Related Records (if known)
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  transactionId: varchar("transaction_id").references(() => paymentTransactions.id, { onDelete: "set null" }),
  
  // Timestamps
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours from receivedAt
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentWebhookQueueSchema = createInsertSchema(paymentWebhookQueue).omit({
  id: true,
  createdAt: true,
});
export type InsertPaymentWebhookQueue = z.infer<typeof insertPaymentWebhookQueueSchema>;
export type PaymentWebhookQueue = typeof paymentWebhookQueue.$inferSelect;

// Email Notification Settings - Admin-configurable email types
export const emailNotificationSettings = pgTable("email_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Email Type
  eventType: text("event_type").notNull().unique(), // 'welcome', 'purchase_confirmation', 'low_credits', 'campaign_completed', etc.
  displayName: text("display_name").notNull(), // Human-readable name
  description: text("description"), // Description of when this email is sent
  
  // Settings
  isEnabled: boolean("is_enabled").notNull().default(true),
  
  // Template Reference (optional - for custom templates)
  templateId: varchar("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
  
  // Thresholds (for certain event types)
  thresholdValue: integer("threshold_value"), // e.g., credit count for low_credits alert
  
  // Metadata
  category: text("category").notNull().default("general"), // 'authentication', 'billing', 'campaigns', 'account', 'general'
  
  // Audit
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailNotificationSettingsSchema = createInsertSchema(emailNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailNotificationSettings = z.infer<typeof insertEmailNotificationSettingsSchema>;
export type EmailNotificationSettings = typeof emailNotificationSettings.$inferSelect;

// Banned Words - Admin-configurable list of prohibited words/phrases for call monitoring
export const bannedWords = pgTable("banned_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull(), // The banned word or phrase
  category: text("category").notNull().default("general"), // 'profanity', 'harassment', 'hate_speech', 'threats', 'general'
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  isActive: boolean("is_active").notNull().default(true),
  autoBlock: boolean("auto_block").notNull().default(false), // Auto-block user when detected
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBannedWordSchema = createInsertSchema(bannedWords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBannedWord = z.infer<typeof insertBannedWordSchema>;
export type BannedWord = typeof bannedWords.$inferSelect;

// Content Violations - Log of detected banned words in calls
export const contentViolations = pgTable("content_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => calls.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bannedWordId: varchar("banned_word_id").references(() => bannedWords.id, { onDelete: "set null" }),
  detectedWord: text("detected_word").notNull(), // The actual word detected
  context: text("context"), // Surrounding text for context
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'dismissed', 'actioned'
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  actionTaken: text("action_taken"), // 'warning', 'blocked', 'dismissed', etc.
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContentViolationSchema = createInsertSchema(contentViolations).omit({
  id: true,
  createdAt: true,
});
export type InsertContentViolation = z.infer<typeof insertContentViolationSchema>;
export type ContentViolation = typeof contentViolations.$inferSelect;

// ============================================================
// PLIVO + OPENAI REALTIME ENGINE TABLES
// Alternative voice AI engine using Plivo for telephony and OpenAI Realtime API
// ============================================================

// OpenAI API Key Pool - Similar to ElevenLabs pool with model tier support
export const openaiCredentials = pgTable("openai_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull(),
  modelTier: text("model_tier").notNull().default("free"), // 'free' (gpt-realtime-mini) or 'pro' (gpt-realtime-1.5)
  isActive: boolean("is_active").notNull().default(true),
  maxConcurrency: integer("max_concurrency").notNull().default(50),
  currentLoad: integer("current_load").notNull().default(0),
  totalAssignedAgents: integer("total_assigned_agents").notNull().default(0),
  totalAssignedUsers: integer("total_assigned_users").notNull().default(0),
  maxAgentsThreshold: integer("max_agents_threshold").notNull().default(100),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status").notNull().default("healthy"), // healthy, degraded, unhealthy
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOpenaiCredentialSchema = createInsertSchema(openaiCredentials).omit({
  id: true,
  currentLoad: true,
  totalAssignedAgents: true,
  totalAssignedUsers: true,
  lastHealthCheck: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOpenaiCredential = z.infer<typeof insertOpenaiCredentialSchema>;
export type OpenaiCredential = typeof openaiCredentials.$inferSelect;

// Plivo Credentials - Account credentials for Plivo telephony
export const plivoCredentials = pgTable("plivo_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  authId: text("auth_id").notNull(),
  authToken: text("auth_token").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlivoCredentialSchema = createInsertSchema(plivoCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlivoCredential = z.infer<typeof insertPlivoCredentialSchema>;
export type PlivoCredential = typeof plivoCredentials.$inferSelect;

// Plivo Phone Numbers
export const plivoPhoneNumbers = pgTable("plivo_phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  plivoCredentialId: varchar("plivo_credential_id").references(() => plivoCredentials.id, { onDelete: "set null" }),
  openaiCredentialId: varchar("openai_credential_id").references(() => openaiCredentials.id, { onDelete: "set null" }),
  phoneNumber: text("phone_number").notNull().unique(),
  plivoNumberId: text("plivo_number_id").notNull().unique(),
  friendlyName: text("friendly_name"),
  country: text("country").notNull(),
  region: text("region"),
  numberType: text("number_type").default("local"), // local, toll_free, national
  capabilities: jsonb("capabilities"), // { voice: true, sms: true }
  status: text("status").notNull().default("active"), // active, pending, released, suspended
  
  // Pricing (admin-configured credits)
  purchaseCredits: integer("purchase_credits").notNull().default(0),
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  nextBillingDate: timestamp("next_billing_date"),
  
  // Incoming agent connection
  assignedAgentId: varchar("assigned_agent_id").references(() => agents.id, { onDelete: "set null" }),
  
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlivoPhoneNumberSchema = createInsertSchema(plivoPhoneNumbers).omit({
  id: true,
  purchasedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlivoPhoneNumber = z.infer<typeof insertPlivoPhoneNumberSchema>;
export type PlivoPhoneNumber = typeof plivoPhoneNumbers.$inferSelect;

// Plivo Calls - Call records with transcripts and AI summaries
export const plivoCalls = pgTable("plivo_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  plivoPhoneNumberId: varchar("plivo_phone_number_id").references(() => plivoPhoneNumbers.id, { onDelete: "set null" }),
  openaiCredentialId: varchar("openai_credential_id").references(() => openaiCredentials.id, { onDelete: "set null" }),
  
  // Plivo identifiers
  plivoCallUuid: text("plivo_call_uuid").unique(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  
  // OpenAI session
  openaiSessionId: text("openai_session_id"),
  openaiVoice: text("openai_voice").default("alloy"),
  openaiModel: text("openai_model").default("gpt-realtime-mini"),
  
  // Call status
  status: text("status").notNull().default("pending"), // pending, initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
  callDirection: text("call_direction").notNull().default("outbound"), // inbound, outbound
  duration: integer("duration"), // seconds
  
  // Recording
  recordingId: text("recording_id"),
  recordingUrl: text("recording_url"),
  recordingDuration: integer("recording_duration"),
  
  // AI analysis
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  leadQualityScore: integer("lead_quality_score"), // 1-100
  sentiment: text("sentiment"), // positive, neutral, negative
  classification: text("classification"), // hot, warm, cold, lost
  keyPoints: jsonb("key_points"), // string[]
  nextActions: jsonb("next_actions"), // string[]
  
  // Call transfer
  wasTransferred: boolean("was_transferred").default(false),
  transferredTo: text("transferred_to"),
  transferredAt: timestamp("transferred_at"),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  answeredAt: timestamp("answered_at"),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlivoCallSchema = createInsertSchema(plivoCalls).omit({
  id: true,
  createdAt: true,
});
export type InsertPlivoCall = z.infer<typeof insertPlivoCallSchema>;
export type PlivoCall = typeof plivoCalls.$inferSelect;

// Campaign Jobs - For tracking individual call jobs in campaigns
export const campaignJobs = pgTable("campaign_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  contactId: varchar("contact_id").notNull(),
  engine: text("engine").notNull().default("plivo"), // 'plivo' or 'twilio'
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  workerId: text("worker_id"), // For distributed processing
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
});

export const insertCampaignJobSchema = createInsertSchema(campaignJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaignJob = z.infer<typeof insertCampaignJobSchema>;
export type CampaignJob = typeof campaignJobs.$inferSelect;

// Plivo Phone Pricing - Admin-configured pricing per country
export const plivoPhonePricing = pgTable("plivo_phone_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: text("country_code").notNull().unique(), // ISO 2-letter country code
  countryName: text("country_name").notNull(),
  purchaseCredits: integer("purchase_credits").notNull().default(100),
  monthlyCredits: integer("monthly_credits").notNull().default(50),
  kycRequired: boolean("kyc_required").notNull().default(false), // Whether KYC verification is required for this country
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlivoPhonePricingSchema = createInsertSchema(plivoPhonePricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlivoPhonePricing = z.infer<typeof insertPlivoPhonePricingSchema>;
export type PlivoPhonePricing = typeof plivoPhonePricing.$inferSelect;

// ============================================================
// User KYC Documents - For phone number purchase verification
// ============================================================
export const userKycDocuments = pgTable("user_kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // photo, company_registration, gst_certificate, authorization_letter
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertUserKycDocumentSchema = createInsertSchema(userKycDocuments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertUserKycDocument = z.infer<typeof insertUserKycDocumentSchema>;
export type UserKycDocument = typeof userKycDocuments.$inferSelect;

// ============================================================
// Twilio + OpenAI Realtime Engine - Isolated Call Records
// Separate from Plivo+OpenAI and Twilio+ElevenLabs integrations
// ============================================================
export const twilioOpenaiCalls = pgTable("twilio_openai_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  twilioPhoneNumberId: varchar("twilio_phone_number_id").references(() => phoneNumbers.id, { onDelete: "set null" }),
  openaiCredentialId: varchar("openai_credential_id").references(() => openaiCredentials.id, { onDelete: "set null" }),
  
  twilioCallSid: text("twilio_call_sid").unique(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  
  openaiSessionId: text("openai_session_id"),
  openaiVoice: text("openai_voice").default("alloy"),
  openaiModel: text("openai_model").default("gpt-realtime"),
  
  status: text("status").notNull().default("pending"),
  callDirection: text("call_direction").notNull().default("outbound"),
  duration: integer("duration"),
  
  recordingUrl: text("recording_url"),
  recordingDuration: integer("recording_duration"),
  
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  leadQualityScore: integer("lead_quality_score"),
  sentiment: text("sentiment"),
  classification: text("classification"),
  keyPoints: jsonb("key_points"),
  nextActions: jsonb("next_actions"),
  
  wasTransferred: boolean("was_transferred").default(false),
  transferredTo: text("transferred_to"),
  transferredAt: timestamp("transferred_at"),
  
  startedAt: timestamp("started_at"),
  answeredAt: timestamp("answered_at"),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTwilioOpenaiCallSchema = createInsertSchema(twilioOpenaiCalls).omit({
  id: true,
  createdAt: true,
});
export type InsertTwilioOpenaiCall = z.infer<typeof insertTwilioOpenaiCallSchema>;
export type TwilioOpenaiCall = typeof twilioOpenaiCalls.$inferSelect;

// ============================================================
// Demo Call Sessions - Browser-based demo calls for visitors
// ============================================================
export const demoSessions = pgTable("demo_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  visitorIp: text("visitor_ip"),
  visitorFingerprint: text("visitor_fingerprint"),
  language: text("language").notNull().default("en"),
  voice: text("voice").notNull().default("alloy"),
  status: text("status").notNull().default("pending"),
  duration: integer("duration"),
  maxDuration: integer("max_duration").notNull().default(60),
  transcript: text("transcript"),
  openaiSessionId: text("openai_session_id"),
  openaiCredentialId: varchar("openai_credential_id").references(() => openaiCredentials.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDemoSessionSchema = createInsertSchema(demoSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertDemoSession = z.infer<typeof insertDemoSessionSchema>;
export type DemoSession = typeof demoSessions.$inferSelect;



// ============================================================
// Website Widget Module - Embeddable Voice Widgets
// Isolated module for creating branded voice widgets for customer websites
// ============================================================

export const websiteWidgets = pgTable("website_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic Info
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, paused, disabled
  
  // Agent Configuration - which AI agent powers this widget
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  agentType: text("agent_type").notNull().default("flow"), // flow
  
  // Branding
  iconUrl: text("icon_url"), // Custom icon for the chat bubble
  iconPath: text("icon_path"), // File path for uploaded icon
  brandName: text("brand_name"), // Display name shown in widget
  buttonLabel: text("button_label").notNull().default("VOICE CHAT"), // Customizable button text
  primaryColor: text("primary_color").notNull().default("#3B82F6"), // Main color
  accentColor: text("accent_color").notNull().default("#1E40AF"), // Secondary color
  backgroundColor: text("background_color").notNull().default("#FFFFFF"), // Widget background
  textColor: text("text_color").notNull().default("#1F2937"), // Text color
  
  // Terms & Conditions
  requireTermsAcceptance: boolean("require_terms_acceptance").notNull().default(false), // Show terms checkbox before call
  
  // Widget Text Content
  welcomeMessage: text("welcome_message").notNull().default("Find your next opportunity"),
  launcherText: text("launcher_text").notNull().default("Talk to us"),
  launcherPosition: text("launcher_position").notNull().default("bottom-right"), // bottom-right, bottom-left, top-right, top-left
  offlineMessage: text("offline_message").notNull().default("We're currently unavailable. Please try again later."),
  lowCreditsMessage: text("low_credits_message").notNull().default("Service temporarily unavailable."),
  
  // Domain Whitelisting
  allowedDomains: text("allowed_domains").array().notNull().default(sql`ARRAY[]::text[]`), // Empty = allow all
  
  // Business Hours
  businessHoursEnabled: boolean("business_hours_enabled").notNull().default(false),
  businessHoursStart: text("business_hours_start").default("09:00"), // HH:MM format
  businessHoursEnd: text("business_hours_end").default("17:00"), // HH:MM format
  businessDays: text("business_days").array().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[]`),
  businessTimezone: text("business_timezone").default("America/New_York"),
  
  // Call Limits & Abuse Prevention
  maxConcurrentCalls: integer("max_concurrent_calls").notNull().default(5),
  maxCallDuration: integer("max_call_duration").notNull().default(300), // seconds (5 minutes default)
  cooldownMinutes: integer("cooldown_minutes").notNull().default(0), // minutes between calls per IP (0 = no cooldown)
  
  // Appointment Booking
  appointmentBookingEnabled: boolean("appointment_booking_enabled").notNull().default(false),
  
  // Hiring Widget Settings
  allowSkipCV: boolean("allow_skip_cv").notNull().default(true), // Show 'Skip' link on CV upload step
  launcherIcon: text("launcher_icon").notNull().default("briefcase"), // briefcase, star, rocket, sparkle, none
  
  // Embed Token - used to identify widget in public API
  embedToken: text("embed_token").notNull().unique(),
  
  // Analytics
  totalCalls: integer("total_calls").notNull().default(0),
  totalMinutes: integer("total_minutes").notNull().default(0),
  widgetViews: integer("widget_views").notNull().default(0),
  widgetApplications: integer("widget_applications").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebsiteWidgetSchema = createInsertSchema(websiteWidgets).omit({
  id: true,
  totalCalls: true,
  totalMinutes: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsiteWidget = z.infer<typeof insertWebsiteWidgetSchema>;
export type WebsiteWidget = typeof websiteWidgets.$inferSelect;

// Widget Call Sessions - Track active/completed widget calls
export const widgetCallSessions = pgTable("widget_call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  widgetId: varchar("widget_id").notNull().references(() => websiteWidgets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Session Info
  sessionToken: text("session_token").notNull().unique(),
  visitorIp: text("visitor_ip"),
  visitorDomain: text("visitor_domain"), // Domain where widget is embedded
  
  // Call State
  status: text("status").notNull().default("pending"), // pending, connecting, active, completed, failed
  duration: integer("duration"), // seconds
  creditsUsed: integer("credits_used").default(0),
  
  // Recording & Transcript
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  sentiment: text("sentiment"),
  
  // OpenAI Realtime connection
  openaiSessionId: text("openai_session_id"),
  openaiCredentialId: varchar("openai_credential_id"),
  
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWidgetCallSessionSchema = createInsertSchema(widgetCallSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertWidgetCallSession = z.infer<typeof insertWidgetCallSessionSchema>;
export type WidgetCallSession = typeof widgetCallSessions.$inferSelect;

// ============================================================
// REST API Plugin - API Keys and Audit Logs
// Enables external system integration via authenticated REST API
// ============================================================

// API Scopes - Define what each API key can access
export const API_SCOPES = {
  // Read scopes
  'calls:read': 'View call history and details',
  'campaigns:read': 'View campaigns',
  'agents:read': 'View agents',
  'contacts:read': 'View contacts',
  'knowledge:read': 'View knowledge bases',
  'phone-numbers:read': 'View phone numbers',
  'webhooks:read': 'View webhook subscriptions',
  'credits:read': 'View credit balance and usage',
  'analytics:read': 'View analytics data',
  
  // Write scopes
  'calls:write': 'Trigger and manage calls',
  'campaigns:write': 'Create and manage campaigns',
  'agents:write': 'Create and manage agents',
  'contacts:write': 'Create and manage contacts',
  'knowledge:write': 'Upload knowledge base documents',
  'phone-numbers:write': 'Purchase and assign phone numbers',
  'webhooks:write': 'Manage webhook subscriptions',
  
  // Admin scopes
  'admin': 'Full administrative access',
} as const;

export type ApiScope = keyof typeof API_SCOPES;

// API Keys - User-generated keys for REST API access
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Key identification
  name: text("name").notNull(), // User-friendly name: "Production Key", "CRM Integration"
  keyPrefix: text("key_prefix").notNull(), // First 8 chars of key for identification: "agl_1234..."
  hashedSecret: text("hashed_secret").notNull(), // bcrypt hash of the secret key
  
  // Permissions
  scopes: text("scopes").array().notNull().default(sql`ARRAY['calls:read', 'calls:write', 'campaigns:read', 'contacts:read']::text[]`),
  
  // Rate limiting
  rateLimit: integer("rate_limit").notNull().default(100), // Requests per minute
  rateLimitWindow: integer("rate_limit_window").notNull().default(60), // Window in seconds
  
  // Security
  ipWhitelist: text("ip_whitelist").array().default(sql`ARRAY[]::text[]`), // Empty = allow all
  expiresAt: timestamp("expires_at"), // Optional expiration
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: text("last_used_ip"),
  totalRequests: integer("total_requests").notNull().default(0),
  
  // Metadata
  description: text("description"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  lastUsedAt: true,
  lastUsedIp: true,
  totalRequests: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// API Audit Logs - Track all API requests for security and debugging
export const apiAuditLogs = pgTable("api_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  
  // Request details
  method: text("method").notNull(), // GET, POST, PUT, DELETE
  endpoint: text("endpoint").notNull(), // /v1/calls, /v1/campaigns/:id
  path: text("path").notNull(), // Full path with params: /v1/campaigns/abc-123
  
  // Request info
  requestBody: jsonb("request_body"), // Sanitized request body (no secrets)
  queryParams: jsonb("query_params"),
  
  // Response info
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // Milliseconds
  errorMessage: text("error_message"),
  
  // Client info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Correlation
  requestId: text("request_id").notNull(), // Unique ID for request tracing
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiAuditLogSchema = createInsertSchema(apiAuditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertApiAuditLog = z.infer<typeof insertApiAuditLogSchema>;
export type ApiAuditLog = typeof apiAuditLogs.$inferSelect;

// API Rate Limit Tracking - Sliding window rate limiting
export const apiRateLimits = pgTable("api_rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ApiRateLimit = typeof apiRateLimits.$inferSelect;

// ============================================================
// SIP Engine Plugin Tables
// ============================================================

// Fonoster Credentials - System-wide Fonoster API credentials
export const fonosterCredentials = pgTable("fonoster_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  accessKeyId: text("access_key_id").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  apiSecretEncrypted: text("api_secret_encrypted").notNull(),
  endpoint: text("endpoint"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  healthStatus: text("health_status").notNull().default("unknown"),
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFonosterCredentialSchema = createInsertSchema(fonosterCredentials).omit({
  id: true,
  healthStatus: true,
  lastHealthCheck: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFonosterCredential = z.infer<typeof insertFonosterCredentialSchema>;
export type FonosterCredential = typeof fonosterCredentials.$inferSelect;

// SIP Trunks - User's SIP trunk configurations
export const sipTrunks = pgTable("sip_trunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  engine: text("engine").notNull(), // 'elevenlabs-sip' | 'openai-sip'
  provider: text("provider").notNull().default("generic"), // SIP provider: twilio, plivo, telnyx, vonage, exotel, bandwidth, didww, zadarma, cloudonix, ringcentral, sinch, infobip, generic
  sipHost: text("sip_host").notNull(),
  sipPort: integer("sip_port").notNull().default(5060),
  transport: text("transport").notNull().default("tls"), // 'udp' | 'tcp' | 'tls' - used for OUTBOUND
  mediaEncryption: text("media_encryption").notNull().default("require"), // 'require' | 'prefer' | 'none'
  // Inbound-specific settings (for receiving calls from provider to ElevenLabs)
  // These can differ from outbound settings - e.g., Twilio uses TCP:5060 for inbound but TLS:5061 for outbound
  inboundTransport: text("inbound_transport").default("tcp"), // 'udp' | 'tcp' | 'tls' - used for INBOUND
  inboundPort: integer("inbound_port").default(5060), // Port for inbound SIP (ElevenLabs listens on this)
  codecsAllowed: text("codecs_allowed").array().default(sql`ARRAY['PCMU', 'PCMA']::text[]`),
  username: text("username"),
  password: text("password"), // Stored encrypted at application layer
  realm: text("realm"),
  registrarHost: text("registrar_host"),
  externalElevenLabsId: text("external_elevenlabs_id"),
  externalFonosterTrunkId: text("external_fonoster_trunk_id"),
  fonosterCredentialId: varchar("fonoster_credential_id").references(() => fonosterCredentials.id),
  isActive: boolean("is_active").notNull().default(true),
  healthStatus: text("health_status").notNull().default("unknown"),
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSipTrunkSchema = createInsertSchema(sipTrunks).omit({
  id: true,
  healthStatus: true,
  lastHealthCheck: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSipTrunk = z.infer<typeof insertSipTrunkSchema>;
export type SipTrunk = typeof sipTrunks.$inferSelect;

// SIP Phone Numbers - Phone numbers imported from SIP trunks
export const sipPhoneNumbers = pgTable("sip_phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sipTrunkId: varchar("sip_trunk_id").notNull().references(() => sipTrunks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  label: text("label"),
  engine: text("engine").notNull(), // Inherited from trunk: 'elevenlabs-sip' | 'openai-sip'
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  inboundEnabled: boolean("inbound_enabled").notNull().default(true),
  outboundEnabled: boolean("outbound_enabled").notNull().default(true),
  externalElevenLabsPhoneId: text("external_elevenlabs_phone_id"),
  externalFonosterPhoneId: text("external_fonoster_phone_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSipPhoneNumberSchema = createInsertSchema(sipPhoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSipPhoneNumber = z.infer<typeof insertSipPhoneNumberSchema>;
export type SipPhoneNumber = typeof sipPhoneNumbers.$inferSelect;

// SIP Calls - Call records for SIP engine calls
// Note: Column names match SQL migration (001_sip_tables.sql)
export const sipCalls = pgTable("sip_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => agents.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  sipTrunkId: varchar("sip_trunk_id").references(() => sipTrunks.id),
  sipPhoneNumberId: varchar("sip_phone_number_id").references(() => sipPhoneNumbers.id),
  engine: varchar("engine", { length: 50 }).notNull(), // 'elevenlabs-sip' | 'openai-sip'
  externalCallId: varchar("external_call_id", { length: 255 }),
  openaiCallId: varchar("openai_call_id", { length: 255 }),
  elevenlabsConversationId: varchar("elevenlabs_conversation_id", { length: 255 }),
  fromNumber: varchar("from_number", { length: 50 }),
  toNumber: varchar("to_number", { length: 50 }),
  direction: varchar("direction", { length: 20 }).notNull(), // 'inbound' | 'outbound'
  status: varchar("status", { length: 50 }).default("initiated"),
  durationSeconds: integer("duration_seconds").default(0),
  creditsUsed: decimal("credits_used", { precision: 10, scale: 2 }).default("0"),
  recordingUrl: text("recording_url"),
  transcript: jsonb("transcript"), // Matches SQL migration column name
  aiSummary: text("ai_summary"),
  sipHeaders: jsonb("sip_headers"),
  metadata: jsonb("metadata"), // Matches SQL migration column name
  startedAt: timestamp("started_at"),
  answeredAt: timestamp("answered_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSipCallSchema = createInsertSchema(sipCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSipCall = z.infer<typeof insertSipCallSchema>;
export type SipCall = typeof sipCalls.$inferSelect;

// User Addresses - Addresses submitted by users for phone number regulatory compliance
export const userAddresses = pgTable("user_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Address details
  customerName: text("customer_name").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(), // State/Province
  postalCode: text("postal_code").notNull(),
  isoCountry: text("iso_country").notNull(), // ISO 3166-1 alpha-2 country code (e.g., AU, GB, DE)
  // Twilio integration
  twilioAddressSid: text("twilio_address_sid"), // Twilio Address SID after creation
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, submitted, verified, rejected
  verificationStatus: text("verification_status"), // Twilio's verification status
  validationStatus: text("validation_status"), // Twilio's validation status
  rejectionReason: text("rejection_reason"), // Reason if rejected
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  twilioAddressSid: true,
  status: true,
  verificationStatus: true,
  validationStatus: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;

// ============================================================
// User Feedback System
// ============================================================
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'bug' | 'feature' | 'improvement' | 'other'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  adminResponse: text("admin_response"),
  respondedBy: varchar("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at"),
  pageUrl: text("page_url"), // Where the feedback was submitted from
  userAgent: text("user_agent"), // Browser/device info for bug reports
  screenshot: text("screenshot"), // Optional base64 screenshot
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  status: true,
  priority: true,
  adminResponse: true,
  respondedBy: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

// ============================================================
// HR HIRING SAAS MODULE
// Jobs, Candidates, CV Uploads, Interview Sessions, Pipeline
// ============================================================

// Pipeline stage constants for candidate progression
export const CANDIDATE_PIPELINE_STAGES = {
  UPLOADED: 'uploaded',
  AI_SCREENED: 'ai_screened',
  CALL_READY: 'call_ready',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEWED: 'interviewed',
  HIRED: 'hired',
  REJECTED: 'rejected',
} as const;

export type CandidatePipelineStage = typeof CANDIDATE_PIPELINE_STAGES[keyof typeof CANDIDATE_PIPELINE_STAGES];

export const PIPELINE_STAGE_LABELS: Record<CandidatePipelineStage, string> = {
  [CANDIDATE_PIPELINE_STAGES.UPLOADED]: 'Uploaded',
  [CANDIDATE_PIPELINE_STAGES.AI_SCREENED]: 'AI Screened',
  [CANDIDATE_PIPELINE_STAGES.SHORTLISTED]: 'Shortlisted',
  [CANDIDATE_PIPELINE_STAGES.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
  [CANDIDATE_PIPELINE_STAGES.INTERVIEWED]: 'Interviewed',
  [CANDIDATE_PIPELINE_STAGES.HIRED]: 'Hired',
  [CANDIDATE_PIPELINE_STAGES.REJECTED]: 'Rejected',
};

export const PIPELINE_STAGE_COLORS: Record<CandidatePipelineStage, string> = {
  [CANDIDATE_PIPELINE_STAGES.UPLOADED]: '#6B7280',
  [CANDIDATE_PIPELINE_STAGES.AI_SCREENED]: '#3B82F6',
  [CANDIDATE_PIPELINE_STAGES.SHORTLISTED]: '#F59E0B',
  [CANDIDATE_PIPELINE_STAGES.INTERVIEW_SCHEDULED]: '#8B5CF6',
  [CANDIDATE_PIPELINE_STAGES.INTERVIEWED]: '#10B981',
  [CANDIDATE_PIPELINE_STAGES.HIRED]: '#059669',
  [CANDIDATE_PIPELINE_STAGES.REJECTED]: '#EF4444',
};

export const PIPELINE_STAGE_ORDER: CandidatePipelineStage[] = [
  CANDIDATE_PIPELINE_STAGES.UPLOADED,
  CANDIDATE_PIPELINE_STAGES.AI_SCREENED,
  CANDIDATE_PIPELINE_STAGES.SHORTLISTED,
  CANDIDATE_PIPELINE_STAGES.INTERVIEW_SCHEDULED,
  CANDIDATE_PIPELINE_STAGES.INTERVIEWED,
  CANDIDATE_PIPELINE_STAGES.HIRED,
  CANDIDATE_PIPELINE_STAGES.REJECTED,
];

// Jobs - Job postings with requirements and configuration
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description").notNull(),
  department: text("department"),
  location: text("location"),
  locationType: text("location_type").default("onsite"), // onsite, remote, hybrid
  employmentType: text("employment_type").default("full_time"), // full_time, part_time, contract, internship
  experienceLevel: text("experience_level"), // entry, mid, senior, lead, executive
  salaryMin: decimal("salary_min", { precision: 12, scale: 2 }),
  salaryMax: decimal("salary_max", { precision: 12, scale: 2 }),
  salaryCurrency: text("salary_currency").default("USD"),

  source: text("source"), // linkedin, indeed, naukri, glassdoor, company_website, referral, job_fair, recruitment_agency, social_media, other
  sourceUrl: text("source_url"),

  requiredSkills: text("required_skills").array().notNull().default(sql`ARRAY[]::text[]`),
  preferredSkills: text("preferred_skills").array().default(sql`ARRAY[]::text[]`),
  minExperienceYears: integer("min_experience_years"),
  maxExperienceYears: integer("max_experience_years"),
  educationLevel: text("education_level"), // high_school, bachelors, masters, phd, any

  // AI Screening configuration
  screeningCriteria: jsonb("screening_criteria").$type<{
    skillsWeight: number;
    experienceWeight: number;
    educationWeight: number;
    customCriteria?: { label: string; weight: number; keywords: string[] }[];
  }>().default({ skillsWeight: 40, experienceWeight: 35, educationWeight: 25 }),
  autoScreenEnabled: boolean("auto_screen_enabled").notNull().default(true),
  shortlistThreshold: integer("shortlist_threshold").notNull().default(70), // Auto-shortlist candidates scoring above this

  // Interview configuration
  interviewQuestions: jsonb("interview_questions").$type<{
    question: string;
    category: string;
    weight: number;
  }[]>().default([]),
  interviewDurationMinutes: integer("interview_duration_minutes").default(15),

  // HR Agent link
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  flowId: varchar("flow_id").references(() => flows.id, { onDelete: "set null" }),

  // Widget configuration for public applications
  widgetEnabled: boolean("widget_enabled").notNull().default(false),
  widgetId: varchar("widget_id").references(() => websiteWidgets.id, { onDelete: "set null" }),

  // Auto-calling configuration (uses campaign executor for all engines)
  autoCallEnabled: boolean("auto_call_enabled").notNull().default(false),
  minAiScoreForCall: integer("min_ai_score_for_call").notNull().default(60),
  callScript: text("call_script"),
  telephonyProvider: text("telephony_provider").default("twilio"), // twilio, plivo
  callingStatus: text("calling_status").default("idle"), // idle, running, paused, completed
  callingPhoneNumberId: varchar("calling_phone_number_id"),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  maxConcurrentCalls: integer("max_concurrent_calls").notNull().default(3),
  callRetryAttempts: integer("call_retry_attempts").notNull().default(2),
  retryDelayMinutes: integer("retry_delay_minutes").notNull().default(30),
  totalCalled: integer("total_called").notNull().default(0),
  totalCallCompleted: integer("total_call_completed").notNull().default(0),
  totalCallFailed: integer("total_call_failed").notNull().default(0),

  status: text("status").notNull().default("draft"), // draft, open, paused, closed, archived
  totalCandidates: integer("total_candidates").notNull().default(0),
  totalScreened: integer("total_screened").notNull().default(0),
  totalShortlisted: integer("total_shortlisted").notNull().default(0),
  totalInterviewed: integer("total_interviewed").notNull().default(0),
  totalHired: integer("total_hired").notNull().default(0),
  // AI Pipeline thresholds
  aiScreeningThreshold: integer("ai_screening_threshold").notNull().default(50),
  shortlistingThreshold: integer("shortlisting_threshold").notNull().default(70),
  interviewScheduledThreshold: integer("interview_scheduled_threshold").notNull().default(85),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  totalCandidates: true,
  totalScreened: true,
  totalShortlisted: true,
  totalInterviewed: true,
  totalHired: true,
  totalCalled: true,
  totalCallCompleted: true,
  totalCallFailed: true,
  publishedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
});
export const createJobSchema = insertJobSchema.omit({ userId: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type CreateJob = z.infer<typeof createJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Candidates - Individual candidate profiles linked to jobs
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),

  introduction: text("introduction"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  currentLocation: text("current_location"),
  currentCompany: text("current_company"),
  currentDesignation: text("current_designation"),
  totalExperienceYears: integer("total_experience_years"),
  expectedSalary: text("expected_salary"),
  currentSalary: text("current_salary"),
  noticePeriod: text("notice_period"),
  skills: text("skills").array(),
  hobbies: text("hobbies").array(),

  education: jsonb("education").$type<{
    degree: string;
    institution: string;
    field?: string;
    startYear?: number;
    endYear?: number;
    grade?: string;
  }[]>(),

  workExperience: jsonb("work_experience").$type<{
    company: string;
    role: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    description?: string;
    location?: string;
  }[]>(),

  certifications: text("certifications").array(),
  languages: text("languages").array(),

  // CV/Resume data
  cvFileName: text("cv_file_name"),
  cvFilePath: text("cv_file_path"),
  cvFileSize: integer("cv_file_size"),
  cvMimeType: text("cv_mime_type"),
  cvText: text("cv_text"),
  cvUploadId: varchar("cv_upload_id"),

  // AI Screening results
  aiScore: integer("ai_score"),
  aiSkillsScore: integer("ai_skills_score"),
  aiExperienceScore: integer("ai_experience_score"),
  aiEducationScore: integer("ai_education_score"),
  aiSummary: text("ai_summary"),
  aiStrengths: text("ai_strengths").array(),
  aiWeaknesses: text("ai_weaknesses").array(),
  aiRecommendation: text("ai_recommendation"),
  screenedAt: timestamp("screened_at"),

  // Parsed CV data (structured extraction)
  parsedData: jsonb("parsed_data").$type<{
    skills?: string[];
    experienceYears?: number;
    education?: { degree: string; institution: string; year?: number }[];
    workHistory?: { company: string; role: string; duration: string; description?: string }[];
    certifications?: string[];
    languages?: string[];
  }>(),

  // Pipeline stage
  pipelineStage: text("pipeline_stage").notNull().default("uploaded"),
  stageChangedAt: timestamp("stage_changed_at"),
  stageNotes: text("stage_notes"),

  // Interview tracking
  interviewSessionId: varchar("interview_session_id"),
  interviewScore: integer("interview_score"),
  interviewScheduledAt: timestamp("interview_scheduled_at"),
  interviewCompletedAt: timestamp("interview_completed_at"),

  // Auto-call tracking
  callStatus: text("call_status").default("pending"), // pending, queued, calling, completed, failed, no_answer, busy, unreachable
  callAttempts: integer("call_attempts").notNull().default(0),
  lastCallAt: timestamp("last_call_at"),
  callDuration: integer("call_duration"), // seconds
  callRecordingUrl: text("call_recording_url"),
  callTranscript: text("call_transcript"),
  callSummary: text("call_summary"),
  callScore: integer("call_score"), // 0-100 AI interview score from call
  callSid: text("call_sid"),
  callProvider: text("call_provider"), // twilio, plivo

  // Source tracking
  source: text("source").notNull().default("upload"),
  appliedAt: timestamp("applied_at"),

  tags: text("tags").array(),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  screenedAt: true,
  stageChangedAt: true,
  interviewCompletedAt: true,
  appliedAt: true,
  createdAt: true,
  updatedAt: true,
});
export const createCandidateSchema = insertCandidateSchema.omit({ userId: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type CreateCandidate = z.infer<typeof createCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Candidate Comments - User comments on candidates
export const candidateComments = pgTable("candidate_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCandidateCommentSchema = createInsertSchema(candidateComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCandidateComment = z.infer<typeof insertCandidateCommentSchema>;
export type CandidateComment = typeof candidateComments.$inferSelect;

// CV Uploads - Bulk CV upload tracking (ZIP files containing multiple CVs)
export const cvUploads = pgTable("cv_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),

  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(), // application/zip, application/pdf, etc.

  // Processing status
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalFiles: integer("total_files").notNull().default(0),
  processedFiles: integer("processed_files").notNull().default(0),
  failedFiles: integer("failed_files").notNull().default(0),
  candidatesCreated: integer("candidates_created").notNull().default(0),

  // Error tracking
  errors: jsonb("errors").$type<{ fileName: string; error: string }[]>().default([]),

  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCvUploadSchema = createInsertSchema(cvUploads).omit({
  id: true,
  processedFiles: true,
  failedFiles: true,
  candidatesCreated: true,
  processingStartedAt: true,
  processingCompletedAt: true,
  createdAt: true,
});
export type InsertCvUpload = z.infer<typeof insertCvUploadSchema>;
export type CvUpload = typeof cvUploads.$inferSelect;

// Interview Sessions - AI-powered phone interview records
export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),

  // Call reference (links to existing telephony infrastructure)
  callId: varchar("call_id").references(() => calls.id, { onDelete: "set null" }),
  plivoCallId: varchar("plivo_call_id").references(() => plivoCalls.id, { onDelete: "set null" }),
  twilioOpenaiCallId: varchar("twilio_openai_call_id").references(() => twilioOpenaiCalls.id, { onDelete: "set null" }),

  // Agent used for interview
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  flowId: varchar("flow_id").references(() => flows.id, { onDelete: "set null" }),

  // Interview details
  interviewType: text("interview_type").notNull().default("phone"), // phone, widget (browser-based)
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled, no_show, failed
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // seconds

  // Phone details
  candidatePhone: text("candidate_phone"),
  fromNumber: text("from_number"),

  // Recording & Transcript
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),

  // AI Evaluation
  overallScore: integer("overall_score"), // 0-100
  questionScores: jsonb("question_scores").$type<{
    question: string;
    category: string;
    score: number;
    answer: string;
    evaluation: string;
  }[]>(),
  aiEvaluation: text("ai_evaluation"), // AI-generated overall assessment
  aiRecommendation: text("ai_recommendation"), // advance, hold, reject
  communicationScore: integer("communication_score"), // 0-100
  technicalScore: integer("technical_score"), // 0-100
  cultureFitScore: integer("culture_fit_score"), // 0-100

  // Sentiment from voice analysis
  sentiment: text("sentiment"), // positive, neutral, negative
  confidenceLevel: text("confidence_level"), // high, medium, low

  // Interviewer notes (human reviewer)
  reviewerNotes: text("reviewer_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;

// Candidate Pipeline History - Track stage transitions
export const candidatePipelineHistory = pgTable("candidate_pipeline_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  fromStage: text("from_stage"), // null for initial stage
  toStage: text("to_stage").notNull(),
  reason: text("reason"), // Why the stage changed
  changedBy: text("changed_by").notNull().default("system"), // system, user, ai

  metadata: jsonb("metadata").$type<{
    aiScore?: number;
    interviewScore?: number;
    notes?: string;
  }>(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCandidatePipelineHistorySchema = createInsertSchema(candidatePipelineHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertCandidatePipelineHistory = z.infer<typeof insertCandidatePipelineHistorySchema>;
export type CandidatePipelineHistory = typeof candidatePipelineHistory.$inferSelect;

// Job Applications - Public applications from widget
export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  widgetId: varchar("widget_id").references(() => websiteWidgets.id, { onDelete: "set null" }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email").notNull(),
  phone: text("phone"),

  // Resume
  cvFileName: text("cv_file_name"),
  cvFilePath: text("cv_file_path"),
  cvFileSize: integer("cv_file_size"),

  // Cover letter or message
  coverLetter: text("cover_letter"),

  // Processing
  candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"), // pending, processed, rejected

  // Source tracking
  referralSource: text("referral_source"),
  visitorIp: text("visitor_ip"),
  visitorDomain: text("visitor_domain"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  candidateId: true,
  createdAt: true,
});
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

// HR Calls - Tracks all AI calling activity for the Calls section
export const hrCalls = pgTable("hr_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),

  callSid: text("call_sid"),
  provider: text("provider").notNull().default("twilio"), // twilio, plivo
  direction: text("direction").notNull().default("outbound"), // outbound, inbound
  fromNumber: text("from_number"),
  toNumber: text("to_number"),

  status: text("status").notNull().default("queued"), // queued, ringing, in_progress, completed, failed, no_answer, busy, cancelled
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // seconds
  attemptNumber: integer("attempt_number").notNull().default(1),

  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  summary: text("summary"),
  callScore: integer("call_score"), // 0-100

  aiEvaluation: text("ai_evaluation"),
  aiRecommendation: text("ai_recommendation"), // advance, hold, reject
  sentimentScore: text("sentiment_score"), // positive, neutral, negative

  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHrCallSchema = createInsertSchema(hrCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHrCall = z.infer<typeof insertHrCallSchema>;
export type HrCall = typeof hrCalls.$inferSelect;
