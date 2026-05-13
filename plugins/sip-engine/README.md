# SIP Engine Plugin

The SIP Engine Plugin enables customers to use their own SIP trunks with AgentHR, supporting two powerful engine options for AI-powered voice calls.

## Overview

This plugin provides:
- **Bring Your Own Trunk (BYOT)**: Use your existing SIP infrastructure
- **Two Engine Options**: Choose between ElevenLabs native SIP or Fonoster + OpenAI
- **Flow Agent Support**: Visual conversation flows work with both engines
- **Plan-Based Access Control**: Configure which plans have SIP access

---

## Engine Comparison

| Feature | ElevenLabs SIP | Fonoster + OpenAI |
|---------|---------------|-------------------|
| **Architecture** | Native integration (no audio bridge) | Audio bridge with G711↔PCM16 conversion |
| **AI Provider** | ElevenLabs Conversational AI | OpenAI Realtime API (GPT-4o) |
| **Voice Quality** | ElevenLabs voices | OpenAI voices (alloy, echo, shimmer, etc.) |
| **Self-Hosted** | No (uses ElevenLabs cloud) | Yes (Fonoster Community Edition) |
| **Cost** | ElevenLabs subscription | Free (self-hosted Fonoster) + OpenAI API |
| **Call Direction** | Inbound & Outbound | Inbound & Outbound |
| **Flow Agents** | Native workflow compilation | System prompt based |

---

## Admin Configuration

### Step 1: Enable the Plugin

The SIP Engine Plugin is automatically discovered. To verify it's enabled:

1. Go to **Admin Dashboard**
2. Navigate to **Settings > Plugins** (or check `/api/admin/plugins`)
3. Ensure "sip-engine" is listed and enabled

### Step 2: Configure Plan Access

1. Go to **Admin Dashboard > Settings > SIP** (appears in the Voice AI section)
2. Click the **"Plan Settings"** tab
3. For each plan you want to enable SIP:
   - Toggle **"Enable SIP Access"** on
   - Set **"Max Concurrent SIP Calls"** (default: 5)
   - Select **"Allowed Engines"**:
     - ElevenLabs SIP
     - Fonoster + OpenAI
     - Or both
4. Click **Save**

### Step 3: Add Fonoster Credentials (For Fonoster + OpenAI Engine)

If using the Fonoster + OpenAI engine, you need to connect to your self-hosted Fonoster Community Edition server:

