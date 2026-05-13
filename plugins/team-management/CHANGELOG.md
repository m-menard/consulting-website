# Team Management Plugin Changelog

All notable changes to the Team Management Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2024-12-29

### Added
- **Dynamic Loading**: Plugin now loads dynamically with adapter pattern
- **Module Resolution**: `resolveModulePath()` handles both `.ts` (dev) and `.js` (production)
- **Build Script**: Dedicated `build-team-management-plugin.sh` for independent builds

### Changed
- Improved adapter pattern for better production compatibility
- Enhanced error handling during plugin initialization

### Fixed
- Module resolution now works correctly in both development and production environments
- Adapter handles missing module files gracefully

---

## [1.0.0] - 2024-11-28

### Initial Release

#### Added

**Team Member Management**
- Create team members with separate login credentials
- Assign roles to team members
- Enable/disable team member access
- Team member activity logging

**Role System**
- Pre-defined roles: Viewer, Operator, Manager, Admin
- Custom role creation
- Role hierarchy with inheritance
- Role-based navigation visibility

**Permission System**
- Section-wise CRUD permissions
- Granular access control per feature:
  - Agents (view, create, edit, delete)
  - Campaigns (view, create, edit, delete, execute)
  - Contacts (view, create, edit, delete, import)
  - Phone Numbers (view, purchase, release)
  - Analytics (view, export)
  - Knowledge Base (view, create, edit, delete)
  - Webhooks (view, create, edit, delete)
  - Settings (view, edit)
- Permission inheritance from parent roles

**Hierarchical Access Control**
- Team members can only manage users below their role level
- Admins can manage all team members
- Operators have limited management capabilities
- Viewers have read-only access

**UI Components**
- Team management dashboard
- Role assignment interface
- Permission matrix editor
- Team member invitation system
- Activity log viewer

**Security**
- Team member sessions isolated from main account
- Audit trail for all team actions
- Permission checks on all API endpoints
- Role validation on protected routes

---

## Installation

1. Copy plugin files to `plugins/team-management/`
2. Enable plugin via Admin Panel > Plugins
3. Run database migrations for team tables
4. Configure default roles in Admin Panel

## Building

```bash
# Build plugin independently
./scripts/build-team-management-plugin.sh

# Output: plugins/team-management/dist/
```

## Default Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| Viewer | Read-only access | View all sections |
| Operator | Basic operations | View + Create + Edit |
| Manager | Team management | All except Settings |
| Admin | Full access | All permissions |

---

## Database Tables

The plugin creates the following tables:
- `team_members` - Team member accounts
- `team_roles` - Role definitions
- `team_permissions` - Permission assignments
- `team_activity_logs` - Activity audit trail

---

## Support

For plugin-specific support:
- See `TEAM-MANAGEMENT-PLUGIN.md` for detailed documentation
- Contact via CodeCanyon
