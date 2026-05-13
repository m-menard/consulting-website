# SIP Engine Plugin

Enables AI-powered voice calls using your own SIP trunks.

## Installation

1. **Copy to plugins folder** (already done if you see this file)
2. **Run migration:**
   ```bash
   psql $DATABASE_URL -f plugins/sip-engine/migrations/001_sip_tables.sql
   ```
3. **Restart the application** - the plugin auto-loads

## Supported Engines

| Engine | Features |
|--------|----------|
| ElevenLabs SIP | Native inbound + outbound |
| OpenAI SIP | Inbound with OpenAI Realtime |

## Usage

**Users:** Settings > SIP Trunks > Add SIP Trunk

**Admins:** Admin Panel > Settings > SIP

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/sip/trunks` | User trunk management |
| `/api/sip/phone-numbers` | SIP phone numbers |
| `/api/admin/sip` | Admin SIP settings |
| `/api/openai-sip/*` | OpenAI SIP webhooks |

## Configuration

Enable SIP per plan in Admin > Plans > Edit Plan > SIP Settings
