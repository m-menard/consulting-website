# Team Management Plugin

**Version:** 1.0.0  
**Author:** AgentHR  
**License:** Commercial

## Overview

Complete team management solution with role-based access control for AgentHR. Enables users to create team members with separate login credentials and fine-grained permissions.

## Features

- **Separate Team Member Logins** - Each member has unique email/password
- **Role-Based Access Control** - Owner, Admin, Manager, Viewer + custom roles
- **Hierarchical Permissions** - 10 main sections, 40+ subsections, CRUD controls
- **Admin Oversight** - Platform-wide team management
- **User Team Management** - Self-service team administration
- **Activity Logging** - Complete audit trail
- **Session Management** - Secure token-based authentication

## Installation

This plugin uses the AgentHR auto-discovery system. No manual code changes required.

### 1. Install Database Schema

```bash
psql $DATABASE_URL -f plugins/team-management/migrations/001_team_tables.sql
```

### 2. Build Frontend Bundle

```bash
node scripts/build-plugins.js team-management
```

### 3. Restart Application

The plugin will be auto-discovered and:
- Backend routes are registered automatically
- Frontend UI components are loaded at runtime
- Admin menu items appear automatically
- Settings tabs are injected into the appropriate pages

## Permission Sections

| Section | Subsections |
|---------|-------------|
| Campaigns | View, Create, Edit, Delete, Contacts, Execute |
| Agents | View, Create, Edit, Delete, Flow Builder |
| CRM | View Leads, Edit, Delete, Pipelines |
| Calls | View, Recordings, Transcripts |
| Knowledge Base | View, Add, Edit, Delete |
| Phone Numbers | View, Purchase, Manage |
| Billing | View, Manage, Purchase Credits |
| Analytics | View, Export |
| Settings | View, Edit, Integrations, API Keys |
| Team | View, Invite, Manage, Roles |

## API Quick Reference

```
User Endpoints:
  GET    /api/team              - Get team
  POST   /api/team/members      - Add member
  GET    /api/team/roles        - List roles
  PATCH  /api/team/permissions  - Update permissions

Auth Endpoints:
  POST   /api/team/auth/login   - Member login
  POST   /api/team/auth/logout  - Logout
  GET    /api/team/auth/me      - Current member

Admin Endpoints:
  GET    /api/admin/teams       - List all teams
  GET    /api/admin/teams/stats - Platform stats
```

## Documentation

- [Installation Guide](./INSTALLATION.md) - Complete setup instructions
- [Code Structure](./STRUCTURE.md) - Architecture and code organization
- [API Reference](./docs/API.md) - Full endpoint documentation
- [Permissions Guide](./docs/PERMISSIONS.md) - Permission system details

## Support

For issues or feature requests, contact support@agenthr.io
