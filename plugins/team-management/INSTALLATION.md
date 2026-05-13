# Team Management Plugin - Installation Guide

Enables team collaboration with separate member logins and role-based permissions.

## Quick Installation

1. **Copy to plugins folder** (already done if you see this file)

2. **Run the database migration:**
   ```bash
   psql $DATABASE_URL -f plugins/team-management/migrations/001_team_tables.sql
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
   psql $DATABASE_URL -f plugins/team-management/migrations/001_team_tables.sql
   ```

3. **Plugin not loading:**
   Check server logs at startup for errors like:
   - `[Plugin Loader] Failed to load plugin 'team-management'`
   - Look for the specific error message

4. **Missing compiled files:**
   The plugin needs compiled `.js` files. Check these exist:
   - `plugins/team-management/index.js`
   - `plugins/team-management/routes/*.js`
   - `plugins/team-management/services/*.js`
   
   If missing, contact support for the compiled package.

5. **Frontend bundle not loading:**
   Check that `plugins/team-management/dist/bundle.js` exists.
   If missing, run: `node scripts/build-plugins.js team-management`

### Common Errors

**"Cannot find module '../../../server/db.js'"**
- The plugin folder must be at `<project-root>/plugins/team-management/`
- Do NOT place it in a nested folder

**"relation 'teams' does not exist"**
- Database migration not run. Execute step 2 above.

**"Plugin is disabled"**
- Check if there's a `plugin_team-management_enabled` setting in `global_settings` table set to false
- By default, plugins are enabled if no setting exists

## Features

- Separate team member logins with email/password
- Role-based access control (Owner, Admin, Manager, Viewer)
- Granular CRUD permissions per section
- Admin oversight of all platform teams

## Usage

**Users:** Settings > Team > Add Team Member

**Team Members:** Login at `/team-login`

**Admins:** Admin Panel > Team Management

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/team` | User team management |
| `/api/team/members` | Team member CRUD |
| `/api/team/roles` | Role management |
| `/api/team/auth/*` | Team member authentication |
| `/api/admin/teams` | Admin team oversight |
| `/api/admin/team` | Admin sub-admin management |

## Default Roles

| Role | Access |
|------|--------|
| Owner | Full access |
| Admin | Manage team and features |
| Manager | Campaigns, agents, CRM |
| Viewer | Read-only |

## Required Database Tables

The plugin creates these tables:
- `teams`
- `team_roles`
- `team_members`
- `team_permissions`
- `team_member_sessions`
- `team_activity_logs`
- `admin_teams`
- `admin_team_roles`
- `admin_team_members`
- `admin_team_permissions`
- `admin_team_sessions`
- `admin_team_activity_logs`

## Support

If you continue to have issues:
1. Check `/api/plugins/health` for specific errors
2. Check server startup logs
3. Ensure all files are present in the plugin folder
4. Contact support with the health check output and server logs
