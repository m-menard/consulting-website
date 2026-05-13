# OpenAI SIP Setup Guide

## Overview

OpenAI SIP enables **incoming calls only** using OpenAI's native Realtime SIP integration.
When a call comes in, OpenAI handles the conversation directly without any audio bridging.

**Capabilities:**
- Incoming calls only (outbound not supported by OpenAI SIP)
- Native SIP integration - no audio bridge needed
- Uses GPT Realtime for voice conversations
- Automatic transcription and tool calling support

## Prerequisites

1. **OpenAI Platform Account** with access to Realtime API
2. **OpenAI Project** with billing enabled
3. **SIP Trunk Provider** (Twilio, Plivo, Telnyx, etc.)
4. **Phone Number** from your SIP provider

## Step-by-Step Setup

### Step 1: Get Your OpenAI Project ID

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **Settings** > **Project** > **General**
3. Find your **Project ID** (starts with `proj_`)
4. Copy this ID for use in AgentHR admin settings

### Step 2: Configure Webhook in OpenAI Platform

1. In OpenAI Platform, go to **Settings** > **Project** > **Webhooks**
2. Click **Add Webhook**
3. Enter the Webhook URL from AgentHR admin panel:
   ```
   https://your-domain.com/api/openai-sip/webhook
   ```
4. Select event: `realtime.call.incoming`
5. Save and copy the **Webhook Secret** for AgentHR

### Step 3: Configure AgentHR Admin Settings

1. Go to **Admin Panel** > **Plugins** > **SIP Engine** > **OpenAI SIP Setup**
2. Enter your **OpenAI Project ID**
3. Enter your **Webhook Secret** from OpenAI
4. Click **Save**
5. Copy the generated **SIP Endpoint** for your SIP provider

### Step 4: Configure Your SIP Trunk Provider

Point your SIP trunk to the OpenAI SIP endpoint:

```
sip:PROJECT_ID@sip.api.openai.com;transport=tls
```

**Provider-Specific Instructions:**

| Provider | Configuration Location |
|----------|----------------------|
| Twilio | Elastic SIP Trunking > Termination > SIP URI |
| Plivo | SIP Trunk > Outbound Trunk > Destination |
| Telnyx | Outbound > SIP Trunk > Termination SIP URI |
| Vonage | SIP Trunk > Routes > SIP Endpoint |

### Step 5: Import Phone Numbers in AgentHR

1. Create a new SIP Trunk in **Phone Numbers** > **SIP Trunks** tab
2. Select **OpenAI SIP** as the engine
3. Select your SIP provider and enter credentials
4. Import your phone numbers
5. Assign an AI agent to each phone number

### Step 6: Test Your Setup

1. Call one of your imported phone numbers
2. The call should be routed to OpenAI
3. OpenAI sends a webhook to AgentHR
4. AgentHR accepts the call with your agent's configuration
5. The AI conversation begins

## Troubleshooting

### Webhook Not Receiving Events

- Verify webhook URL is publicly accessible (not localhost)
- Check webhook secret matches between OpenAI and AgentHR
- Ensure SSL certificate is valid (required for webhooks)

### Calls Not Connecting

- Verify SIP endpoint is correctly configured in your provider
- Check that TLS transport is enabled (`transport=tls`)
- Ensure phone number is properly imported in AgentHR

### Agent Not Responding

- Verify agent is assigned to the phone number
- Check agent has a valid system prompt configured
- Review call logs in AgentHR for error details

## API Reference

### Webhook Event: realtime.call.incoming

```json
{
  "object": "event",
  "id": "evt_...",
  "type": "realtime.call.incoming",
  "created_at": 1750287018,
  "data": {
    "call_id": "rtc_...",
    "sip_headers": [
      { "name": "From", "value": "sip:+14255551212@sip.example.com" },
      { "name": "To", "value": "sip:+18005551212@sip.example.com" },
      { "name": "Call-ID", "value": "..." }
    ]
  }
}
```

### Accept Call Endpoint

```bash
POST https://api.openai.com/v1/realtime/calls/{call_id}/accept
Authorization: Bearer $OPENAI_API_KEY
Content-Type: application/json

{
  "type": "realtime",
  "model": "gpt-realtime-1.5",
  "instructions": "Your agent instructions here",
  "voice": "alloy"
}
```

## Security Considerations

- Always verify webhook signatures using the webhook secret
- Store API keys and secrets securely (never in code)
- Use TLS transport for all SIP connections
- Regularly rotate API keys and webhook secrets
