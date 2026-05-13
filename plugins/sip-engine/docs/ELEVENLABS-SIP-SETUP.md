# ElevenLabs SIP Setup Guide

## Overview

ElevenLabs SIP enables both **inbound and outbound calls** using ElevenLabs Conversational AI.
It connects your SIP trunk directly to ElevenLabs, allowing AI agents to handle phone calls.

**Capabilities:**
- Inbound calls (receive calls to AI agents)
- Outbound calls (AI agents can dial out)
- Works with Natural, Flow, and Incoming agent types
- 13 pre-configured SIP providers with auto-fill defaults
- Campaign support for bulk outbound calling

## Prerequisites

1. **ElevenLabs Account** with Conversational AI access
2. **ElevenLabs API Key** configured in AgentHR admin settings
3. **SIP Trunk Provider** account (Twilio, Plivo, Telnyx, etc.)
4. **Phone Numbers** from your SIP provider

## Supported SIP Providers

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
| **Generic** | (custom) | 5060 | TCP | Any SIP provider |

## Step-by-Step Setup

### Step 1: Configure Your SIP Provider Account

**For Twilio:**
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Elastic SIP Trunking** > **Trunks**
3. Create a new trunk or use existing
4. Note your **SIP Domain** (e.g., `example.sip.twilio.com`)
5. Configure authentication credentials

