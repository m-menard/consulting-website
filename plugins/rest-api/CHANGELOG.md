# REST API Plugin Changelog

All notable changes to the REST API Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2024-12-29

### Added
- **Dynamic Loading**: Plugin now loads dynamically with proper cleanup on uninstall
- **Conditional UI**: Developer tab and API Keys tab only appear when plugin is installed
- **Build Script**: Dedicated `build-rest-api-plugin.sh` for independent plugin builds
- **ESM/CJS Compatibility**: Module resolution works in both development and production

### Changed
- Improved plugin registration with cleanup handlers
- Enhanced API documentation UI with dark mode support
- Better error handling for API key validation

### Fixed
- Plugin UI elements no longer appear when plugin is not installed
- API docs route properly cleaned up on plugin uninstall

---

## [1.0.0] - 2024-11-28

### Initial Release

#### Added

**API Key Management**
- Secure API key generation with customizable prefixes
- Key scoping (read, write, admin levels)
- Key expiration with automatic cleanup
- Usage tracking and rate limiting per key
- Key rotation support

**REST Endpoints**

*Calls API*
- `POST /api/v1/calls` - Initiate outbound calls
- `GET /api/v1/calls` - List calls with filtering
- `GET /api/v1/calls/:id` - Get call details
- `POST /api/v1/calls/:id/hangup` - Terminate active call

*Campaigns API*
- `POST /api/v1/campaigns` - Create campaigns
- `GET /api/v1/campaigns` - List campaigns
- `GET /api/v1/campaigns/:id` - Get campaign details
- `PATCH /api/v1/campaigns/:id` - Update campaign
- `POST /api/v1/campaigns/:id/start` - Start campaign
- `POST /api/v1/campaigns/:id/pause` - Pause campaign
- `POST /api/v1/campaigns/:id/resume` - Resume campaign

*Agents API*
- `GET /api/v1/agents` - List agents
- `GET /api/v1/agents/:id` - Get agent details

*Contacts API*
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts` - List contacts
- `PATCH /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact
- `POST /api/v1/contacts/bulk` - Bulk import contacts

*Credits API*
- `GET /api/v1/credits` - Get credit balance
- `GET /api/v1/credits/history` - Credit transaction history

*Analytics API*
- `GET /api/v1/analytics/overview` - Platform overview stats
- `GET /api/v1/analytics/campaigns/:id` - Campaign-specific analytics

*Webhooks API*
- `POST /api/v1/webhooks` - Create webhook subscription
- `GET /api/v1/webhooks` - List webhooks
- `DELETE /api/v1/webhooks/:id` - Delete webhook

**API Documentation**
- OpenAPI 3.0 specification
- Interactive Swagger UI at `/api/v1/docs`
- Redoc documentation with Stripe-like design
- Dark/light mode toggle
- Code examples in multiple languages

**Security**
- API key authentication via `Authorization: Bearer` or `X-API-Key` header
- Request signing with HMAC-SHA256
- Rate limiting per API key
- Audit logging for all API requests
- IP allowlisting support

**Admin Features**
- View all API keys across users
- Revoke any API key
- API usage analytics
- Rate limit configuration

---

## Installation

1. Copy plugin files to `plugins/rest-api/`
2. Enable plugin via Admin Panel > Plugins
3. Run database migrations if needed
4. Plugin auto-registers on server restart

## Building

```bash
# Build plugin independently
./scripts/build-rest-api-plugin.sh

# Output: plugins/rest-api/dist/
```

## API Authentication

```bash
# Using Authorization header
curl -H "Authorization: Bearer ak_live_xxxxx" https://your-domain.com/api/v1/calls

# Using X-API-Key header
curl -H "X-API-Key: ak_live_xxxxx" https://your-domain.com/api/v1/calls
```

---

## Support

For plugin-specific support:
- See `REST-API-PLUGIN.md` for detailed documentation
- Contact via CodeCanyon
