# SIP Engine Plugin Changelog

All notable changes to the SIP Engine Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2024-12-29

### Added
- **Conditional UI**: SIP Engine tab only appears when plugin is installed AND user's plan allows access
- **Dynamic Loading**: Plugin now loads dynamically with adapter pattern
- **Build Script**: Dedicated `build-sip-engine-plugin.sh` for independent builds
- **Plan-based Access**: SIP features now respect subscription plan capabilities

### Changed
- Enhanced plugin registration with cleanup handlers
- Improved UI visibility based on plugin and plan status

### Fixed
- Plugin UI elements no longer appear when plugin is not installed
- SIP settings tab properly hidden for users without SIP access in their plan

---

## [2.0.0] - 2024-12-15

### Added

**Multi-Engine Support**
- ElevenLabs SIP Engine (full inbound/outbound)
- OpenAI SIP Engine (incoming only)
- Engine selection per phone number

**SIP Provider Support**
- 13 SIP providers supported:
  - Twilio SIP
  - Vonage (Nexmo)
  - Plivo SIP
  - Telnyx
  - Bandwidth
  - SignalWire
  - Voxbone
  - Flowroute
  - VoIP.ms
  - Callcentric
  - Anveo Direct
  - Asterisk/FreePBX
  - Generic SIP

**Phone Number Import**
- Import existing phone numbers from SIP providers
- Bulk import via CSV
- Number validation and verification
- Automatic carrier detection

**Inbound Call Handling**
- SIP URI generation for inbound routing
- Call queue management
- Overflow handling
- Business hours routing

**Outbound Calling**
- Custom caller ID support
- SIP trunk selection
- Call quality monitoring
- Failover routing

### Changed
- Complete architecture rewrite for multi-engine support
- Improved SIP credential management
- Enhanced call routing logic

---

## [1.0.0] - 2024-11-28

### Initial Release

#### Added

**SIP Trunk Integration**
- Connect your own SIP trunks to AgentHR
- SIP credential management
- Trunk health monitoring

**ElevenLabs SIP**
- Full integration with ElevenLabs SIP endpoints
- Bidirectional audio streaming
- Real-time transcription

**Phone Number Management**
- Import phone numbers from SIP providers
- Number assignment to agents
- Caller ID configuration

**Admin Configuration**
- SIP engine settings in Admin Panel
- Per-user SIP access control
- Usage monitoring

---

## Installation

1. Copy plugin files to `plugins/sip-engine/`
2. Enable plugin via Admin Panel > Plugins
3. Run database migrations for SIP tables
4. Configure SIP provider credentials

## Building

```bash
# Build plugin independently
./scripts/build-sip-engine-plugin.sh

# Output: plugins/sip-engine/dist/
```

## Supported SIP Providers

| Provider | Inbound | Outbound | Notes |
|----------|---------|----------|-------|
| Twilio SIP | Yes | Yes | Full support |
| Vonage | Yes | Yes | Full support |
| Plivo | Yes | Yes | Full support |
| Telnyx | Yes | Yes | Full support |
| Bandwidth | Yes | Yes | Full support |
| SignalWire | Yes | Yes | Full support |
| VoIP.ms | Yes | Yes | Community tested |
| Generic SIP | Yes | Yes | Manual config |

## Plan Requirements

SIP Engine access is controlled by subscription plans:
- Plan must have `sipEnabled: true`
- Plan specifies allowed engines (`sipEnginesAllowed`)
- Plan sets concurrent call limit (`maxConcurrentSipCalls`)

---

## Database Tables

The plugin creates the following tables:
- `sip_providers` - SIP provider configurations
- `sip_phone_numbers` - Imported phone numbers
- `sip_calls` - SIP call records
- `sip_credentials` - Encrypted SIP credentials

---

## Support

For plugin-specific support:
- See `SIP-ENGINE-PLUGIN.md` for detailed documentation
- Contact via CodeCanyon
