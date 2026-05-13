# SIP Engine Plugin - Complete Documentation

**Version:** 2.0.0  
**Author:** AgentHR  
**License:** Commercial

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Engines](#engines)
4. [Supported Providers](#supported-providers)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Phone Number Import](#phone-number-import)
9. [Agent Assignment](#agent-assignment)
10. [Batch Calling](#batch-calling)
11. [Incoming Call Routing](#incoming-call-routing)
12. [Troubleshooting](#troubleshooting)
13. [Changelog](#changelog)

---

## Overview

The SIP Engine Plugin enables AgentHR customers to use their **own SIP trunks** for AI-powered voice calls. This "Bring Your Own Trunk" (BYOT) approach allows businesses to leverage existing telephony infrastructure while connecting it to powerful AI voice engines.

### Key Capabilities

- **Use Existing SIP Infrastructure**: Connect your current SIP trunks from any of 13 supported providers
- **Two AI Engine Options**: Choose between ElevenLabs Conversational AI or OpenAI Realtime API
- **Plan-Based Access Control**: Administrators can enable/disable SIP features per subscription plan
- **Flow Agent Support**: Visual conversation flows work with both engines
- **Campaign Integration**: Run outbound calling campaigns through SIP trunks (ElevenLabs only)
- **Auto-Provisioning**: Phone numbers are automatically provisioned with the selected AI engine

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentHR Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │   SIP Engine     │         │       Plugin System          │  │
│  │     Plugin       │◄───────►│    Auto-discovery            │  │
│  └────────┬─────────┘         │    Plan-based access         │  │
│           │                   └──────────────────────────────┘  │
│           │                                                      │
│  ┌────────┴─────────────────────────────────────────────┐       │
│  │                    SIP Engines                        │       │
│  │                                                       │       │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐│       │
│  │  │  ElevenLabs SIP     │  │  OpenAI SIP             ││       │
│  │  │  ─────────────────  │  │  ───────────────────────││       │
│  │  │  Native integration │  │  Native SIP integration ││       │
│  │  │  No media bridge    │  │  No media bridge        ││       │
│  │  │  Inbound + Outbound │  │  Inbound only           ││       │
│  │  └──────────┬──────────┘  └──────────┬──────────────┘│       │
│  └─────────────┼────────────────────────┼───────────────┘       │
│                │                        │                        │
└────────────────┼────────────────────────┼────────────────────────┘
                 │                        │
                 ▼                        ▼
    ┌────────────────────┐    ┌──────────────────────────┐
    │   ElevenLabs API   │    │   OpenAI Realtime API    │
    │   (Cloud)          │    │   (GPT-4o Voice)         │
    └────────────────────┘    └──────────────────────────┘
```

---

## Features

The SIP Engine Plugin provides the following capabilities:

| Feature | Description |
|---------|-------------|
| **ElevenLabs SIP (Inbound + Outbound, 13 Providers)** | Full bidirectional calling with ElevenLabs Conversational AI |
| **OpenAI SIP (Incoming Calls Only)** | Receive calls using OpenAI's native Realtime SIP integration |
| **Auto-provisioning SIP Endpoints** | Automatic configuration of SIP endpoints during phone number import |
| **Multi-Provider Support** | Works with Twilio, Plivo, Telnyx, Vonage, and 9 more providers |
| **SIP Trunk Credential Management** | Securely store and manage SIP authentication credentials |
| **SIP Phone Number Import** | Import phone numbers from your SIP provider into AgentHR |
| **Plan-based SIP Access Control** | Enable/disable SIP features per subscription plan |
| **Campaign Integration** | Use SIP trunks for outbound calling campaigns |
| **Incoming Call Routing** | Route incoming calls to AI agents |
| **Admin SIP Settings UI** | Dedicated admin panel for SIP configuration |
| **User SIP Trunks UI** | User-facing interface for trunk and number management |

---

## Engines

The SIP Engine Plugin supports two distinct AI voice engines:

### ElevenLabs SIP

**Description:** Native SIP integration with ElevenLabs Conversational AI. Connects your SIP trunk directly to ElevenLabs for AI-powered voice calls.

| Capability | Status |
|------------|--------|
| Inbound Calls | ✅ Supported |
| Outbound Calls | ✅ Supported |
| Audio Bridge Required | ❌ No (native integration) |
| Batch Campaigns | ✅ Supported |
| Agent Types | Natural, Flow, Incoming |

**Best For:**
- Businesses needing both inbound and outbound calling
- Outbound sales campaigns
- High-volume call centers
- Users who prefer ElevenLabs voices

**SIP Endpoints:**
- Inbound TCP: `sip.rtc.elevenlabs.io:5060` (transport=tcp)
- Inbound TLS: `sip.rtc.elevenlabs.io:5061` (transport=tls)

> **Note:** The legacy endpoint `sip.elevenlabs.io` is deprecated. Always use `sip.rtc.elevenlabs.io`.

### OpenAI SIP

**Description:** OpenAI Realtime API for incoming SIP calls. Uses GPT Realtime for voice conversations with native SIP support.

| Capability | Status |
|------------|--------|
| Inbound Calls | ✅ Supported |
| Outbound Calls | ❌ Not Supported |
| Audio Bridge Required | ❌ No (native integration) |
| Batch Campaigns | ❌ Not Supported |
| Agent Types | Natural |

**Best For:**
- Inbound customer support
- AI receptionist applications
- Users who prefer OpenAI voices (alloy, echo, shimmer, etc.)
- Use cases requiring GPT-4o reasoning capabilities

**SIP Endpoint:**
```
sip:PROJECT_ID@sip.api.openai.com;transport=tls
```

### Engine Comparison

| Feature | ElevenLabs SIP | OpenAI SIP |
|---------|----------------|------------|
| **Inbound Calls** | ✅ Yes | ✅ Yes |
| **Outbound Calls** | ✅ Yes | ❌ No |
| **Batch Campaigns** | ✅ Yes | ❌ No |
| **AI Provider** | ElevenLabs | OpenAI (GPT-4o) |
| **Voice Quality** | ElevenLabs voices | OpenAI voices |
| **Audio Bridge** | Not needed | Not needed |
| **Agent Types** | Natural, Flow, Incoming | Natural |
| **Provisioning** | Per phone number | Per project |
| **Latency** | Low | Low |

---

## Supported Providers

The plugin supports 13 SIP trunk providers with pre-configured defaults:

| Provider | Default Host | Port | Transport | Features |
|----------|-------------|------|-----------|----------|
| **Twilio** | sip.twilio.com | 5061 | TLS | Elastic SIP Trunking |
| **Plivo** | sip.plivo.com | 5060 | TCP | SIP Endpoint |
| **Telnyx** | sip.telnyx.com | 5061 | TLS | TeXML SIP Trunking |
| **Vonage** | sip.vonage.com | 5060 | TCP | Voice API |
| **Exotel** | sip.exotel.com | 5060 | TCP | Cloud Telephony |
| **Bandwidth** | sip.bandwidth.com | 5060 | TCP | Enterprise Voice |
| **DIDWW** | sip.didww.com | 5060 | TCP | Global DIDs |
| **Zadarma** | sip.zadarma.com | 5060 | TCP | Cloud PBX |
| **Cloudonix** | sip.cloudonix.io | 5060 | TCP | CPaaS |
| **RingCentral** | sip.ringcentral.com | 5060 | TCP | Unified Communications |
| **Sinch** | sip.sinch.com | 5060 | TCP | Messaging & Voice |
| **Infobip** | sip.infobip.com | 5060 | TCP | Omnichannel |
| **Generic** | (user-defined) | 5060 | TCP | Any SIP provider |

### Provider-Specific Notes

**Providers Requiring User-Specific Termination URIs:**
- Twilio, Plivo, Vonage, Bandwidth, RingCentral, Sinch

These providers require you to enter your account-specific termination URI from your provider console.

**Providers with Universal SIP Domains:**
- Telnyx, Exotel, DIDWW, Zadarma, Cloudonix, Infobip

These providers use a universal SIP domain that works for all accounts.

---

## Installation

### Prerequisites

- AgentHR v1.0.0 or higher
- Node.js 18.x or higher
- PostgreSQL 14+
- ElevenLabs account with Conversational AI access (for ElevenLabs SIP)
- OpenAI account with Realtime API access (for OpenAI SIP)

### Step 1: Run Database Migration

Execute the SQL migration to create required tables:

```bash
psql $DATABASE_URL -f plugins/sip-engine/migrations/001_sip_tables.sql
```

Or using Drizzle migrations:

```bash
npm run db:push
```

**Tables Created:**
- `sip_trunks` - SIP trunk configurations
- `sip_phone_numbers` - Imported phone numbers
- `sip_calls` - Call records and logs
- `admin_settings` - Plugin settings

### Step 2: Register Plugin Routes

Add the following to your `server/routes.ts`:

```typescript
import { registerSipEngineRoutes } from '../plugins/sip-engine';

// After setting up auth middleware
registerSipEngineRoutes(app, sessionAuthMiddleware, adminAuthMiddleware);
```

### Step 3: Configure Environment Variables

Set the following environment variables as needed:

```bash
# Base URL for webhooks (required)
BASE_URL=https://your-domain.com

# Mock mode for testing (optional)
SIP_MOCK_MODE=false

# OpenAI Project ID (for OpenAI SIP)
OPENAI_PROJECT_ID=proj_xxxxxxxx
```

### Step 4: Enable in Admin Panel

1. Go to **Admin Dashboard** > **Settings** > **Plugins**
2. Verify "sip-engine" is listed and enabled
3. Navigate to **Settings** > **SIP** to configure plan access

### Step 5: Verify Installation

Check that the plugin is loaded:

```bash
curl https://your-domain.com/api/admin/plugins
```

The response should include `sip-engine` in the plugins list.

---

## Configuration

### Admin Settings

Administrators can configure SIP settings through the Admin Dashboard.

#### Accessing Admin SIP Settings

1. Go to **Admin Dashboard**
2. Navigate to **Settings** > **SIP** (appears in the Voice AI section)
3. Configure global and plan-specific settings

#### Global Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Plugin Enabled** | Enable/disable the entire SIP Engine Plugin | `true` |
| **Default Max Concurrent Calls** | Default concurrent SIP call limit for plans | `10` |
| **Mock Mode** | Enable mock mode for testing without real SIP credentials | `false` |

#### OpenAI SIP Configuration

1. Go to **Admin Dashboard** > **Settings** > **SIP** > **OpenAI SIP Setup**
2. Enter your **OpenAI Project ID** (from platform.openai.com)
3. Enter your **Webhook Secret** (from OpenAI webhook configuration)
4. Click **Save**

The system will generate:
- **Webhook URL**: `https://your-domain.com/api/openai-sip/webhook`
- **SIP Endpoint**: `sip:PROJECT_ID@sip.api.openai.com;transport=tls`

### Plan-Based Access Control

Enable SIP features for specific subscription plans:

#### Plan SIP Settings

| Setting | Type | Description |
|---------|------|-------------|
| `sipEnabled` | boolean | Enable SIP access for this plan |
| `maxSipConcurrency` | number | Maximum concurrent SIP calls allowed |
| `sipEnginesAllowed` | array | Which engines are available: `["elevenlabs-sip", "openai-sip"]` |

#### Configuring Plan Access

1. Go to **Admin Dashboard** > **Settings** > **SIP** > **Plan Settings**
2. For each plan:
   - Toggle **"Enable SIP Access"** on/off
   - Set **"Max Concurrent SIP Calls"** (default: 5)
   - Select **"Allowed Engines"**:
     - ElevenLabs SIP
     - OpenAI SIP
     - Or both
3. Click **Save**

### Provider-Specific Configuration

#### Twilio Elastic SIP Trunking

**Termination (Inbound calls TO ElevenLabs):**
```
SIP URI: sip:sip.rtc.elevenlabs.io:5060;transport=tcp
  - Or TLS: sip:sip.rtc.elevenlabs.io:5061;transport=tls
Authentication: IP ACL or Credential List
Priority: 10
Weight: 10
```

**Origination (Outbound calls FROM ElevenLabs):**
```
Origination SIP URI: sip:+15551234567@your-trunk.sip.twilio.com
Configure: Your Twilio SIP domain to receive calls from ElevenLabs
```

#### Plivo SIP Endpoint

```
Primary SIP Server: sip.plivo.com:5060
Authentication: Digest (Username/Password)
```

#### Telnyx SIP Trunk

```
IP Authentication: Use Telnyx-provided IPs
Inbound SIP URI: Provided by ElevenLabs
```

---

## API Reference

### User Trunk Management

#### List SIP Trunks

```http
GET /api/sip/trunks
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "trunk-uuid",
      "userId": "user-uuid",
      "name": "Production Trunk",
      "engine": "elevenlabs-sip",
      "provider": "twilio",
      "sipHost": "sip.twilio.com",
      "sipPort": 5061,
      "transport": "tls",
      "isActive": true,
      "healthStatus": "healthy",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Get SIP Providers

```http
GET /api/sip/trunks/providers
```

Returns all supported providers with default configurations.

#### Get Single Trunk

```http
GET /api/sip/trunks/:id
Authorization: Bearer <token>
```

#### Create SIP Trunk

```http
POST /api/sip/trunks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production Trunk",
  "engine": "elevenlabs-sip",
  "provider": "twilio",
  "sipHost": "sip.twilio.com",
  "sipPort": 5061,
  "transport": "tls",
  "inboundTransport": "tcp",
  "inboundPort": 5060,
  "mediaEncryption": "allow",
  "username": "your-username",
  "password": "your-password"
}
```

**Required Fields:**
- `name` - Friendly name for the trunk
- `engine` - Either `elevenlabs-sip` or `openai-sip`
- `provider` - One of the 13 supported providers

**Optional Fields:**
- `sipHost` - SIP server hostname (defaults from provider)
- `sipPort` - SIP port (defaults from provider)
- `transport` - Outbound transport: `tcp`, `tls`, or `udp`
- `inboundTransport` - Inbound transport (can differ from outbound)
- `inboundPort` - Inbound port for ElevenLabs
- `mediaEncryption` - `disable`, `allow`, or `require`
- `username` - SIP authentication username
- `password` - SIP authentication password

#### Update SIP Trunk

```http
PUT /api/sip/trunks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Trunk Name",
  "isActive": true
}
```

#### Delete SIP Trunk

```http
DELETE /api/sip/trunks/:id
Authorization: Bearer <token>
```

#### Test Trunk Connection

```http
POST /api/sip/trunks/:id/test
Authorization: Bearer <token>
```

### User Phone Number Management

#### List Phone Numbers

```http
GET /api/sip/phone-numbers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "phone-uuid",
      "userId": "user-uuid",
      "sipTrunkId": "trunk-uuid",
      "phoneNumber": "+14155551234",
      "label": "Sales Line",
      "engine": "elevenlabs-sip",
      "agentId": "agent-uuid",
      "inboundEnabled": true,
      "outboundEnabled": true,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Single Phone Number

```http
GET /api/sip/phone-numbers/:id
Authorization: Bearer <token>
```

#### Import Phone Number

```http
POST /api/sip/phone-numbers/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "sipTrunkId": "trunk-uuid",
  "phoneNumber": "+14155551234",
  "label": "Sales Line",
  "agentId": "agent-uuid",
  "customHeaders": {
    "X-Custom-Header": "value"
  }
}
```

**Required Fields:**
- `sipTrunkId` - ID of the SIP trunk
- `phoneNumber` - Phone number in E.164 format

**Optional Fields:**
- `label` - Friendly label
- `agentId` - AI agent to assign
- `customHeaders` - Custom SIP headers

#### Update Phone Number

```http
PUT /api/sip/phone-numbers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "New Label",
  "inboundEnabled": true,
  "outboundEnabled": false
}
```

#### Assign Agent to Phone Number

```http
POST /api/sip/phone-numbers/:id/assign-agent
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": "agent-uuid"
}
```

#### Unassign Agent from Phone Number

```http
POST /api/sip/phone-numbers/:id/unassign-agent
Authorization: Bearer <token>
```

#### Delete Phone Number

```http
DELETE /api/sip/phone-numbers/:id
Authorization: Bearer <token>
```

### Admin SIP Settings

#### Get Admin SIP Settings

```http
GET /api/admin/sip/settings
Authorization: Bearer <admin-token>
```

#### Update Admin SIP Settings

```http
PUT /api/admin/sip/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "pluginEnabled": true,
  "defaultMaxConcurrentCalls": 10,
  "mockMode": false
}
```

#### Get OpenAI SIP Configuration

```http
GET /api/admin/sip/openai-sip/config
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sipEndpoint": "sip:proj_xxx@sip.api.openai.com;transport=tls",
    "projectId": "proj_xxx",
    "webhookSecretSet": true,
    "webhookUrl": "https://your-domain.com/api/openai-sip/webhook",
    "instructions": [...]
  }
}
```

#### Update OpenAI SIP Configuration

```http
PUT /api/admin/sip/openai-sip/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "projectId": "proj_xxxxxxxx",
  "webhookSecret": "whsec_xxxxxxxx"
}
```

#### Get Plan SIP Settings

```http
GET /api/admin/sip/plans/:planId/sip-settings
Authorization: Bearer <admin-token>
```

#### Update Plan SIP Settings

```http
PUT /api/admin/sip/plans/:planId/sip-settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "sipEnabled": true,
  "maxConcurrentSipCalls": 10,
  "sipEnginesAllowed": ["elevenlabs-sip", "openai-sip"]
}
```

#### Get SIP Statistics

```http
GET /api/admin/sip/stats
Authorization: Bearer <admin-token>
```

#### List All User Trunks (Admin)

```http
GET /api/admin/sip/trunks
Authorization: Bearer <admin-token>
```

#### List All Phone Numbers (Admin)

```http
GET /api/admin/sip/phone-numbers
Authorization: Bearer <admin-token>
```

### OpenAI SIP Webhooks

#### Incoming Call Webhook

```http
POST /api/openai-sip/webhook
Content-Type: application/json
webhook-id: <unique-id>
webhook-timestamp: <unix-timestamp>
webhook-signature: v1,<base64-hmac-sha256>

{
  "object": "event",
  "id": "evt_xxx",
  "type": "realtime.call.incoming",
  "created_at": 1750287018,
  "data": {
    "call_id": "rtc_xxx",
    "sip_headers": [
      { "name": "From", "value": "sip:+14255551212@sip.example.com" },
      { "name": "To", "value": "sip:+18005551212@sip.example.com" }
    ]
  }
}
```

The webhook handler:
1. Verifies the signature using the configured webhook secret
2. Parses the incoming call event
3. Looks up the phone number and assigned agent
4. Accepts or rejects the call with agent configuration

#### WebSocket Audio Stream

```
WS /api/openai-sip/stream/:callId
```

Bidirectional audio stream for real-time voice communication.

---

## Phone Number Import

### Overview

Phone number import provisions your phone numbers with the selected AI engine, enabling AI-powered voice calls.

### Import Process

#### ElevenLabs SIP

1. User creates a SIP trunk with ElevenLabs engine
2. User imports a phone number from that trunk
3. System calls ElevenLabs API to provision the number:
   - Creates a phone number entry in ElevenLabs
   - Configures inbound and outbound trunk settings
   - Associates the number with your ElevenLabs account
4. ElevenLabs returns a phone number ID
5. AgentHR stores the mapping

**ElevenLabs Provisioning Request:**
```json
{
  "label": "Sales Line",
  "phone_number": "+14155551234",
  "provider_type": "sip_trunk",
  "inbound_trunk_config": {
    "transport": "tcp",
    "media_encryption": "allowed"
  },
  "outbound_trunk_config": {
    "address": "sip.twilio.com:5061",
    "transport": "tls",
    "media_encryption": "allowed",
    "credentials": {
      "username": "your-username",
      "password": "your-password"
    }
  }
}
```

#### OpenAI SIP

1. User creates a SIP trunk with OpenAI engine
2. User imports a phone number from that trunk
3. System stores the phone number locally
4. User configures SIP provider to route to OpenAI's SIP endpoint
5. Incoming calls trigger OpenAI webhook

### Phone Number Format

All phone numbers must be in **E.164 format**:
- Starts with `+`
- Country code followed by number
- No spaces, dashes, or parentheses

**Examples:**
- ✅ `+14155551234`
- ✅ `+442071234567`
- ❌ `(415) 555-1234`
- ❌ `415-555-1234`

---

## Agent Assignment

### Overview

Each imported SIP phone number can be assigned to an AI agent. When calls come in on that number, the assigned agent handles the conversation.

### Assigning an Agent

1. Navigate to **Phone Numbers** > **SIP Trunks** > **Phone Numbers** tab
2. Find the phone number you want to configure
3. Click **Assign Agent**
4. Select an agent from the dropdown
   - For ElevenLabs SIP: Natural, Flow, or Incoming agent types
   - For OpenAI SIP: Natural agent type only
5. Click **Save**

### API Assignment

```http
POST /api/sip/phone-numbers/:id/assign-agent
Content-Type: application/json

{
  "agentId": "agent-uuid"
}
```

### Agent Configuration

When a call is received, the agent's configuration is used:
- **System Prompt**: Instructions for the AI
- **First Message**: Opening greeting
- **Voice**: Voice selection (engine-specific)
- **Tools**: Function calling capabilities

---

## Batch Calling

### Overview

Batch calling allows you to run outbound calling campaigns through SIP trunks. This feature is **only available with ElevenLabs SIP** engine.

### Campaign Setup

1. Create a **Campaign** in AgentHR
2. Upload contacts or create a contact list
3. Select an agent with an ElevenLabs SIP phone number assigned
4. Configure campaign settings:
   - **Concurrent Calls Limit**: Max simultaneous calls
   - **Retry Settings**: Retry on no-answer/busy
   - **Timezone Scheduling**: Call during appropriate hours
5. Start the campaign

### Campaign Execution Flow

```
┌─────────────┐    ┌───────────────┐    ┌────────────────┐
│  Campaign   │───►│  SIP Batch    │───►│  ElevenLabs    │
│  Queue      │    │  Calling      │    │  Outbound API  │
└─────────────┘    │  Service      │    └────────────────┘
                   └───────────────┘           │
                          │                    ▼
                          │             ┌────────────────┐
                          └────────────►│  SIP Provider  │
                                        │  (Twilio etc)  │
                                        └────────────────┘
```

### Batch Calling API

The batch calling service is triggered through the campaign system, not directly via API. It:

1. Fetches pending contacts from the campaign
2. Retrieves the SIP trunk and phone number configuration
3. Makes outbound calls via ElevenLabs API
4. Tracks call status and updates contact records
5. Respects concurrency limits and retry settings

### Limitations

- **OpenAI SIP does not support outbound calling**
- Concurrent calls are limited by plan settings (`maxSipConcurrency`)
- Rate limits apply based on your SIP provider and ElevenLabs account

---

## Incoming Call Routing

### ElevenLabs SIP Incoming Calls

1. Caller dials your phone number
2. Your SIP provider receives the call
3. SIP provider routes to ElevenLabs: `sip.rtc.elevenlabs.io`
4. ElevenLabs looks up the phone number and assigned agent
5. ElevenLabs handles the conversation
6. Call completion updates are sent to AgentHR

**Provider Configuration (Example: Twilio):**
```
Termination URI: sip:sip.rtc.elevenlabs.io:5060;transport=tcp
```

### OpenAI SIP Incoming Calls

1. Caller dials your phone number
2. Your SIP provider receives the call
3. SIP provider routes to OpenAI: `sip:PROJECT_ID@sip.api.openai.com;transport=tls`
4. OpenAI sends webhook to AgentHR: `/api/openai-sip/webhook`
5. AgentHR looks up phone number and agent
6. AgentHR accepts call with agent configuration
7. OpenAI handles the conversation

**Webhook Event Flow:**
```
OpenAI SIP → AgentHR Webhook → Accept/Reject → OpenAI Realtime API
```

### Webhook Security

OpenAI webhooks are secured using HMAC-SHA256 signatures:

- `webhook-id`: Unique ID for idempotency
- `webhook-timestamp`: Unix timestamp of delivery
- `webhook-signature`: `v1,<base64-encoded-hmac-sha256>`

Configure your webhook secret in Admin Settings to enable signature verification.

---

## Troubleshooting

### Common Issues

#### "SIP Engine Not Available" Message

**Cause:** Plugin not installed or enabled.

**Solution:**
1. Verify plugin directory exists: `plugins/sip-engine/`
2. Check `plugin.json` is valid
3. Check server logs for plugin loading errors
4. Restart the application

#### Phone Number Import Fails

**Cause:** Invalid credentials or API configuration.

**Solutions:**
1. Verify SIP trunk credentials are correct
2. Check ElevenLabs API key is configured in admin settings
3. Ensure API key has sufficient permissions
4. Verify phone number format is E.164 (`+` followed by digits)
5. Test trunk connection first

#### Trunk Connection Test Fails

**Cause:** Cannot reach SIP server or authentication failed.

**Solutions:**
1. Verify SIP host and port are correct
2. Check username/password credentials
3. Ensure firewall allows outbound SIP connections
4. Try different transport (TLS vs TCP vs UDP)

#### Inbound Calls Not Connecting

**Cause:** Incorrect routing or agent configuration.

**Solutions:**
1. Verify SIP provider routing points to correct endpoint
2. Check agent is assigned to the phone number
3. Ensure ElevenLabs or OpenAI credentials are valid
4. Review call logs for specific errors

#### Outbound Calls Failing

**Cause:** Permission, credential, or balance issues.

**Solutions:**
1. Verify phone number has outbound enabled
2. Check SIP trunk credentials
3. Ensure sufficient credits in ElevenLabs account
4. Review call logs for specific error codes
5. Verify plan allows outbound calling

#### Audio Quality Issues

**Cause:** Codec mismatch or network issues.

**Solutions:**
1. Use TLS transport when available (more reliable)
2. Check codec compatibility (G.711 recommended)
3. Verify media encryption settings match provider
4. Check network latency and stability

#### OpenAI Webhook Not Receiving Events

**Cause:** Webhook URL not accessible or misconfigured.

**Solutions:**
1. Verify webhook URL is publicly accessible (not localhost)
2. Ensure SSL certificate is valid
3. Check webhook secret matches between OpenAI and AgentHR
4. Review server logs for webhook delivery attempts

#### No Audio on Calls

**Cause:** RTP media ports blocked or NAT issues.

**Solutions:**
1. Open UDP ports 10000-20000 for RTP
2. Configure NAT traversal on your SIP provider
3. Check codec compatibility
4. Verify media encryption settings

### Log Locations

Check logs for debugging:

```bash
grep "\[SIP\]" /var/log/agenthr.log
grep "\[ElevenLabs SIP\]" /var/log/agenthr.log
grep "\[OpenAI SIP\]" /var/log/agenthr.log
```

### Mock Mode Testing

For development without real SIP providers:

```bash
SIP_MOCK_MODE=true
```

This enables:
- Simulated trunk connections
- Mock call creation
- Testing webhooks and API endpoints
- No real calls are made

---

## Changelog

### v2.0.0 (Current)

**Major Features:**
- Added OpenAI SIP engine support for incoming calls
- Support for 13 SIP providers (up from 3)
- Native SIP integration without audio bridging
- Plan-based access control for SIP features
- Admin UI for SIP configuration
- User UI for trunk and phone number management

**API Changes:**
- New `/api/sip/trunks/*` endpoints for trunk management
- New `/api/sip/phone-numbers/*` endpoints for number management
- New `/api/admin/sip/*` endpoints for admin configuration
- New `/api/openai-sip/*` endpoints for OpenAI webhook handling

**Database:**
- Added `sip_trunks` table
- Added `sip_phone_numbers` table
- Added `sip_calls` table
- Extended `admin_settings` for SIP configuration

**Improvements:**
- Auto-provisioning of SIP endpoints during import
- Webhook signature verification for OpenAI
- Enhanced error handling and logging
- Mock mode for development testing

**Breaking Changes:**
- Replaced Fonoster integration with OpenAI SIP
- Changed engine identifiers from `fonoster-openai` to `openai-sip`
- Updated database schema (migration required)

---

## Support

For issues or feature requests:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Contact support@agenthr.io

---

## See Also

- [INSTALLATION.md](../INSTALLATION.md) - Quick installation guide
- [ELEVENLABS-SIP-SETUP.md](./ELEVENLABS-SIP-SETUP.md) - Detailed ElevenLabs setup
- [OPENAI-SIP-SETUP.md](./OPENAI-SIP-SETUP.md) - Detailed OpenAI setup
- [README.md](../README.md) - Plugin overview
