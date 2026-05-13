# REST API Plugin - Complete Documentation

**Version:** 1.0.0  
**Author:** AgentHR  
**License:** Commercial  
**Compatibility:** AgentHR >=1.0.0, Node.js >=18.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Authentication](#authentication)
5. [Scopes & Permissions](#scopes--permissions)
6. [Rate Limiting](#rate-limiting)
7. [API Reference](#api-reference)
   - [Calls API](#calls-api)
   - [Campaigns API](#campaigns-api)
   - [Agents API](#agents-api)
   - [Contacts API](#contacts-api)
   - [Credits API](#credits-api)
   - [Analytics API](#analytics-api)
   - [Webhooks API](#webhooks-api)
   - [User API Keys](#user-api-key-management)
   - [Admin API Keys](#admin-api-key-management)
8. [Audit Logging](#audit-logging)
9. [Configuration](#configuration)
10. [Swagger/OpenAPI Access](#swaggeropenapi-access)
11. [Response Format](#response-format)
12. [Error Codes](#error-codes)
13. [Troubleshooting](#troubleshooting)
14. [Changelog](#changelog)

---

## Overview

The REST API Plugin provides a comprehensive RESTful interface for external system integration with AgentHR. It enables clients to programmatically:

- **Trigger and manage voice calls** using AI-powered agents
- **Create and monitor bulk calling campaigns**
- **Manage AI voice agents** and their configurations
- **Handle CRM contacts** with full CRUD operations
- **Monitor credit balance and usage**
- **Subscribe to real-time webhook events**
- **Access call and campaign analytics**

The API follows REST conventions, uses JSON for request/response bodies, and implements industry-standard authentication via API keys.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Agents** | AI voice agents that handle conversations. Two types: Flow (visual conversation builder) and Incoming (for inbound calls). |
| **Campaigns** | Bulk calling operations targeting multiple contacts with the same agent. |
| **Calls** | Individual voice call records with transcripts, recordings, and analytics. |
| **Contacts** | Your CRM leads with phone numbers, custom fields, and AI-enriched data. |
| **Credits** | Billing units where 1 credit = 1 minute of call time. |
| **Webhooks** | Real-time event notifications delivered to your endpoints. |

### Telephony Engines

AgentHR supports three telephony engines for different use cases:

| Engine | AI Provider | Best For |
|--------|-------------|----------|
| `elevenlabs` | ElevenLabs Conversational AI | High-quality voices, 29 languages |
| `plivo` | OpenAI Realtime API | India and APAC regions |
| `twilio-openai` | OpenAI Realtime API | Global coverage, reliable routing |

---

## Features

The REST API Plugin includes the following features:

| Feature | Description |
|---------|-------------|
| API Key Authentication | Secure API key-based authentication with bcrypt-hashed storage |
| Rate Limiting | Sliding window rate limiting per API key |
| Request Audit Logging | Complete request/response logging for security and debugging |
| IP Whitelisting | Optional IP address restrictions per API key |
| Scoped Permissions | Fine-grained access control with 13 permission scopes |
| Calls API | Trigger calls, list history, get details, hangup active calls |
| Campaigns API | Create campaigns, add contacts, start/pause/stop operations |
| Agents API | View and manage AI agents, export/import flows |
| Contacts API | Full CRUD for CRM leads with bulk import support |
| Credits API | View balance and usage history |
| Analytics API | Call and campaign statistics |
| Webhooks API | Subscribe to real-time events |
| Redoc Documentation | Beautiful API documentation at `/api/docs` |
| Swagger UI Playground | Interactive API testing at `/api/docs/playground` |
| Flow Export/Import | Backup and restore agent conversation flows |

---

## Installation

### Prerequisites

- AgentHR v1.0.0 or higher running
- PostgreSQL 14+ database configured
- Admin access to your AgentHR installation

### Step 1: Copy Plugin Files

Copy the `rest-api` folder to your AgentHR plugins directory:

```bash
cp -r /path/to/rest-api agenthr/plugins/
```

Your directory structure should look like:

```
agenthr/
├── plugins/
│   └── rest-api/
│       ├── plugin.json
│       ├── index.ts
│       ├── INSTALLATION.md
│       ├── migrations/
│       │   └── 001_api_tables.sql
│       ├── routes/
│       │   ├── admin.routes.ts
│       │   ├── agents.routes.ts
│       │   ├── analytics.routes.ts
│       │   ├── api-keys.routes.ts
│       │   ├── calls.routes.ts
│       │   ├── campaigns.routes.ts
│       │   ├── contacts.routes.ts
│       │   ├── credits.routes.ts
│       │   └── webhooks.routes.ts
│       ├── services/
│       │   └── api-key.service.ts
│       ├── middleware/
│       │   └── auth.middleware.ts
│       └── docs/
│           ├── openapi.yaml
│           └── DOCUMENTATION.md
├── server/
├── client/
└── ...
```

### Step 2: Run Database Migration

The plugin requires database tables for API keys, audit logs, and rate limiting.

**Option A: Using Drizzle (if tables are in shared/schema.ts)**
```bash
npm run db:push
```

**Option B: Direct SQL (standalone plugin install)**
```bash
psql $DATABASE_URL -f plugins/rest-api/migrations/001_api_tables.sql
```

**Tables Created:**

| Table | Purpose |
|-------|---------|
| `api_keys` | Stores API key credentials, scopes, and rate limits |
| `api_audit_logs` | Tracks all API requests for security and debugging |
| `api_rate_limits` | Sliding window rate limiting counters |

### Step 3: Register the Plugin

Add the plugin routes in `server/routes.ts` with authentication middleware:

```typescript
import { registerRestApiRoutes } from '../plugins/rest-api';
import { markPluginAsRegistered } from './plugins/loader';

export async function registerRoutes(app: Express) {
  // ... existing routes ...
  
  // Register REST API plugin with auth middleware
  registerRestApiRoutes(app, {
    sessionAuthMiddleware: authenticateToken,  // Your session auth middleware
    adminAuthMiddleware: checkAdmin,           // Your admin check middleware
  });
  markPluginAsRegistered('rest-api');
  console.log('✅ REST API Plugin initialized');
}
```

> **Important**: Always pass authentication middleware to protect API endpoints.

### Step 4: Add UI Components

Add the Developer Access tab to your user settings page.

**In `client/src/pages/Settings.tsx`:**

```tsx
import { ApiKeysTab } from '@/components/api-keys/ApiKeysTab';

// Add to Tabs component:
<TabsTrigger value="developer">Developer Access</TabsTrigger>

// Add TabsContent:
<TabsContent value="developer">
  <ApiKeysTab />
</TabsContent>
```

**For Admin API management (optional), in admin settings:**

```tsx
import { AdminApiKeysModule } from '@/components/admin/AdminApiKeysModule';

// Add to admin tabs:
<TabsTrigger value="api-access">API Access</TabsTrigger>

<TabsContent value="api-access">
  <AdminApiKeysModule />
</TabsContent>
```

### Step 5: Restart Application

```bash
# Development
npm run dev

# Production
bash scripts/production.sh restart
```

You should see in the logs:
```
[REST API] Plugin registered at /api/v1
✅ REST API Plugin initialized
```

### Step 6: Verify Installation

| Check | How to Verify |
|-------|---------------|
| Plugin Status | Admin Panel → Settings → Plugins → REST API shows "Enabled" |
| API Docs | Visit `https://your-domain.com/api/docs` |
| API Playground | Visit `https://your-domain.com/api/docs/playground` |
| Health Check | `curl https://your-domain.com/api/v1/health` returns `{"success":true}` |

---

## Authentication

All API endpoints (except `/health`) require authentication via API keys.

### API Key Format

API keys follow this format:
```
agl_sk_<random_base64url_string>
```

Example:
```
agl_sk_7f3d2a1b5c8e9f0a4b6c8d2e5f7a9b3c1d5e7f9a
```

- **Prefix**: `agl_sk_` (AgentHR Secret Key)
- **Secret**: 32 bytes of cryptographically secure random data encoded in base64url

### Providing API Keys

Include your API key in every request using one of these methods:

**Option 1: Authorization Header (Recommended)**
```bash
curl -H "Authorization: Bearer agl_sk_YOUR_KEY" \
     https://your-domain.com/api/v1/calls
```

**Option 2: X-API-Key Header**
```bash
curl -H "X-API-Key: agl_sk_YOUR_KEY" \
     https://your-domain.com/api/v1/calls
```

### Generating API Keys

1. Log in to AgentHR as a user
2. Go to **Settings → Developer Access** tab
3. Click **"Create API Key"**
4. Name your key and select permission scopes
5. **Copy the API key immediately** (shown only once)

### Security Best Practices

- **Never share your API key** in public repositories or client-side code
- **Use scoped permissions** to limit access to only what's needed
- **Enable IP whitelisting** for production integrations
- **Regenerate keys** if you suspect they've been compromised
- **Use separate keys** for development and production

---

## Scopes & Permissions

API keys can be granted specific scopes to control access. Each endpoint requires a specific scope.

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `calls:read` | View call history and details | Read |
| `calls:write` | Trigger and manage calls | Write |
| `campaigns:read` | View campaigns and their status | Read |
| `campaigns:write` | Create, start, pause, and manage campaigns | Write |
| `agents:read` | View agents and their configurations | Read |
| `agents:write` | Create and manage agents, export/import flows | Write |
| `contacts:read` | View CRM contacts/leads | Read |
| `contacts:write` | Create, update, delete, and bulk import contacts | Write |
| `credits:read` | View credit balance and usage history | Read |
| `webhooks:read` | View webhook subscriptions | Read |
| `webhooks:write` | Create, update, delete, and test webhooks | Write |
| `analytics:read` | View call and campaign analytics | Read |
| `admin` | Full administrative access to all endpoints | Full |

### Scope Hierarchy

- The `admin` scope grants access to **all** endpoints
- Write scopes include read access for the same resource
- Example: `calls:write` allows both reading and writing calls

### Default Scopes

When creating a new API key without specifying scopes, these defaults are assigned:
- `calls:read`
- `calls:write`
- `campaigns:read`
- `contacts:read`

---

## Rate Limiting

The API implements sliding window rate limiting to prevent abuse.

### Default Limits

| Setting | Default Value |
|---------|---------------|
| Requests per minute | 100 |
| Window duration | 60 seconds |

### Plan-Based Limits

| Plan | Limit |
|------|-------|
| Free | 60 requests/minute |
| Pro | 300 requests/minute |
| Enterprise | 1000 requests/minute |

### Rate Limit Headers

Every response includes rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

### Rate Limit Exceeded Response

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 45 seconds.",
    "details": {
      "retryAfter": 45
    }
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**HTTP Status**: `429 Too Many Requests`

### Best Practices

- Implement exponential backoff on 429 responses
- Cache responses when possible
- Use webhooks instead of polling for real-time updates
- Batch operations when available

---

## API Reference

### Base URL

All API endpoints are prefixed with:
```
/api/v1
```

Full URL example:
```
https://your-domain.com/api/v1/calls
```

---

### Calls API

Trigger and manage voice calls.

#### POST /api/v1/calls

Trigger a new outbound call.

**Required Scope**: `calls:write`

**Request Body:**

```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "toNumber": "+14155551234",
  "fromNumber": "+14155559999",
  "engine": "twilio-openai",
  "metadata": {
    "customerId": "C123"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | ID of the agent to use |
| `toNumber` | string | Yes | Phone number to call (E.164 format) |
| `fromNumber` | string | No | Caller ID (uses default if not provided) |
| `engine` | string | No | `elevenlabs`, `plivo`, or `twilio-openai` |
| `metadata` | object | No | Custom key-value pairs |
| `scheduledAt` | string | No | ISO 8601 datetime for scheduled calls |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "queued",
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "toNumber": "+14155551234",
    "fromNumber": "+14155559999",
    "engine": "twilio-openai",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/calls

List all calls with pagination.

**Required Scope**: `calls:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 20 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "engine": "twilio-openai",
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      "toNumber": "+14155551234",
      "fromNumber": "+14155559999",
      "status": "completed",
      "duration": 120,
      "creditsUsed": 2,
      "transcript": "Agent: Hello! How can I help you today?...",
      "aiSummary": "Customer inquired about pricing...",
      "recordingUrl": "https://storage.example.com/recordings/abc.mp3",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "endedAt": "2024-01-01T00:02:00.000Z"
    }
  ],
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### GET /api/v1/calls/:id

Get detailed information about a specific call.

**Required Scope**: `calls:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "engine": "twilio-openai",
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "toNumber": "+14155551234",
    "fromNumber": "+14155559999",
    "status": "completed",
    "duration": 120,
    "creditsUsed": 2,
    "transcript": "Agent: Hello! How can I help you today?\nCustomer: I'd like to know about pricing...",
    "aiSummary": "Customer inquired about pricing for the Pro plan. Expressed interest in annual billing.",
    "recordingUrl": "https://storage.example.com/recordings/abc.mp3",
    "sentiment": "positive",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "endedAt": "2024-01-01T00:02:00.000Z"
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /api/v1/calls/:id/hangup

Terminate an active call.

**Required Scope**: `calls:write`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "hangup_requested",
    "message": "Hangup request sent to call."
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Campaigns API

Create and manage bulk calling campaigns.

#### GET /api/v1/campaigns

List all campaigns.

**Required Scope**: `campaigns:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 20 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Q1 Lead Outreach",
      "status": "running",
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      "totalContacts": 500,
      "called": 245,
      "completed": 198,
      "failed": 47,
      "pending": 255,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 12,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

#### POST /api/v1/campaigns

Create a new campaign.

**Required Scope**: `campaigns:write`

**Request Body (JSON):**

```json
{
  "name": "Q1 Lead Outreach",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumberId": "550e8400-e29b-41d4-a716-446655440003",
  "engine": "twilio-openai",
  "scheduledStartTime": "2024-01-15T09:00:00Z",
  "timezone": "America/New_York",
  "callWindowStart": "09:00",
  "callWindowEnd": "18:00",
  "maxConcurrentCalls": 10,
  "retryAttempts": 2,
  "retryDelayMinutes": 60
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Campaign name (max 255 chars) |
| `agentId` | string (UUID) | Yes | Agent to use for calls |
| `phoneNumberId` | string (UUID) | No | Specific phone number to use |
| `engine` | string | No | Telephony engine |
| `scheduledStartTime` | string | No | When to start (ISO 8601) |
| `timezone` | string | No | Timezone for scheduling |
| `callWindowStart` | string | No | Daily start time (HH:MM) |
| `callWindowEnd` | string | No | Daily end time (HH:MM) |
| `maxConcurrentCalls` | integer | No | Max simultaneous calls (1-100) |
| `retryAttempts` | integer | No | Retry count for unanswered (0-5) |
| `retryDelayMinutes` | integer | No | Delay between retries (1-1440) |

**Request with CSV Upload (multipart/form-data):**

```bash
curl -X POST "https://your-domain.com/api/v1/campaigns" \
  -H "Authorization: Bearer agl_sk_YOUR_KEY" \
  -F "data={\"name\": \"Q1 Outreach\", \"agentId\": \"550e8400-e29b-41d4-a716-446655440000\"}" \
  -F "contacts=@leads.csv"
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Q1 Lead Outreach",
    "status": "draft",
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "contacts": {
      "fileName": "leads.csv",
      "totalRows": 150,
      "contactsAdded": 145,
      "contactsSkipped": 3,
      "invalidRows": 2
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/campaigns/:id

Get campaign details.

**Required Scope**: `campaigns:read`

---

#### POST /api/v1/campaigns/:id/contacts

Add contacts to an existing campaign.

**Required Scope**: `campaigns:write`

**Request Body:**

```json
{
  "contacts": [
    {
      "phoneNumber": "+14155551234",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "customFields": {
        "accountId": "ACC-123"
      }
    }
  ]
}
```

---

#### POST /api/v1/campaigns/:id/start

Start a campaign.

**Required Scope**: `campaigns:write`

---

#### POST /api/v1/campaigns/:id/pause

Pause a running campaign.

**Required Scope**: `campaigns:write`

---

#### POST /api/v1/campaigns/:id/resume

Resume a paused campaign.

**Required Scope**: `campaigns:write`

---

#### POST /api/v1/campaigns/:id/stop

Stop a campaign permanently.

**Required Scope**: `campaigns:write`

---

### Agents API

View and manage AI voice agents.

#### GET /api/v1/agents

List all agents.

**Required Scope**: `agents:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Sales Agent",
      "type": "flow",
      "telephonyProvider": "twilio-openai",
      "language": "en",
      "isActive": true,
      "transferEnabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/agents/:id

Get agent details.

**Required Scope**: `agents:read`

---

#### GET /api/v1/agents/:id/flow

Export an agent's conversation flow (Flow-type agents only).

**Required Scope**: `agents:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "agentName": "Sales Agent",
    "exportedAt": "2024-01-01T00:00:00.000Z",
    "flow": {
      "nodes": [...],
      "edges": [...],
      "variables": {...}
    }
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PUT /api/v1/agents/:id/flow

Import a conversation flow to an agent.

**Required Scope**: `agents:write`

**Request Body:**

```json
{
  "flow": {
    "nodes": [...],
    "edges": [...],
    "variables": {...}
  }
}
```

---

### Contacts API

Manage CRM contacts/leads.

#### GET /api/v1/contacts

List all contacts.

**Required Scope**: `contacts:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 50 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "phone": "+14155551234",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "tags": ["lead", "enterprise"],
      "customFields": {
        "accountId": "ACC-123"
      },
      "stage": "qualified",
      "leadScore": 85,
      "aiSummary": "Interested in enterprise plan...",
      "sentiment": "positive",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /api/v1/contacts

Create a new contact.

**Required Scope**: `contacts:write`

**Request Body:**

```json
{
  "phone": "+14155551234",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "tags": ["lead", "enterprise"],
  "customFields": {
    "accountId": "ACC-123",
    "preferredTime": "morning"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number (min 10 digits) |
| `firstName` | string | No | First name |
| `lastName` | string | No | Last name |
| `email` | string | No | Email address |
| `company` | string | No | Company name |
| `tags` | array | No | Array of tags |
| `customFields` | object | No | Key-value custom fields |

---

#### GET /api/v1/contacts/:id

Get contact details.

**Required Scope**: `contacts:read`

---

#### PUT /api/v1/contacts/:id

Update a contact.

**Required Scope**: `contacts:write`

---

#### DELETE /api/v1/contacts/:id

Delete a contact.

**Required Scope**: `contacts:write`

---

#### POST /api/v1/contacts/bulk-import

Import up to 10,000 contacts at once.

**Required Scope**: `contacts:write`

**Request Body:**

```json
{
  "contacts": [
    {
      "phone": "+14155551234",
      "firstName": "John",
      "lastName": "Doe"
    },
    {
      "phone": "+14155555678",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  ],
  "skipDuplicates": true
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "imported": 1998,
    "skipped": 2,
    "errors": [
      {
        "row": 45,
        "phoneNumber": "invalid",
        "error": "Invalid phone number format"
      }
    ]
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Credits API

View credit balance and usage.

#### GET /api/v1/credits/balance

Get current credit balance.

**Required Scope**: `credits:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "available": 1500,
    "reserved": 0,
    "total": 1500,
    "currency": "credits"
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/credits/usage

Get credit usage history.

**Required Scope**: `credits:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 30 | Number of days (max 90) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.000Z"
    },
    "usage": [
      {
        "date": "2024-01-15",
        "calls": 45,
        "minutes": 120,
        "credits": 120
      }
    ],
    "total": {
      "calls": 500,
      "minutes": 1200,
      "credits": 1200
    }
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Analytics API

Access call and campaign statistics.

#### GET /api/v1/analytics/calls

Get call analytics.

**Required Scope**: `analytics:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 30 | Analysis period (max 90) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalCalls": 1500,
    "completedCalls": 1200,
    "failedCalls": 300,
    "totalDurationMinutes": 3600,
    "averageDurationSeconds": 144,
    "creditsUsed": 3600,
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.000Z"
    }
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/analytics/campaigns

Get campaign analytics.

**Required Scope**: `analytics:read`

---

#### GET /api/v1/analytics/summary

Get high-level analytics summary.

**Required Scope**: `analytics:read`

---

### Webhooks API

Subscribe to real-time event notifications.

#### Supported Events

| Event | Description |
|-------|-------------|
| `call.started` | Call initiated |
| `call.completed` | Call ended successfully |
| `call.failed` | Call failed |
| `campaign.started` | Campaign began execution |
| `campaign.completed` | Campaign finished |
| `campaign.paused` | Campaign paused |
| `contact.created` | New contact added |
| `contact.updated` | Contact modified |
| `credits.low` | Credits running low |
| `credits.depleted` | Credits exhausted |

---

#### GET /api/v1/webhooks

List all webhook subscriptions.

**Required Scope**: `webhooks:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "url": "https://your-server.com/webhooks/agenthr",
      "events": ["call.started", "call.completed", "call.failed"],
      "isActive": true,
      "description": "Main webhook endpoint",
      "lastDeliveryAt": "2024-01-15T12:30:00.000Z",
      "lastDeliveryStatus": "success",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /api/v1/webhooks

Create a new webhook subscription.

**Required Scope**: `webhooks:write`

**Request Body:**

```json
{
  "url": "https://your-server.com/webhooks/agenthr",
  "events": ["call.started", "call.completed", "call.failed"],
  "description": "Main webhook endpoint"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "url": "https://your-server.com/webhooks/agenthr",
    "events": ["call.started", "call.completed", "call.failed"],
    "secret": "whsec_abc123def456...",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/webhooks/events

List all supported webhook events.

**Required Scope**: `webhooks:read`

---

#### PUT /api/v1/webhooks/:id

Update a webhook subscription.

**Required Scope**: `webhooks:write`

---

#### DELETE /api/v1/webhooks/:id

Delete a webhook subscription.

**Required Scope**: `webhooks:write`

---

#### POST /api/v1/webhooks/:id/test

Send a test payload to verify your webhook endpoint.

**Required Scope**: `webhooks:write`

---

### User API Key Management

Routes for users to manage their own API keys. These use session authentication (not API key auth).

#### GET /api/user/api-keys

List your API keys.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "name": "Production Key",
      "keyPrefix": "agl_sk_7f3d2a1b",
      "scopes": ["calls:read", "calls:write", "campaigns:read"],
      "rateLimit": 100,
      "ipWhitelist": ["203.0.113.50"],
      "isActive": true,
      "lastUsedAt": "2024-01-15T12:30:00.000Z",
      "totalRequests": 15420,
      "expiresAt": null,
      "description": "Main production integration",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/user/api-keys

Create a new API key.

**Request Body:**

```json
{
  "name": "Production Key",
  "scopes": ["calls:read", "calls:write", "campaigns:read"],
  "rateLimit": 200,
  "ipWhitelist": ["203.0.113.50"],
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "description": "Main production integration"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440006",
    "name": "Production Key",
    "key": "agl_sk_7f3d2a1b5c8e9f0a4b6c8d2e5f7a9b3c1d5e7f9a",
    "keyPrefix": "agl_sk_7f3d2a1b",
    "scopes": ["calls:read", "calls:write", "campaigns:read"],
    "rateLimit": 200,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "API key created. Copy it now - it won't be shown again!"
}
```

> **Important**: The full API key is only shown once upon creation. Store it securely!

---

#### PATCH /api/user/api-keys/:id

Update an API key's settings.

**Request Body:**

```json
{
  "name": "Updated Key Name",
  "scopes": ["calls:read"],
  "rateLimit": 150,
  "ipWhitelist": ["203.0.113.50", "203.0.113.51"],
  "isActive": false,
  "description": "Updated description"
}
```

---

#### POST /api/user/api-keys/:id/regenerate

Regenerate an API key (creates new secret, keeps settings).

---

#### DELETE /api/user/api-keys/:id

Revoke/delete an API key.

---

### Admin API Key Management

Routes for administrators to manage all API keys. Requires admin session authentication.

#### GET /api/admin/api-keys

List all API keys across all users.

**Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440006",
    "userId": "550e8400-e29b-41d4-a716-446655440007",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "name": "Production Key",
    "keyPrefix": "agl_sk_7f3d2a1b",
    "scopes": ["calls:read", "calls:write"],
    "rateLimit": 100,
    "rateLimitWindow": 60,
    "isActive": true,
    "lastUsedAt": "2024-01-15T12:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET /api/admin/api-keys/settings

Get default rate limit settings.

---

#### PUT /api/admin/api-keys/settings

Update default rate limit settings.

**Request Body:**

```json
{
  "defaultRateLimit": 100,
  "defaultRateLimitWindow": 60
}
```

---

#### PATCH /api/admin/api-keys/:id

Update any API key (toggle active, adjust rate limits).

**Request Body:**

```json
{
  "isActive": false,
  "rateLimit": 50,
  "rateLimitWindow": 60
}
```

---

#### DELETE /api/admin/api-keys/:id

Delete any API key.

---

## Audit Logging

All API requests are logged for security and debugging purposes.

### What's Logged

| Field | Description |
|-------|-------------|
| `userId` | The user who owns the API key |
| `apiKeyId` | The API key used |
| `method` | HTTP method (GET, POST, etc.) |
| `endpoint` | Route path template |
| `path` | Actual request path |
| `requestBody` | Request body (sensitive fields redacted) |
| `queryParams` | Query string parameters |
| `statusCode` | HTTP response status |
| `responseTime` | Request duration in milliseconds |
| `errorMessage` | Error message if request failed |
| `ipAddress` | Client IP address |
| `userAgent` | Client user agent string |
| `requestId` | Unique request identifier |
| `createdAt` | Timestamp |

### Sensitive Data Handling

The following fields are automatically redacted from audit logs:
- `password`
- `secret`
- `apiKey`
- `token`

### Retention Period

Audit logs are retained based on the `auditLogRetentionDays` setting (default: 90 days).

---

## Configuration

### Admin Settings

Configure in **Admin → Settings → System**:

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable or disable the REST API plugin |
| `defaultRateLimit` | `100` | Default requests per minute for new API keys |
| `auditLogRetentionDays` | `90` | Days to retain API audit logs |

### Environment Variables

The plugin uses standard AgentHR environment configuration. No additional environment variables are required.

### IP Whitelisting

To restrict API access to specific IP addresses:

1. Navigate to **Settings → Developer Access**
2. Edit the API key
3. Add IP addresses to the whitelist (comma-separated)
4. Leave empty to allow all IPs

---

## Swagger/OpenAPI Access

### Interactive Documentation

| URL | Description |
|-----|-------------|
| `/api/docs` | Redoc API documentation (beautiful, read-only) |
| `/api/docs/playground` | Swagger UI (interactive testing) |

### OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
```
/api/docs/openapi.yaml
```

### Postman Collection

Import the Postman collection from:
```
plugins/rest-api/docs/AgentHR-API.postman_collection.json
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "abc123xyz",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "meta": {
    "requestId": "abc123xyz",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | API key not provided |
| `INVALID_API_KEY` | 401 | API key is invalid or malformed |
| `EXPIRED_API_KEY` | 401 | API key has expired |
| `INSUFFICIENT_SCOPES` | 403 | API key lacks required permission |
| `IP_NOT_WHITELISTED` | 403 | Client IP not in whitelist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `INVALID_REQUEST_BODY` | 400 | Request body is malformed |
| `MISSING_REQUIRED_FIELD` | 400 | Required field not provided |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `CONFLICT` | 409 | Operation conflicts with current state |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `AGENT_NOT_ACTIVE` | 400 | Agent is disabled |
| `CAMPAIGN_NOT_ACTIVE` | 400 | Campaign is not in active state |
| `PHONE_NUMBER_NOT_AVAILABLE` | 400 | No phone number available |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Troubleshooting

### Plugin Not Loading

1. Check `plugin.json` exists and is valid JSON
2. Verify database migration ran successfully
3. Check server logs for error messages

**Verify tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('api_keys', 'api_audit_logs', 'api_rate_limits');
```

### API Returns 401 Unauthorized

- Verify API key format starts with `agl_sk_`
- Check if the key has been revoked (`isActive: false`)
- Ensure the key hasn't expired
- Confirm you're using the correct header format

**Test authentication:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/v1/health
```

### API Returns 403 Forbidden

**Insufficient Scopes:**
- Check the endpoint's required scope
- Verify your API key has the necessary scope
- The `admin` scope grants access to all endpoints

**IP Not Whitelisted:**
- Check your current IP address
- Update allowed IPs in Settings → Developer Access
- Leave whitelist empty to allow all IPs

### API Returns 404 Not Found

1. Verify plugin is enabled in Admin Settings
2. Restart the application after installation
3. Check that routes are registered in logs

**Look for in logs:**
```
[REST API] Plugin registered at /api/v1
✅ REST API Plugin initialized
```

### Rate Limit Errors

- Check the key's rate limit configuration
- Wait for the rate limit window to reset (check `X-RateLimit-Reset` header)
- Admin can increase limits for specific keys
- Implement exponential backoff in your client

### Call Initiation Fails

**INSUFFICIENT_CREDITS:**
- Check credit balance
- Purchase more credits

**AGENT_NOT_ACTIVE:**
- Activate the agent in the dashboard

**PHONE_NUMBER_NOT_AVAILABLE:**
- Provide a `fromNumber` or purchase a phone number

---

## Changelog

### v1.0.0 (Initial Release)

**Features:**
- API Key Authentication with bcrypt-hashed storage
- Scoped permissions (13 scopes)
- Rate limiting with sliding window
- IP whitelisting support
- Complete audit logging
- Calls API (trigger, list, details, hangup)
- Campaigns API (CRUD, contacts, lifecycle management)
- Agents API (list, details, flow export/import)
- Contacts API (CRUD, bulk import up to 10,000)
- Credits API (balance, usage history)
- Analytics API (calls, campaigns, summary)
- Webhooks API (subscribe, test, manage)
- User API key management
- Admin API key management
- Redoc documentation at `/api/docs`
- Swagger UI playground at `/api/docs/playground`
- OpenAPI 3.0 specification
- Postman collection

**Database Tables:**
- `api_keys` - API key storage
- `api_audit_logs` - Request logging
- `api_rate_limits` - Rate limiting

**Compatibility:**
- AgentHR v1.0.0+
- Node.js v18.0.0+
- PostgreSQL 14+

---

## Support

For issues or questions:

- **API Documentation**: `/api/docs`
- **Interactive Playground**: `/api/docs/playground`
- **Technical Reference**: `plugins/rest-api/docs/README.md`
- **Email**: support@agenthr.io

---

*REST API Plugin v1.0.0 - AgentHR*