**For Plivo:**
1. Go to [Plivo Console](https://console.plivo.com)
2. Navigate to **Voice** > **SIP Trunk**
3. Create a new SIP Endpoint
4. Configure **Username** and **Password**
5. Note your endpoint details

**For Telnyx:**
1. Go to [Telnyx Mission Control](https://portal.telnyx.com)
2. Navigate to **SIP Trunking**
3. Create a new SIP Trunk
4. Configure authentication
5. Note your SIP connection details

### Step 2: Create SIP Trunk in AgentHR

1. Go to **Phone Numbers** > **SIP Trunks** tab
2. Click **Add SIP Trunk**
3. Enter a descriptive **Name** (e.g., "Twilio Production")
4. Select **ElevenLabs SIP** as the engine
5. Select your **SIP Provider** from dropdown
   - Default host/port/transport will auto-fill
6. Enter your credentials:
   - **Username** (if required)
   - **Password** (if required)
7. Click **Create Trunk**

### Step 3: Import Phone Numbers

1. In the SIP Trunk details, click **Import Phone Number**
2. Enter the phone number in E.164 format (e.g., `+14155551234`)
3. Add an optional **Label** for easy identification
4. Select an **AI Agent** to handle calls
5. Configure call settings:
   - **Inbound Enabled**: Receive incoming calls
   - **Outbound Enabled**: Allow outbound dialing
6. Click **Import**

**Provisioning:**
- ElevenLabs SIP provisions per phone number during import
- Each number gets a unique ElevenLabs phone number ID
- The system automatically configures SIP trunk settings in ElevenLabs

### Step 4: Configure Inbound Call Routing

1. In your SIP provider dashboard, configure call routing:
   - Set the **Destination** to the ElevenLabs inbound URI
   - Configure your SIP trunk termination settings
2. **ElevenLabs Inbound SIP URI (IMPORTANT):**
   - TCP: `sip.rtc.elevenlabs.io:5060` (transport=tcp)
   - TLS: `sip.rtc.elevenlabs.io:5061` (transport=tls)
   
**For Twilio Elastic SIP Trunking:**
1. Go to your SIP Trunk → Termination
2. Add a Termination URI: `sip:sip.rtc.elevenlabs.io:5060;transport=tcp`
   - Or for TLS: `sip:sip.rtc.elevenlabs.io:5061;transport=tls`
3. Set Priority: 10, Weight: 10
4. Configure authentication if required

**Note:** The old endpoint `sip.elevenlabs.io` is deprecated. Always use `sip.rtc.elevenlabs.io`.

### Step 5: Test Inbound Calls

1. Call one of your imported phone numbers
2. The call routes through your SIP provider
3. Your SIP provider forwards to ElevenLabs
4. ElevenLabs handles the AI conversation
5. Check call logs in AgentHR for status

### Step 6: Make Outbound Calls (Optional)

1. Navigate to an agent or campaign
2. Use the **Make Call** feature
3. Select a phone number with outbound enabled
4. Enter the destination number
5. The AI agent will dial out via your SIP trunk

## Provider-Specific Configuration

### Twilio Elastic SIP Trunking

**Termination (Inbound calls TO ElevenLabs):**
```
SIP URI: sip:sip.rtc.elevenlabs.io:5060;transport=tcp
  - Or TLS: sip:sip.rtc.elevenlabs.io:5061;transport=tls
Authentication: IP ACL or Credential List (configure in Twilio)
Priority: 10
Weight: 10
```

**Origination (Outbound calls FROM ElevenLabs):**
```
Origination SIP URI: sip:+15551234567@your-trunk.sip.twilio.com
Configure: Your Twilio SIP domain to receive calls from ElevenLabs
```

**IMPORTANT:** Use `sip.rtc.elevenlabs.io` (not `sip.elevenlabs.io`).

### Plivo SIP Endpoint

**Outbound Configuration:**
```
Primary SIP Server: sip.plivo.com:5060
Authentication: Digest (Username/Password)
```

### Telnyx SIP Trunk

**Outbound Profile:**
```
IP Authentication: Use Telnyx-provided IPs
Inbound SIP URI: Provided by ElevenLabs
```

## Bulk Outbound Calling (Campaigns)

ElevenLabs SIP supports campaign-based outbound calling:

1. Create a **Campaign** in AgentHR
2. Upload contacts or create a contact list
3. Select an agent with an ElevenLabs SIP phone number
4. Configure campaign settings:
   - Concurrent calls limit
   - Retry settings
   - Timezone scheduling
5. Start the campaign

**Note:** Only ElevenLabs SIP supports outbound batch calling.
OpenAI SIP is incoming-only.

## Troubleshooting

### Phone Number Import Fails

- Verify ElevenLabs API key is configured in admin settings
- Check API key has sufficient permissions
- Ensure phone number format is E.164 (`+` followed by digits)

### Inbound Calls Not Connecting

- Verify SIP trunk credentials are correct
- Check SIP provider firewall/IP allowlist
- Ensure ElevenLabs agent is properly assigned
- Review ElevenLabs dashboard for errors

### Outbound Calls Failing

- Verify phone number has outbound enabled
- Check SIP trunk credentials
- Ensure sufficient credits in ElevenLabs account
- Review call logs for specific error codes

### Audio Quality Issues

- Use TLS transport when available (more reliable)
- Check codec compatibility (G.711 recommended)
- Verify media encryption settings match provider

## Security Best Practices

1. **Use TLS**: Enable TLS transport when your provider supports it
2. **Strong Credentials**: Use complex passwords for SIP authentication
3. **IP Allowlisting**: Restrict SIP traffic to known IPs
4. **Regular Rotation**: Periodically rotate credentials
5. **Monitor Logs**: Review call logs for suspicious activity

## API Reference

### Create SIP Trunk

```typescript
POST /api/sip/trunks
{
  "name": "Production Trunk",
  "engine": "elevenlabs-sip",
  "provider": "twilio",
  "sipHost": "sip.twilio.com",
  "sipPort": 5061,
  "transport": "tls",
  "username": "your-username",
  "password": "your-password"
}
```

### Import Phone Number

```typescript
POST /api/sip/phone-numbers
{
  "sipTrunkId": "trunk-id-here",
  "phoneNumber": "+14155551234",
  "label": "Sales Line",
  "agentId": "agent-id-here"
}
```

## Comparison: ElevenLabs SIP vs OpenAI SIP

| Feature | ElevenLabs SIP | OpenAI SIP |
|---------|---------------|------------|
| Inbound Calls | Yes | Yes |
| Outbound Calls | Yes | No |
| Batch Campaigns | Yes | No |
| Agent Types | Natural, Flow, Incoming | Natural |
| Provisioning | Per phone number | Per trunk |
| Audio Bridge | No | No |