1. Go to **Admin Dashboard > Settings > SIP**
2. Click the **"Fonoster Credentials"** tab
3. Click **"Add Credential"**
4. Fill in the credential details (see [Fonoster CE Setup](#fonoster-community-edition-setup))
5. Mark one credential as **Primary** if you have multiple
6. Click **Test Connection** to verify

---

## User Configuration

### Step 1: Create a SIP Trunk

1. Go to **Phone Numbers > SIP Trunks** tab
2. Click **"Add SIP Trunk"**
3. Configure your trunk:
   - **Name**: A friendly name for your trunk
   - **Engine**: Choose "ElevenLabs SIP" or "Fonoster + OpenAI"
   - **SIP Host**: Your SIP provider's hostname (e.g., `sip.provider.com`)
   - **SIP Port**: Usually 5060 (UDP/TCP) or 5061 (TLS)
   - **Transport**: TLS (recommended), TCP, or UDP
   - **Username/Password**: SIP authentication credentials
4. Click **Create**

### Step 2: Import Phone Numbers

1. Go to **Phone Numbers > SIP Trunks** tab
2. Click the **"Phone Numbers"** sub-tab
3. Click **"Import Number"**
4. Select your SIP trunk
5. Enter the phone number (E.164 format: +1234567890)
6. Add a label (optional)
7. Click **Import**

### Step 3: Assign Agents

1. Find your imported phone number in the list
2. Click **"Assign Agent"**
3. Select an agent (must be an "Incoming" type agent)
4. The number is now ready to receive calls routed to your AI agent

---

## Fonoster Community Edition Setup

Fonoster CE is **free and open-source**. You self-host it on your own infrastructure.

> **Detailed Setup Guide**: For comprehensive step-by-step instructions, see [docs/FONOSTER_ADMIN_SETUP.md](docs/FONOSTER_ADMIN_SETUP.md)

### Quick Start (Docker)

```bash
# Clone Fonoster
git clone https://github.com/fonoster/fonoster.git
cd fonoster

# Configure your server IP
echo "DOCKER_HOST_ADDRESS=your.server.ip" >> .env
echo "EXTERNAL_MEDIA_HOST=your.server.ip" >> .env

# Start with Docker Compose
docker-compose up -d
```

### Generate API Credentials

```bash
# Install Fonoster CLI
npm install -g @fonoster/ctl

# Login to your Fonoster server
fonoster login --endpoint your.server.ip:50051

# Generate API credentials
fonoster auth:create --name "AgentHR Integration"
```

Save the output values:
- **Access Key ID**: `PJ-xxxxxxxx-...`
- **API Key**: `ak_xxxxxxxx...`
- **API Secret**: `as_xxxxxxxx...`

Enter these in **Admin Dashboard > Settings > SIP > Fonoster Credentials**.

### Configure Inbound Webhooks

For inbound calls, create a Fonoster application pointing to AgentHR:

```bash
fonoster apps:create \
  --name "AgentHR Inbound" \
  --type external \
  --answerUrl "https://your-agenthr-domain/api/fonoster-openai/voice/answer" \
  --statusCallbackUrl "https://your-agenthr-domain/api/fonoster-openai/voice/status"
```

### Required Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 50051 | TCP | Fonoster gRPC API |
| 5060 | UDP/TCP | SIP signaling |
| 5061 | TCP | SIP TLS (encrypted) |
| 10000-20000 | UDP | RTP media (voice)

---

## Testing

### Mock Mode (Development)

For testing without real SIP providers, set the environment variable:

```bash
SIP_MOCK_MODE=true
```

This enables:
- Simulated trunk connections
- Mock call creation
- Testing webhooks and API endpoints

### What You Can Test in Development

1. **CRUD Operations**: Create, read, update, delete SIP trunks and phone numbers
2. **Plan Access Control**: Verify users can only access features their plan allows
3. **UI Functionality**: All admin and user interfaces
4. **API Endpoints**: REST API responses and validation

### Production Testing Requirements

For actual SIP calls, you need:
1. **SIP Trunk Provider**: Telnyx, Twilio SIP Trunking, VoIP.ms, or similar
2. **Public Webhook URLs**: HTTPS endpoints that can receive call events
3. **ElevenLabs Account**: With SIP trunking enabled (for ElevenLabs engine)
4. **OpenAI API Key**: With Realtime API access (for Fonoster engine)
5. **Fonoster Server**: Self-hosted with public accessibility (for Fonoster engine)

---

## API Endpoints

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sip/trunks` | List user's SIP trunks |
| POST | `/api/sip/trunks` | Create a new trunk |
| DELETE | `/api/sip/trunks/:id` | Delete a trunk |
| POST | `/api/sip/trunks/:id/test` | Test trunk connection |
| GET | `/api/sip/phone-numbers` | List user's SIP phone numbers |
| POST | `/api/sip/phone-numbers` | Import a phone number |
| DELETE | `/api/sip/phone-numbers/:id` | Delete a phone number |
| POST | `/api/sip/phone-numbers/:id/assign-agent` | Assign agent to number |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/sip/stats` | SIP usage statistics |
| GET | `/api/admin/sip/credentials` | List Fonoster credentials |
| POST | `/api/admin/sip/credentials` | Add Fonoster credential |
| DELETE | `/api/admin/sip/credentials/:id` | Delete credential |
| POST | `/api/admin/sip/credentials/:id/test` | Test credential |
| GET | `/api/admin/sip/trunks` | List all user trunks |
| GET | `/api/admin/sip/phone-numbers` | List all phone numbers |
| GET | `/api/admin/sip/plans/:planId/sip-settings` | Get plan SIP settings |
| PUT | `/api/admin/sip/plans/:planId/sip-settings` | Update plan SIP settings |

### Webhook Endpoints (Fonoster)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fonoster-openai/voice/answer` | Handle incoming calls |
| POST | `/api/fonoster-openai/voice/status` | Call status updates |
| POST | `/api/fonoster-openai/voice/dtmf` | DTMF keypad input |
| GET | `/api/fonoster-openai/health` | Health check |
| WS | `/api/fonoster-openai/stream/:callId` | Bidirectional audio stream |

---

## Troubleshooting

### "SIP Engine Not Available" Message

**Cause**: The SIP Engine Plugin is not installed or enabled.

**Solution**:
1. Check that the plugin directory exists: `plugins/sip-engine/`
2. Verify the plugin manifest: `plugins/sip-engine/manifest.json`
3. Check server logs for plugin loading errors
4. Restart the application

### Trunk Connection Test Fails

**Cause**: Cannot reach SIP server or authentication failed.

**Solutions**:
1. Verify SIP host and port are correct
2. Check username/password credentials
3. Ensure your server can reach the SIP provider (firewall rules)
4. Try different transport (TLS vs UDP)

### Fonoster Credential Test Fails

**Cause**: Cannot connect to Fonoster CE server.

**Solutions**:
1. Verify Fonoster CE is running: `docker ps` or check pod status
2. Confirm gRPC endpoint is correct (usually `hostname:50051`)
3. Check Access Key ID, API Key, and API Secret are correct
4. Ensure no firewall blocking port 50051

### No Audio on Calls

**Cause**: RTP media ports blocked or codec mismatch.

**Solutions**:
1. Open UDP ports 10000-20000 for RTP
2. Ensure NAT traversal is configured on your SIP provider
3. Check codec compatibility (G.711 ulaw/alaw recommended)

---

## Architecture

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
│  │  │  ElevenLabs SIP     │  │  Fonoster + OpenAI      ││       │
│  │  │  ─────────────────  │  │  ───────────────────────││       │
│  │  │  Native integration │  │  Audio bridge           ││       │
│  │  │  No media bridge    │  │  G711 ↔ PCM16          ││       │
│  │  │  Full inbound/      │  │  Full inbound/          ││       │
│  │  │  outbound           │  │  outbound + Self-hosted ││       │
│  │  └──────────┬──────────┘  └──────────┬──────────────┘│       │
│  │             │                        │               │       │
│  └─────────────┼────────────────────────┼───────────────┘       │
│                │                        │                        │
└────────────────┼────────────────────────┼────────────────────────┘
                 │                        │
                 ▼                        ▼
    ┌────────────────────┐    ┌──────────────────────────┐
    │   ElevenLabs API   │    │   Fonoster CE Server     │
    │   (Cloud)          │    │   (Self-Hosted)          │
    └────────────────────┘    └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │   OpenAI Realtime API    │
                              │   (GPT-4o Voice)         │
                              └──────────────────────────┘
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SIP_MOCK_MODE` | Enable mock mode for testing | `false` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Required for ElevenLabs engine |
| `OPENAI_API_KEY` | OpenAI API key | Required for Fonoster engine |

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Contact your administrator

---

## License

This plugin is part of AgentHR and follows the same licensing terms.
