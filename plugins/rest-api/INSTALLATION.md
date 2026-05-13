# REST API Plugin - Installation Guide

Provides programmatic API access with key authentication.

## Quick Installation

1. **Copy to plugins folder** (already done if you see this file)

2. **Run the database migration:**
   ```bash
   psql $DATABASE_URL -f plugins/rest-api/migrations/001_api_tables.sql
   ```
   
   Or use the batch migration script:
   ```bash
   bash scripts/run-plugin-migrations.sh
   ```

3. **Restart the application** - the plugin auto-loads on startup

4. **Verify installation:**
   - Visit `/api/plugins/health` to check plugin status
   - All tables should show as "ok"

## Troubleshooting

### Plugin Not Working

1. **Check health endpoint first:**
   ```
   GET /api/plugins/health
   ```
   This shows exactly what's missing.

2. **Missing database tables:**
   If health check shows missing tables, run the migration:
   ```bash
   psql $DATABASE_URL -f plugins/rest-api/migrations/001_api_tables.sql
   ```

3. **Plugin not loading:**
   Check server logs at startup for errors like:
   - `[Plugin Loader] Failed to load plugin 'rest-api'`
   - Look for the specific error message

4. **Missing compiled files:**
   The plugin needs compiled `.js` files. Check these exist:
   - `plugins/rest-api/index.js`
   - `plugins/rest-api/routes/*.js`
   - `plugins/rest-api/services/*.js`
   - `plugins/rest-api/middleware/*.js`

### Common Errors

**"Cannot find module '../../../server/db.js'"**
- The plugin folder must be at `<project-root>/plugins/rest-api/`
- Do NOT place it in a nested folder

**"relation 'api_keys' does not exist"**
- Database migration not run. Execute step 2 above.

**"Plugin is disabled"**
- By default, plugins are enabled if no setting exists
- Check `global_settings` table for `plugin_rest-api_enabled` if explicitly disabled

## Features

- API key authentication with scopes
- Rate limiting per key
- Audit logging
- Interactive API docs

## Usage

**Users:** Settings > Developer Access > Create API Key

**API Docs:** Visit `/api/docs`

**API Playground:** Visit `/api/docs/playground`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/v1/calls` | Call management |
| `/api/v1/campaigns` | Campaign management |
| `/api/v1/agents` | Agent management |
| `/api/v1/contacts` | Contact management |
| `/api/v1/credits` | Credit balance |
| `/api/v1/webhooks` | Webhook management |
| `/api/v1/analytics` | Analytics data |

## Authentication

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/v1/credits/balance
```

## Permission Scopes

- `calls:read` / `calls:write`
- `campaigns:read` / `campaigns:write`
- `agents:read` / `agents:write`
- `contacts:read` / `contacts:write`
- `credits:read`
- `webhooks:read` / `webhooks:write`
- `analytics:read`
- `admin` (full access)

## Required Database Tables

The plugin creates these tables:
- `api_keys`
- `api_audit_logs`
- `api_rate_limits`

## Support

If you continue to have issues:
1. Check `/api/plugins/health` for specific errors
2. Check server startup logs
3. Ensure all files are present in the plugin folder
4. Contact support with the health check output and server logs
