# SIP Engine Plugin Documentation

## Overview

The SIP Engine Plugin v2.0 enables AgentHR to connect with customer-owned SIP trunks
for AI-powered phone calls. It supports two engines with different capabilities:

| Engine | Direction | Use Case |
|--------|-----------|----------|
| **ElevenLabs SIP** | Inbound + Outbound | Full-featured calling with campaigns |
| **OpenAI SIP** | Incoming only | Native OpenAI Realtime integration |

## Documentation Index

### Setup Guides

- **[ElevenLabs SIP Setup](./ELEVENLABS-SIP-SETUP.md)** - Complete guide for configuring ElevenLabs SIP engine
- **[OpenAI SIP Setup](./OPENAI-SIP-SETUP.md)** - Complete guide for configuring OpenAI SIP engine

### Quick Start

1. **Admin Configuration**
   - Enable SIP Engine plugin in Admin Panel
   - Configure plan-level SIP access
   - Set up engine-specific settings

2. **User Setup**
   - Create SIP trunk with provider credentials
   - Import phone numbers
   - Assign AI agents to numbers

3. **Testing**
   - Make test inbound call
   - Verify agent responds correctly
   - Check call logs for details

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              SIP Provider                    │
                    │  (Twilio, Plivo, Telnyx, etc.)              │
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────┴───────────────────────────┐
                    │                                              │
          ┌─────────▼─────────┐                      ┌─────────────▼───────────┐
          │   ElevenLabs SIP   │                      │      OpenAI SIP         │
          │                    │                      │                         │
          │ Provisions per     │                      │ Provisions per trunk    │
          │ phone number       │                      │ (admin Project ID)      │
          │                    │                      │                         │
          │ Inbound + Outbound │                      │ Incoming only           │
          └─────────┬──────────┘                      └───────────┬─────────────┘
                    │                                              │
                    └──────────────────┬───────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │               AgentHR                      │
                    │                                              │
                    │  - Call routing & management                 │
                    │  - Agent assignment                          │
                    │  - Campaign execution                        │
                    │  - Call logging & analytics                  │
                    └──────────────────────────────────────────────┘
```

## Supported Providers

Both engines support the following SIP providers with auto-fill defaults:

1. **Twilio** - Elastic SIP Trunking
2. **Plivo** - SIP Endpoint
3. **Telnyx** - SIP Trunk
4. **Vonage** - Voice API
5. **Exotel** - Cloud Telephony
6. **Bandwidth** - Enterprise Voice
7. **DIDWW** - Global DIDs
8. **Zadarma** - Cloud PBX
9. **Cloudonix** - CPaaS
10. **RingCentral** - Unified Communications
11. **Sinch** - Voice Platform
12. **Infobip** - Omnichannel
13. **Generic** - Any SIP-compatible provider

## Plan Access Control

SIP features are controlled per subscription plan:

| Setting | Description |
|---------|-------------|
| `sipEnabled` | Whether plan has SIP access |
| `maxConcurrentSipCalls` | Limit of simultaneous calls |
| `sipEnginesAllowed` | Which engines (elevenlabs-sip, openai-sip) |

Admins configure these in **Admin Panel** > **Plugins** > **SIP Engine** > **Plan Settings**

## Security

- SIP credentials are encrypted at rest
- Webhook secrets verify incoming requests
- TLS transport recommended for all connections
- IP allowlisting supported at provider level

## Troubleshooting

See individual setup guides for engine-specific troubleshooting:

- [ElevenLabs SIP Troubleshooting](./ELEVENLABS-SIP-SETUP.md#troubleshooting)
- [OpenAI SIP Troubleshooting](./OPENAI-SIP-SETUP.md#troubleshooting)

## Version History

### v2.0.0
- Added OpenAI SIP engine (incoming only)
- Added 13 pre-configured SIP providers
- Added plan-based access control
- Separated from Fonoster (now separate plugin)

### v1.0.0
- Initial release with ElevenLabs SIP engine
