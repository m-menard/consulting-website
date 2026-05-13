# REST API Plugin - Technical Reference

This document provides comprehensive technical documentation for developers integrating with the AgentHR REST API.

> **For installation instructions**, see [INSTALLATION.md](../INSTALLATION.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [API Reference](#api-reference)
6. [Webhook Events](#webhook-events)
7. [Error Handling](#error-handling)
8. [SDK Examples](#sdk-examples)
9. [Security Best Practices](#security-best-practices)

---

## Overview

The REST API Plugin provides a comprehensive API for external system integration with AgentHR. It enables clients to programmatically:

- Trigger outbound calls
- Manage campaigns and contacts
- Configure agents and flows
- Monitor credits and analytics
- Receive real-time events via webhooks

---

## Architecture

### Plugin Structure

```
plugins/rest-api/
├── index.ts              # Plugin entry point, route registration
├── plugin.json           # Plugin metadata
├── types.ts              # TypeScript type definitions
├── middleware/
│   ├── auth.ts           # API key authentication
│   └── rate-limit.ts     # Rate limiting logic
├── routes/
│   ├── calls.ts          # Call management endpoints
│   ├── campaigns.ts      # Campaign endpoints
│   ├── agents.ts         # Agent endpoints
│   ├── contacts.ts       # Contact endpoints
│   ├── credits.ts        # Credit balance endpoints
│   ├── webhooks.ts       # Webhook subscription endpoints
│   └── analytics.ts      # Analytics endpoints
├── services/
│   ├── api-key.service.ts    # API key CRUD operations
│   └── audit-log.service.ts  # Request logging
├── migrations/
│   └── 001_api_tables.sql    # Database schema
└── docs/
    ├── README.md             # This file
    ├── openapi.yaml          # OpenAPI 3.0 specification
    └── AgentHR-API.postman_collection.json
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `api_keys` | Stores API key credentials, scopes, rate limits, IP whitelist |
| `api_audit_logs` | Request audit trail with method, path, status, response time |
| `api_rate_limits` | Sliding window rate limit tracking per API key |

### Request Flow

```
Request → Auth Middleware → Rate Limit Check → Route Handler → Response
                ↓                    ↓               ↓
          Validate Key         Track Usage      Audit Log
```

---

## Authentication

All API endpoints require authentication via API keys. Generate keys from Settings > Developer Access.

### Headers

```
Authorization: Bearer agl_sk_<your_key>
```

or

```
X-API-Key: agl_sk_<your_key>
```

### Scopes

API keys can be configured with specific scopes:

| Scope | Description |
|-------|-------------|
| `calls:read` | View call history and details |
| `calls:write` | Trigger and manage calls |
| `campaigns:read` | View campaigns |
| `campaigns:write` | Create and manage campaigns |
| `agents:read` | View agents |
| `agents:write` | Manage agents and flows |
| `contacts:read` | View contacts |
| `contacts:write` | Create and manage contacts |
| `credits:read` | View credit balance and usage |
| `webhooks:read` | View webhook subscriptions |
| `webhooks:write` | Manage webhook subscriptions |
| `analytics:read` | View analytics data |
| `admin` | Full access to all endpoints |

## Rate Limiting

API keys have configurable rate limits. Default: 100 requests per 60 seconds.

Response headers include:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Reference

Base URL: `/api/v1`

### Calls

#### Trigger a Call

```http
POST /api/v1/calls
```

**Request:**
```json
{
  "agentId": "uuid",
  "toNumber": "+1234567890",
  "fromNumber": "+0987654321",
  "engine": "elevenlabs",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callId": "uuid",
    "status": "queued",
    "agentId": "uuid",
    "toNumber": "+1234567890",
    "fromNumber": "+0987654321",
    "engine": "elevenlabs",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### List Calls

```http
GET /api/v1/calls?page=1&pageSize=20
```

#### Get Call Details

```http
GET /api/v1/calls/:id
```

#### Hangup Call

```http
POST /api/v1/calls/:id/hangup
```

### Campaigns

#### Create Campaign

```http
POST /api/v1/campaigns
```

**Request:**
```json
{
  "name": "Q1 Outreach",
  "agentId": "uuid",
  "scheduledStartTime": "2025-01-15T09:00:00Z",
  "timezone": "America/New_York",
  "callWindowStart": "09:00",
  "callWindowEnd": "18:00",
  "maxConcurrentCalls": 5
}
```

#### List Campaigns

```http
GET /api/v1/campaigns
```

#### Get Campaign Details

```http
GET /api/v1/campaigns/:id
```

#### Add Contacts to Campaign

```http
POST /api/v1/campaigns/:id/contacts
```

**Request:**
```json
{
  "contacts": [
    {
      "phoneNumber": "+1234567890",
      "firstName": "John",
      "lastName": "Doe",
      "customFields": {
        "company": "Acme Inc"
      }
    }
  ]
}
```

#### Start Campaign

```http
POST /api/v1/campaigns/:id/start
```

#### Pause Campaign

```http
POST /api/v1/campaigns/:id/pause
```

### Agents

#### List Agents

```http
GET /api/v1/agents
```

#### Get Agent Details

```http
GET /api/v1/agents/:id
```

#### Export Agent Flow

```http
GET /api/v1/agents/:id/flow
```

#### Import Flow to Agent

```http
PUT /api/v1/agents/:id/flow
```

**Request:**
```json
{
  "flow": {
    "nodes": [...],
    "edges": [...],
    "variables": {...}
  }
}
```

### Contacts

#### List Contacts

```http
GET /api/v1/contacts?page=1&pageSize=50
```

#### Create Contact

```http
POST /api/v1/contacts
```

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "tags": ["lead", "priority"],
  "customFields": {
    "company": "Acme Inc"
  }
}
```

#### Get Contact

```http
GET /api/v1/contacts/:id
```

#### Update Contact

```http
PUT /api/v1/contacts/:id
```

#### Delete Contact

```http
DELETE /api/v1/contacts/:id
```

#### Bulk Import Contacts

```http
POST /api/v1/contacts/bulk-import
```

**Request:**
```json
{
  "contacts": [...],
  "skipDuplicates": true
}
```

### Credits

#### Get Balance

```http
GET /api/v1/credits/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 500,
    "reserved": 0,
    "total": 500,
    "currency": "credits"
  }
}
```

#### Get Usage

```http
GET /api/v1/credits/usage?days=30
```

### Analytics

#### Call Analytics

```http
GET /api/v1/analytics/calls?days=30
```

#### Campaign Analytics

```http
GET /api/v1/analytics/campaigns
```

### Webhooks

#### List Webhooks

```http
GET /api/v1/webhooks
```

#### Create Webhook

```http
POST /api/v1/webhooks
```

**Request:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["call.completed", "campaign.started"],
  "description": "Production webhook"
}
```

**Response includes webhook secret (shown only once):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://your-server.com/webhook",
    "events": ["call.completed", "campaign.started"],
    "secret": "hex-string",
    "isActive": true
  }
}
```

#### Update Webhook

```http
PUT /api/v1/webhooks/:id
```

#### Delete Webhook

```http
DELETE /api/v1/webhooks/:id
```

#### Test Webhook

```http
POST /api/v1/webhooks/:id/test
```

#### List Supported Events

```http
GET /api/v1/webhooks/events
```

## Webhook Events

### Event Format

```json
{
  "event": "call.completed",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "data": {
    "callId": "uuid",
    "status": "completed",
    "duration": 120,
    "transcript": "..."
  }
}
```

### Signature Verification

Verify webhooks using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
}
```

### Supported Events

| Event | Description |
|-------|-------------|
| `call.started` | Call initiated |
| `call.completed` | Call ended successfully |
| `call.failed` | Call failed |
| `campaign.started` | Campaign began execution |
| `campaign.completed` | Campaign finished |
| `campaign.paused` | Campaign paused |
| `contact.created` | Contact added |
| `contact.updated` | Contact modified |
| `credits.low` | Credits below threshold |
| `credits.depleted` | Credits exhausted |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {...}
  },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `INVALID_API_KEY` | 401 | API key not found or expired |
| `INSUFFICIENT_SCOPES` | 403 | API key lacks required scope |
| `IP_NOT_WHITELISTED` | 403 | Request from unauthorized IP |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `CONFLICT` | 409 | Resource state conflict |
| `INTERNAL_ERROR` | 500 | Server error |

## SDK Examples

### Node.js

```javascript
const fetch = require('node-fetch');

const API_KEY = 'agl_sk_your_key';
const BASE_URL = 'https://your-domain.com/api/v1';

async function triggerCall(agentId, toNumber) {
  const response = await fetch(`${BASE_URL}/calls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentId, toNumber }),
  });
  return response.json();
}
```

### Python

```python
import requests

API_KEY = 'agl_sk_your_key'
BASE_URL = 'https://your-domain.com/api/v1'

def trigger_call(agent_id, to_number):
    response = requests.post(
        f'{BASE_URL}/calls',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        },
        json={'agentId': agent_id, 'toNumber': to_number}
    )
    return response.json()
```

### cURL

```bash
curl -X POST https://your-domain.com/api/v1/calls \
  -H "Authorization: Bearer agl_sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "uuid", "toNumber": "+1234567890"}'
```

## Security Best Practices

1. **Rotate keys regularly** - Use the regenerate endpoint
2. **Use IP whitelisting** - Restrict access to known IPs
3. **Limit scopes** - Grant minimum required permissions
4. **Set expiration** - Use short-lived keys when possible
5. **Monitor audit logs** - Review API usage regularly
6. **Use HTTPS** - All API calls should use TLS
7. **Verify webhook signatures** - Always validate before processing

## Version

- Plugin Version: 1.0.0
- API Version: v1
