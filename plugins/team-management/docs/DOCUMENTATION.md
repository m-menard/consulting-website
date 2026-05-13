# Team Management Plugin - Complete Documentation

**Version:** 1.0.0  
**Author:** AgentHR  
**License:** Commercial  
**Compatibility:** AgentHR >= 1.0.0, Node.js >= 18.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Architecture](#architecture)
5. [Authentication Flow](#authentication-flow)
6. [Role-Based Access Control](#role-based-access-control)
7. [Permission Matrix](#permission-matrix)
8. [API Reference](#api-reference)
9. [Frontend Integration](#frontend-integration)
10. [Configuration](#configuration)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)
13. [Changelog](#changelog)

---

## Overview

The Team Management Plugin provides a comprehensive **dual-team system** for the AgentHR platform, enabling both user-level team collaboration and admin-level platform management through sub-admins.

### Dual-Team System

The plugin implements two distinct team types:

#### 1. User Teams
Each platform user can create and manage their own team of members who can access their account with separate credentials. This enables:
- Business owners to grant access to employees
- Agencies to manage client campaigns with team members
- Organizations to implement role-based access within their account

#### 2. Admin Teams (Sub-Admin System)
Platform super administrators can create sub-admin team members who help manage the platform itself. This enables:
- Delegated platform administration
- Support staff with limited admin access
- Department-based admin responsibilities

### Key Benefits

- **Separate Authentication**: Each team member has their own email/password credentials
- **Granular Permissions**: Section-wise CRUD permissions for fine-grained access control
- **Custom Roles**: Create custom roles beyond the default templates
- **Activity Auditing**: Complete audit trail of team actions
- **Session Management**: 64-character cryptographic session tokens (not JWT)

---

## Features

The Team Management Plugin includes the following features:

| Feature | Description |
|---------|-------------|
| Separate Team Member Logins | Each member has unique email/password credentials |
| Email + Password Authentication | Secure authentication with bcrypt password hashing |
| Role-Based Access Control | Assign roles to control feature access |
| Hierarchical Permission System | Sections with subsections for organized permissions |
| Section-wise CRUD Permissions | Create, Read, Update, Delete controls per feature |
| Custom Role Creation | Define custom roles beyond defaults |
| Default Role Templates | Pre-configured Owner, Admin, Manager, Viewer roles |
| Team Member Invitation | Invite new members via email |
| Password Reset | Secure password reset functionality |
| Activity Audit Logs | Complete audit trail of team actions |
| Admin Team Oversight | Platform-wide team monitoring for admins |
| User Team Management UI | React components for team management |

---

## Installation

### Prerequisites

- AgentHR v1.0.0 or higher
- Node.js 18.x or higher
- PostgreSQL 14+

### Step 1: Run Database Migration

Execute the SQL migration to create the required database tables:

```bash
psql $DATABASE_URL -f plugins/team-management/migrations/001_team_tables.sql
```

Or if using Drizzle migrations:
```bash
npm run db:push
```

This creates the following tables:
- `teams` - One team per user account
- `team_members` - Team members with separate authentication
- `team_roles` - Role definitions per team
- `team_permissions` - Section-wise CRUD permissions per role
- `team_member_sessions` - Active session tokens
- `team_activity_logs` - Audit trail

### Step 2: Register Plugin Routes

Add the following to your `server/routes.ts`:

```typescript
import { registerTeamManagementRoutes } from '../plugins/team-management';

// After setting up auth middleware
registerTeamManagementRoutes(app, {
  sessionAuthMiddleware: requireAuth,
  adminAuthMiddleware: requireAdmin,
});
```

### Step 3: Configure Environment Variables (Optional)

```bash
# Custom session secret for team member tokens (recommended for production)
TEAM_SESSION_SECRET=your_secure_random_secret_key

# Session expiry in hours (default: 24)
TEAM_SESSION_EXPIRY=24

# Admin team session expiry (default: 24)
ADMIN_TEAM_SESSION_EXPIRY=24
```

### Step 4: Add Frontend Components

Import and use the plugin's React components:

**Admin Dashboard** - Add to admin sidebar:
```tsx
import AdminTeamManagementPage from '@/plugins/team-management/ui/AdminTeamManagementPage';

// In your admin routes
<Route path="/admin/team-management" component={AdminTeamManagementPage} />
```

**User Settings** - Add to account settings tabs:
```tsx
import UserTeamSettingsTab from '@/plugins/team-management/ui/UserTeamSettingsTab';

// In your settings tabs
<TabsContent value="team">
  <UserTeamSettingsTab />
</TabsContent>
```

### Step 5: Add Login Pages

Create dedicated login pages for team members:

**User Team Login** (`/team/login`):
```tsx
import TeamMemberLogin from '@/pages/TeamMemberLogin';

<Route path="/team/login" component={TeamMemberLogin} />
```

**Admin Team Login** (`/admin-team/login`):
```tsx
import AdminTeamLogin from '@/pages/AdminTeamLogin';

<Route path="/admin-team/login" component={AdminTeamLogin} />
```

---

## Architecture

### Directory Structure

```
plugins/team-management/
├── index.ts                    # Plugin entry point & route registration
├── types.ts                    # TypeScript type definitions
├── plugin.json                 # Plugin metadata & configuration
├── INSTALLATION.md             # Installation guide
├── STRUCTURE.md                # Code architecture documentation
├── README.md                   # Quick reference
│
├── migrations/
│   └── 001_team_tables.sql     # Database schema
│
├── middleware/
│   └── team-auth.middleware.ts # Authentication & permission middleware
│
├── routes/
│   ├── user-team.routes.ts     # User team CRUD endpoints
│   ├── user-members.routes.ts  # Team member management
│   ├── user-roles.routes.ts    # Role management
│   ├── user-permissions.routes.ts # Permission configuration
│   ├── team-auth.routes.ts     # User team member authentication
│   ├── admin-team-auth.routes.ts # Admin sub-admin authentication
│   ├── admin-team.routes.ts    # Admin's own team management
│   └── admin-teams.routes.ts   # Admin oversight of all teams
│
├── services/
│   ├── team.service.ts         # Core team business logic
│   ├── team-auth.service.ts    # User team authentication & sessions
│   ├── admin-team.service.ts   # Admin team management
│   └── team-permission.service.ts # Permission checking
│
├── docs/
│   └── DOCUMENTATION.md        # This file
│
└── ui/                         # React components
    ├── AdminTeamManagementPage.tsx
    ├── UserTeamSettingsTab.tsx
    ├── TeamMemberList.tsx
    ├── RoleEditor.tsx
    └── PermissionMatrix.tsx
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │ Admin Team Page  │    │ User Team Settings Tab       │   │
│  └────────┬─────────┘    └──────────────┬───────────────┘   │
└───────────┼─────────────────────────────┼───────────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────────────────────────────────────────┐
│                      API Routes                            │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │ /api/admin/teams│  │ /api/team/*    │  │ /api/team/ │  │
│  │ (admin auth)    │  │ (user auth)    │  │ auth/*     │  │
│  └────────┬────────┘  └───────┬────────┘  └─────┬──────┘  │
└───────────┼───────────────────┼─────────────────┼─────────┘
            │                   │                 │
            ▼                   ▼                 ▼
┌───────────────────────────────────────────────────────────┐
│                       Services                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ AdminTeam      │  │TeamPermission    │  │TeamAuth   │  │
│  │ Service        │  │Service           │  │Service    │  │
│  └────────┬───────┘  └────────┬─────────┘  └─────┬─────┘  │
└───────────┼───────────────────┼──────────────────┼────────┘
            │                   │                  │
            ▼                   ▼                  ▼
┌───────────────────────────────────────────────────────────┐
│                      Database                              │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │  teams   │ │team_members│ │ team_roles │ │team_perms│  │
│  └──────────┘ └────────────┘ └────────────┘ └──────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Dual-Team System Details

#### User Teams

Each registered user on the platform automatically has the ability to create a team:

```
User Account
    └── Team (one per user)
         ├── Team Roles (Owner, Admin, Manager, Viewer, Custom...)
         ├── Team Members (each with own credentials)
         │    ├── Member 1 (email, password, role)
         │    ├── Member 2 (email, password, role)
         │    └── ...
         └── Activity Logs
```

**Key Characteristics:**
- One team per user account
- Team inherits the user's subscription limits
- Members can only access the parent user's resources
- Separate login page at `/team/login`

#### Admin Teams

The super admin can create a team of sub-admins for platform management:

```
Platform Admin
    └── Admin Team (single platform-wide)
         ├── Admin Roles (Sub-Admin, Support, etc.)
         ├── Admin Team Members
         │    ├── Sub-Admin 1 (email, password, role)
         │    ├── Support Staff 1 (email, password, role)
         │    └── ...
         └── Admin Activity Logs
```

**Key Characteristics:**
- Single admin team for the entire platform
- Special permission sections for admin functions
- Separate login page at `/admin-team/login`
- Can access admin-level features based on permissions

---

## Authentication Flow

### Overview

The Team Management Plugin uses **64-character cryptographically random session tokens** instead of JWT for authentication. This provides:

- Server-side session control (immediate revocation capability)
- No token expiration issues on the client
- Simpler security model
- Automatic session cleanup

### User Team Member Login Flow

```
1. POST /api/team/auth/login
   ├── Request Body: { email, password, teamId? }
   │   Note: teamId is optional if email is unique across teams
   │
   ├── Server validates:
   │   ├── Find team by teamId or by looking up member's email
   │   ├── Verify member exists and is active
   │   ├── Compare password hash (bcrypt)
   │   └── Generate 64-char random token
   │
   └── Response: { 
         token: "abc123...",  // 64-character hex string
         expiresAt: "2024-01-15T00:00:00Z",
         member: { id, email, firstName, lastName, role },
         team: { id, name, type: "user", parentUserId }
       }

2. Client stores token in localStorage/cookie

3. Subsequent requests include:
   └── Header: Authorization: Bearer <64-char-token>

4. Middleware validates token:
   ├── Query team_member_sessions table
   ├── Verify token exists and not expired
   ├── Load member + role + permissions
   └── Attach to req.teamMember context

5. Route handlers check permissions:
   └── TeamPermissionService.checkPermission(roleId, {
         section: 'campaigns',
         subsection: 'create_campaigns',
         action: 'create'
       })
```

### Admin Team Member Login Flow

```
1. POST /api/admin/team/auth/login
   ├── Request Body: { email, password }
   │
   ├── Server validates:
   │   ├── Find admin team member by email
   │   ├── Verify member exists and is active
   │   ├── Compare password hash (bcrypt)
   │   └── Generate 64-char random token
   │
   └── Response: { 
         token: "def456...",  // 64-character hex string
         expiresAt: "2024-01-15T00:00:00Z",
         member: { id, email, firstName, lastName, role },
         adminTeam: { id, name }
       }

2. Client stores token with admin flag

3. Admin requests include:
   └── Header: Authorization: Bearer <64-char-token>

4. Admin middleware validates:
   ├── Query admin_team_sessions table
   ├── Verify token exists and not expired
   └── Attach admin context to request
```

### Token Structure

```typescript
// Token generation (server-side)
const token = crypto.randomBytes(32).toString('hex');
// Result: 64-character hexadecimal string
// Example: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```

### Session Storage

Sessions are stored in the database with the following structure:

```sql
-- User team member sessions
team_member_sessions (
  id UUID,
  member_id UUID,
  team_id UUID,
  token VARCHAR(512) UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  user_agent TEXT,
  ip_address VARCHAR(45)
)

-- Admin team member sessions (similar structure)
admin_team_sessions (...)
```

---

## Role-Based Access Control

### Default Roles

The plugin creates four default system roles when a team is initialized:

| Role | Name | Description | Access Level |
|------|------|-------------|--------------|
| **Owner** | `owner` | Full access to all features | All permissions |
| **Admin** | `admin` | Manage team and most features | All except some billing |
| **Manager** | `manager` | Manage campaigns and agents | Operational features |
| **Viewer** | `viewer` | View-only access | Read-only permissions |

### Default Role Permissions

```typescript
const DEFAULT_ROLE_PERMISSIONS = {
  owner: {
    '*': true,  // Wildcard: all permissions
  },
  admin: {
    'campaigns.*': true,
    'agents.*': true,
    'crm.*': true,
    'calls.*': true,
    'knowledge_base.*': true,
    'phone_numbers.*': true,
    'analytics.*': true,
    'settings.view_settings': true,
    'settings.edit_settings': true,
    'settings.manage_integrations': true,
    'team.*': true,
  },
  manager: {
    'campaigns.*': true,
    'agents.view_agents': true,
    'agents.create_agents': true,
    'agents.edit_agents': true,
    'agents.flow_builder': true,
    'crm.*': true,
    'calls.*': true,
    'knowledge_base.view_knowledge': true,
    'knowledge_base.create_knowledge': true,
    'analytics.view_analytics': true,
    'team.view_team': true,
  },
  viewer: {
    'campaigns.view_campaigns': true,
    'agents.view_agents': true,
    'crm.view_leads': true,
    'calls.view_calls': true,
    'calls.view_transcripts': true,
    'knowledge_base.view_knowledge': true,
    'analytics.view_analytics': true,
    'team.view_team': true,
  },
};
```

### Custom Role Creation

Users can create custom roles if allowed by team settings:

```typescript
// Create a custom role via API
POST /api/team/roles
{
  "name": "campaign_manager",
  "displayName": "Campaign Manager",
  "description": "Manages campaigns only",
  "copyFromRoleId": "<optional-role-id-to-copy-permissions-from>"
}
```

### System Roles vs Custom Roles

| Property | System Roles | Custom Roles |
|----------|--------------|--------------|
| Deletable | No | Yes (if no members assigned) |
| Name Editable | No | Yes (display name only) |
| Permissions Editable | No | Yes |
| Created By | System | User |

---

## Permission Matrix

### User Team Permission Sections

The following sections and subsections are available for user team permissions:

#### Dashboard
| Subsection | ID | Description |
|------------|-----|-------------|
| View Dashboard | `view_dashboard` | Access the main dashboard |
| View Statistics | `view_stats` | View summary statistics |

#### Campaigns
| Subsection | ID | Description |
|------------|-----|-------------|
| View Campaigns | `view_campaigns` | List and view campaigns |
| Create Campaigns | `create_campaigns` | Create new campaigns |
| Edit Campaigns | `edit_campaigns` | Modify existing campaigns |
| Delete Campaigns | `delete_campaigns` | Remove campaigns |
| Manage Contacts | `manage_contacts` | Manage campaign contacts |
| Execute Campaigns | `execute_campaigns` | Start/stop campaigns |

#### Agents
| Subsection | ID | Description |
|------------|-----|-------------|
| View Agents | `view_agents` | List and view AI agents |
| Create Agents | `create_agents` | Create new agents |
| Edit Agents | `edit_agents` | Modify agent settings |
| Delete Agents | `delete_agents` | Remove agents |
| Flow Builder | `flow_builder` | Access flow builder |

#### Contacts
| Subsection | ID | Description |
|------------|-----|-------------|
| View Contacts | `view_contacts` | List and view contacts |
| Create Contacts | `create_contacts` | Add new contacts |
| Edit Contacts | `edit_contacts` | Modify contact info |
| Delete Contacts | `delete_contacts` | Remove contacts |
| Import Contacts | `import_contacts` | Bulk import contacts |
| Export Contacts | `export_contacts` | Export contact data |

#### CRM
| Subsection | ID | Description |
|------------|-----|-------------|
| View Leads | `view_leads` | View CRM leads |
| Edit Leads | `edit_leads` | Modify lead data |
| Delete Leads | `delete_leads` | Remove leads |
| Manage Pipelines | `manage_pipelines` | Configure sales pipelines |

#### Calls & Conversations
| Subsection | ID | Description |
|------------|-----|-------------|
| View Calls | `view_calls` | View call history |
| View Recordings | `view_recordings` | Listen to recordings |
| View Transcripts | `view_transcripts` | Read call transcripts |

#### Knowledge Base
| Subsection | ID | Description |
|------------|-----|-------------|
| View Knowledge Base | `view_knowledge` | View documents |
| Add Documents | `create_knowledge` | Upload new documents |
| Edit Documents | `edit_knowledge` | Modify documents |
| Delete Documents | `delete_knowledge` | Remove documents |

#### Templates
| Subsection | ID | Description |
|------------|-----|-------------|
| View Templates | `view_templates` | View prompt templates |
| Create Templates | `create_templates` | Create new templates |
| Edit Templates | `edit_templates` | Modify templates |
| Delete Templates | `delete_templates` | Remove templates |

#### Website Widget
| Subsection | ID | Description |
|------------|-----|-------------|
| View Widget | `view_widget` | View widget settings |
| Create Widget | `create_widget` | Create new widgets |
| Edit Widget | `edit_widget` | Modify widget settings |
| Delete Widget | `delete_widget` | Remove widgets |
| View Embed Code | `embed_code` | Access embed code |

#### Webhooks
| Subsection | ID | Description |
|------------|-----|-------------|
| View Webhooks | `view_webhooks` | View webhook configs |
| Create Webhooks | `create_webhooks` | Create new webhooks |
| Edit Webhooks | `edit_webhooks` | Modify webhooks |
| Delete Webhooks | `delete_webhooks` | Remove webhooks |

#### Phone Numbers
| Subsection | ID | Description |
|------------|-----|-------------|
| View Numbers | `view_numbers` | List phone numbers |
| Purchase Numbers | `purchase_numbers` | Buy new numbers |
| Manage Numbers | `manage_numbers` | Configure numbers |

#### Billing & Credits
| Subsection | ID | Description |
|------------|-----|-------------|
| View Billing | `view_billing` | View billing info |
| Manage Billing | `manage_billing` | Update billing settings |
| Purchase Credits | `purchase_credits` | Buy credits |

#### Analytics
| Subsection | ID | Description |
|------------|-----|-------------|
| View Analytics | `view_analytics` | View analytics dashboard |
| Export Reports | `export_analytics` | Download reports |

#### API Keys
| Subsection | ID | Description |
|------------|-----|-------------|
| View API Keys | `view_api_keys` | View existing API keys |
| Create API Keys | `create_api_keys` | Generate new API keys |
| Delete API Keys | `delete_api_keys` | Revoke API keys |

#### Settings
| Subsection | ID | Description |
|------------|-----|-------------|
| View Settings | `view_settings` | View account settings |
| Edit Settings | `edit_settings` | Modify settings |
| Manage Integrations | `manage_integrations` | Configure integrations |

#### Team Management
| Subsection | ID | Description |
|------------|-----|-------------|
| View Team | `view_team` | View team members |
| Invite Members | `invite_members` | Add new members |
| Manage Members | `manage_members` | Edit/remove members |
| Manage Roles | `manage_roles` | Configure roles |

### Admin Team Permission Sections

Admin team members have access to platform-level permissions:

#### User Management
| Subsection | ID | Description |
|------------|-----|-------------|
| View Users | `view_users` | View all platform users |
| Edit Users | `edit_users` | Modify user accounts |
| Suspend Users | `suspend_users` | Suspend user accounts |
| Delete Users | `delete_users` | Remove user accounts |
| Manage Credits | `manage_credits` | Adjust user credits |

#### Billing Management
| Subsection | ID | Description |
|------------|-----|-------------|
| View Billing | `view_billing` | View platform billing |
| Manage Plans | `manage_plans` | Configure subscription plans |
| Manage Packages | `manage_packages` | Configure credit packages |
| Process Refunds | `process_refunds` | Issue refunds |
| View Invoices | `view_invoices` | Access all invoices |

#### Platform Settings
| Subsection | ID | Description |
|------------|-----|-------------|
| View Settings | `view_settings` | View platform settings |
| Edit Settings | `edit_settings` | Modify platform settings |
| Manage SMTP | `manage_smtp` | Configure email settings |
| Manage Integrations | `manage_integrations` | Platform integrations |

#### API Credentials
| Subsection | ID | Description |
|------------|-----|-------------|
| View Credentials | `view_credentials` | View API credentials |
| Manage ElevenLabs | `manage_elevenlabs` | Configure ElevenLabs |
| Manage Twilio | `manage_twilio` | Configure Twilio |
| Manage OpenAI | `manage_openai` | Configure OpenAI |

#### Team Oversight
| Subsection | ID | Description |
|------------|-----|-------------|
| View Teams | `view_teams` | View all user teams |
| Manage Teams | `manage_teams` | Manage user teams |
| View Members | `view_members` | View all team members |
| Reset Passwords | `reset_passwords` | Reset member passwords |

#### Analytics & Reports
| Subsection | ID | Description |
|------------|-----|-------------|
| View Analytics | `view_analytics` | Platform analytics |
| View Call Logs | `view_call_logs` | All call logs |
| Export Reports | `export_reports` | Export platform data |

#### Plugin Management
| Subsection | ID | Description |
|------------|-----|-------------|
| View Plugins | `view_plugins` | View installed plugins |
| Toggle Plugins | `toggle_plugins` | Enable/disable plugins |
| Configure Plugins | `configure_plugins` | Configure plugin settings |

#### Admin Team
| Subsection | ID | Description |
|------------|-----|-------------|
| View Admin Team | `view_admin_team` | View sub-admins |
| Invite Sub-Admins | `invite_sub_admins` | Add sub-admins |
| Manage Sub-Admins | `manage_sub_admins` | Edit sub-admins |
| Manage Admin Roles | `manage_admin_roles` | Configure admin roles |

### CRUD Permission Levels

Each subsection supports four permission levels:

| Permission | Description |
|------------|-------------|
| **Create** | Add new items (e.g., create campaign) |
| **Read** | View items (e.g., list campaigns) |
| **Update** | Edit existing items (e.g., modify campaign) |
| **Delete** | Remove items (e.g., delete campaign) |

### Permission Matrix Example

```
┌─────────────────┬────────────────────┬────────┬──────┬────────┬────────┐
│ Section         │ Subsection         │ Create │ Read │ Update │ Delete │
├─────────────────┼────────────────────┼────────┼──────┼────────┼────────┤
│ campaigns       │ view_campaigns     │   -    │  ✓   │   -    │   -    │
│ campaigns       │ create_campaigns   │   ✓    │  ✓   │   -    │   -    │
│ campaigns       │ edit_campaigns     │   -    │  ✓   │   ✓    │   -    │
│ campaigns       │ delete_campaigns   │   -    │  ✓   │   -    │   ✓    │
│ agents          │ view_agents        │   -    │  ✓   │   -    │   -    │
│ agents          │ create_agents      │   ✓    │  ✓   │   -    │   -    │
│ ...             │ ...                │  ...   │ ...  │  ...   │  ...   │
└─────────────────┴────────────────────┴────────┴──────┴────────┴────────┘
```

---

## API Reference

### User Team Endpoints

All user team endpoints require session authentication (logged-in user).

#### Team Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team` | Get current user's team info |
| `POST` | `/api/team` | Create/initialize team |
| `PATCH` | `/api/team` | Update team settings |
| `GET` | `/api/team/activity` | Get team activity logs |

**GET /api/team**
```typescript
// Response
{
  id: "uuid",
  name: "My Team",
  description: "Team description",
  settings: {
    maxMembers: 10,
    allowCustomRoles: true,
    requireEmailVerification: false,
    sessionExpiryHours: 24
  },
  memberCount: 3,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

**POST /api/team**
```typescript
// Request
{ "name": "My Team Name" }

// Response
{ id: "uuid", name: "My Team Name", ... }
```

**PATCH /api/team**
```typescript
// Request
{
  "name": "Updated Team Name",
  "description": "New description",
  "settings": {
    "maxMembers": 20,
    "allowCustomRoles": true
  }
}
```

#### Team Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team/members` | List all team members |
| `POST` | `/api/team/members` | Create new team member |
| `GET` | `/api/team/members/:id` | Get member details |
| `PATCH` | `/api/team/members/:id` | Update member |
| `DELETE` | `/api/team/members/:id` | Remove member |
| `POST` | `/api/team/members/:id/reset-password` | Reset member password |

**POST /api/team/members**
```typescript
// Request
{
  "email": "member@example.com",
  "password": "SecureP@ssw0rd!",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "role-uuid"
}

// Response
{
  id: "member-uuid",
  email: "member@example.com",
  name: "John Doe",
  roleId: "role-uuid",
  roleName: "Manager",
  status: "active",
  createdAt: "2024-01-01T00:00:00Z"
}
```

**PATCH /api/team/members/:id**
```typescript
// Request
{
  "firstName": "Jane",
  "lastName": "Smith",
  "roleId": "new-role-uuid",
  "status": "active" | "suspended" | "deactivated"
}
```

**POST /api/team/members/:id/reset-password**
```typescript
// Request
{ "newPassword": "NewSecureP@ssw0rd!" }

// Response
{ "success": true }
```

#### Team Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team/roles` | List all team roles |
| `POST` | `/api/team/roles` | Create custom role |
| `GET` | `/api/team/roles/:id` | Get role details |
| `PATCH` | `/api/team/roles/:id` | Update role |
| `DELETE` | `/api/team/roles/:id` | Delete custom role |

**POST /api/team/roles**
```typescript
// Request
{
  "name": "campaign_manager",
  "displayName": "Campaign Manager",
  "description": "Manages campaigns only",
  "copyFromRoleId": "optional-role-uuid"  // Copy permissions from existing role
}

// Response
{
  id: "role-uuid",
  name: "campaign_manager",
  displayName: "Campaign Manager",
  description: "Manages campaigns only",
  is_system_role: false,
  created_at: "2024-01-01T00:00:00Z"
}
```

#### Team Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team/permissions/sections` | Get all permission sections |
| `GET` | `/api/team/permissions/matrix/:roleId` | Get permission matrix for role |
| `PATCH` | `/api/team/permissions/:roleId` | Update role permissions |

**GET /api/team/permissions/matrix/:roleId**
```typescript
// Response
{
  roleId: "role-uuid",
  sections: [
    {
      id: "campaigns",
      label: "Campaigns",
      icon: "Megaphone",
      subsections: [
        {
          id: "view_campaigns",
          label: "View Campaigns",
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false
        },
        // ... more subsections
      ]
    },
    // ... more sections
  ]
}
```

**PATCH /api/team/permissions/:roleId**
```typescript
// Request
{
  "permissions": [
    {
      "section": "campaigns",
      "subsection": "view_campaigns",
      "canCreate": false,
      "canRead": true,
      "canUpdate": false,
      "canDelete": false
    },
    {
      "section": "campaigns",
      "subsection": "create_campaigns",
      "canCreate": true,
      "canRead": true,
      "canUpdate": false,
      "canDelete": false
    }
  ]
}
```

### Team Member Authentication

Public endpoints for team member authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/team/auth/login` | Team member login |
| `POST` | `/api/team/auth/logout` | Logout |
| `GET` | `/api/team/auth/me` | Get current member info |
| `POST` | `/api/team/auth/refresh` | Refresh session |
| `POST` | `/api/team/auth/forgot-password` | Request password reset |
| `POST` | `/api/team/auth/reset-password` | Complete password reset |

**POST /api/team/auth/login**
```typescript
// Request
{
  "email": "member@example.com",
  "password": "password123",
  "teamId": "optional-team-uuid"  // Required if email exists in multiple teams
}

// Response
{
  token: "64-character-hex-token...",
  expiresAt: "2024-01-02T00:00:00Z",
  member: {
    id: "member-uuid",
    email: "member@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "Manager"
  },
  team: {
    id: "team-uuid",
    name: "Acme Corp",
    type: "user",
    parentUserId: "user-uuid"
  }
}
```

**GET /api/team/auth/me**
```typescript
// Headers: Authorization: Bearer <token>

// Response
{
  member: {
    id: "member-uuid",
    email: "member@example.com",
    firstName: "John",
    lastName: "Doe",
    roleId: "role-uuid",
    roleName: "Manager"
  },
  team: {
    id: "team-uuid",
    name: "Acme Corp",
    parentUserId: "user-uuid"
  },
  permissions: [
    {
      section: "campaigns",
      subsection: "view_campaigns",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false
    },
    // ... all permissions
  ]
}
```

### Admin Sub-Admin Authentication

Public endpoints for admin team member authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/team/auth/login` | Sub-admin login |
| `POST` | `/api/admin/team/auth/logout` | Logout |
| `GET` | `/api/admin/team/auth/me` | Get current sub-admin info |

**POST /api/admin/team/auth/login**
```typescript
// Request
{
  "email": "subadmin@example.com",
  "password": "password123"
}

// Response
{
  token: "64-character-hex-token...",
  expiresAt: "2024-01-02T00:00:00Z",
  member: {
    id: "admin-member-uuid",
    email: "subadmin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "Sub-Admin"
  },
  adminTeam: {
    id: "admin-team-uuid",
    name: "Admin Team"
  }
}
```

### Admin Team Oversight

Endpoints for super admins to oversee all platform teams.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/teams` | List all teams |
| `GET` | `/api/admin/teams/stats` | Get platform-wide team statistics |
| `GET` | `/api/admin/teams/:id` | Get specific team details |
| `GET` | `/api/admin/teams/:id/members` | List team members |
| `PATCH` | `/api/admin/teams/:id/settings` | Update team settings |
| `DELETE` | `/api/admin/teams/:id/members/:memberId` | Remove team member |

**GET /api/admin/teams**
```typescript
// Query params: ?page=1&limit=20&search=acme

// Response
{
  teams: [
    {
      id: "team-uuid",
      name: "Acme Corp",
      description: "...",
      ownerEmail: "owner@acme.com",
      ownerUserId: "user-uuid",
      memberCount: 5,
      createdAt: "2024-01-01T00:00:00Z"
    },
    // ...
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

**GET /api/admin/teams/stats**
```typescript
// Response
{
  totalTeams: 150,
  totalMembers: 523,
  activeMembers: 498,
  invitedMembers: 25,
  teamsByPlan: {
    "free": 50,
    "starter": 60,
    "professional": 30,
    "enterprise": 10
  }
}
```

### Admin Team Management

Endpoints for managing the admin's own sub-admin team.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/team` | Get admin team info |
| `GET` | `/api/admin/team/members` | List sub-admin members |
| `POST` | `/api/admin/team/members` | Create sub-admin |
| `GET` | `/api/admin/team/members/:id` | Get sub-admin details |
| `PATCH` | `/api/admin/team/members/:id` | Update sub-admin |
| `DELETE` | `/api/admin/team/members/:id` | Remove sub-admin |
| `GET` | `/api/admin/team/roles` | List admin roles |
| `POST` | `/api/admin/team/roles` | Create admin role |
| `GET` | `/api/admin/team/permissions/sections` | Get admin permission sections |
| `GET` | `/api/admin/team/permissions/matrix/:roleId` | Get permission matrix |
| `PATCH` | `/api/admin/team/permissions/:roleId` | Update permissions |

**POST /api/admin/team/members**
```typescript
// Request
{
  "email": "support@example.com",
  "password": "SecureP@ssw0rd!",
  "firstName": "Support",
  "lastName": "Staff",
  "roleId": "admin-role-uuid"
}

// Response
{
  id: "admin-member-uuid",
  email: "support@example.com",
  name: "Support Staff",
  roleId: "admin-role-uuid",
  roleName: "Support",
  status: "active",
  createdAt: "2024-01-01T00:00:00Z"
}
```

---

## Frontend Integration

### Team Member Sidebar

For team members, use a permission-aware sidebar that only shows accessible items:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

function TeamMemberSidebar() {
  const { data: memberData } = useQuery({
    queryKey: ['/api/team/auth/me'],
    enabled: !!localStorage.getItem('teamMemberToken')
  });

  const hasPermission = (section: string, subsection: string) => {
    if (!memberData?.permissions) return false;
    const perm = memberData.permissions.find(
      p => p.section === section && p.subsection === subsection
    );
    return perm?.canRead ?? false;
  };

  return (
    <nav>
      {hasPermission('campaigns', 'view_campaigns') && (
        <Link href="/campaigns">Campaigns</Link>
      )}
      {hasPermission('agents', 'view_agents') && (
        <Link href="/agents">Agents</Link>
      )}
      {hasPermission('analytics', 'view_analytics') && (
        <Link href="/analytics">Analytics</Link>
      )}
      {/* ... more navigation items */}
    </nav>
  );
}
```

### Permission-Aware Components

Create a permission check hook:

```tsx
import { useQuery } from '@tanstack/react-query';

export function useTeamPermission(section: string, subsection: string, action: 'create' | 'read' | 'update' | 'delete') {
  const { data: memberData } = useQuery({
    queryKey: ['/api/team/auth/me'],
    enabled: !!localStorage.getItem('teamMemberToken')
  });

  if (!memberData?.permissions) return false;

  const perm = memberData.permissions.find(
    p => p.section === section && p.subsection === subsection
  );

  if (!perm) return false;

  switch (action) {
    case 'create': return perm.canCreate;
    case 'read': return perm.canRead;
    case 'update': return perm.canUpdate;
    case 'delete': return perm.canDelete;
    default: return false;
  }
}

// Usage
function CampaignActions({ campaignId }) {
  const canEdit = useTeamPermission('campaigns', 'edit_campaigns', 'update');
  const canDelete = useTeamPermission('campaigns', 'delete_campaigns', 'delete');

  return (
    <div>
      {canEdit && <Button onClick={() => editCampaign(campaignId)}>Edit</Button>}
      {canDelete && <Button variant="destructive" onClick={() => deleteCampaign(campaignId)}>Delete</Button>}
    </div>
  );
}
```

### Team Management Component

```tsx
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

function UserTeamManagement() {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['/api/team']
  });

  const { data: membersData } = useQuery({
    queryKey: ['/api/team/members']
  });

  const { data: rolesData } = useQuery({
    queryKey: ['/api/team/roles']
  });

  const createMember = useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      return apiRequest('/api/team/members', { method: 'POST', body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    }
  });

  // ... render team management UI
}
```

### Auth Storage Utilities

```typescript
// lib/team-auth.ts

export const TEAM_TOKEN_KEY = 'teamMemberToken';
export const TEAM_DATA_KEY = 'teamMemberData';

export function setTeamAuth(token: string, memberData: any) {
  localStorage.setItem(TEAM_TOKEN_KEY, token);
  localStorage.setItem(TEAM_DATA_KEY, JSON.stringify(memberData));
}

export function getTeamToken(): string | null {
  return localStorage.getItem(TEAM_TOKEN_KEY);
}

export function getTeamMemberData(): any | null {
  const data = localStorage.getItem(TEAM_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearTeamAuth() {
  localStorage.removeItem(TEAM_TOKEN_KEY);
  localStorage.removeItem(TEAM_DATA_KEY);
}

export function isTeamMemberLoggedIn(): boolean {
  return !!getTeamToken();
}
```

---

## Configuration

### Plugin Settings

Configure the plugin via `plugin.json` or admin settings:

```json
{
  "settings": {
    "enabled": {
      "type": "boolean",
      "default": true,
      "label": "Enable Team Management Plugin"
    },
    "maxTeamMembers": {
      "type": "number",
      "default": 10,
      "label": "Default Max Team Members",
      "description": "Can be overridden per subscription plan"
    },
    "allowCustomRoles": {
      "type": "boolean",
      "default": true,
      "label": "Allow Custom Roles"
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEAM_SESSION_SECRET` | No | Auto-generated | Secret key for session token signing |
| `TEAM_SESSION_EXPIRY` | No | `24` | User team session expiry in hours |
| `ADMIN_TEAM_SESSION_EXPIRY` | No | `24` | Admin team session expiry in hours |

### Team Settings

Each team has configurable settings:

```typescript
interface TeamSettings {
  maxMembers: number;           // Maximum team members (default: 10)
  allowCustomRoles: boolean;    // Allow custom role creation (default: true)
  requireEmailVerification: boolean;  // Require email verification (default: false)
  sessionExpiryHours: number;   // Session expiry in hours (default: 24)
}
```

---

## Security

### Password Security

- **Hashing Algorithm**: bcrypt with 12 rounds
- **Minimum Length**: 8 characters (enforced by API)
- **Storage**: Only password hashes are stored, never plaintext

```typescript
// Password hashing (server-side)
const BCRYPT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Password verification
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### Session Token Security

- **Token Generation**: 256-bit cryptographically random tokens
- **Token Format**: 64-character hexadecimal string
- **Storage**: Server-side in database with expiration
- **Revocation**: Immediate revocation possible by deleting session

```typescript
// Token generation
const token = crypto.randomBytes(32).toString('hex');
// Result: 64 characters, e.g., "a1b2c3d4..."
```

### Recommended Security Practices

1. **Use HTTPS**: Always serve the application over HTTPS
2. **Set Strong Passwords**: Enforce password complexity requirements
3. **Short Session Expiry**: Use shorter session expiry for sensitive accounts
4. **Activity Monitoring**: Review team activity logs regularly
5. **Least Privilege**: Assign minimum necessary permissions
6. **Regular Audits**: Audit team access and remove inactive members
7. **Rate Limiting**: Implement rate limiting on auth endpoints

### Permission Validation

All permission checks are performed server-side:

```typescript
// Middleware example
async function requireTeamPermission(section: string, subsection: string, action: string) {
  return async (req, res, next) => {
    const member = req.teamMember;
    if (!member) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasPermission = await TeamPermissionService.checkPermission(
      member.roleId,
      { section, subsection, action }
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}
```

### Audit Logging

All sensitive operations are logged:

```typescript
// Logged actions include:
- member_created
- member_updated
- member_deleted
- member_login
- member_logout
- role_created
- role_updated
- role_deleted
- permissions_updated
- password_reset
```

---

## Troubleshooting

### Common Issues

#### 1. Team Member Cannot Log In

**Symptoms**: Login returns "Invalid email or password"

**Solutions**:
- Verify member status is "active" (not suspended/deactivated)
- Confirm email is correct (case-insensitive)
- Reset password if forgotten
- Check if team exists and is active

```sql
-- Check member status
SELECT email, status, last_login_at FROM team_members WHERE email = 'member@example.com';
```

#### 2. Permission Denied Errors

**Symptoms**: API returns 403 Forbidden

**Solutions**:
- Verify role has required permission
- Check permission matrix for the role
- Ensure subsection matches exactly
- Confirm action type (create/read/update/delete)

```sql
-- Check permissions for a role
SELECT * FROM team_permissions WHERE role_id = 'role-uuid';
```

#### 3. Cannot Create More Members

**Symptoms**: "Team member limit reached" error

**Solutions**:
- Check team's `maxMembers` setting
- Upgrade subscription plan for higher limits
- Remove inactive members

```sql
-- Check team settings and member count
SELECT 
  t.settings->>'maxMembers' as max_members,
  COUNT(m.id) as current_members
FROM teams t
LEFT JOIN team_members m ON t.id = m.team_id
WHERE t.user_id = 'user-id'
GROUP BY t.id;
```

#### 4. Session Expired Unexpectedly

**Symptoms**: Token becomes invalid before expected expiry

**Solutions**:
- Check `TEAM_SESSION_EXPIRY` environment variable
- Verify server time is synchronized
- Look for session cleanup cron jobs

#### 5. Custom Roles Not Available

**Symptoms**: Cannot create custom roles

**Solutions**:
- Check team setting `allowCustomRoles` is true
- Verify subscription plan allows custom roles
- Check for any role creation errors in logs

### Debug Logging

Enable detailed logging by checking server logs:

```bash
# Filter team-related logs
grep "\[Team\]" /var/log/agenthr.log
grep "\[Team Auth\]" /var/log/agenthr.log
grep "\[Team Permission\]" /var/log/agenthr.log
```

### Database Queries for Debugging

```sql
-- List all teams with member counts
SELECT t.id, t.name, u.email as owner, COUNT(m.id) as members
FROM teams t
JOIN users u ON t.user_id = u.id
LEFT JOIN team_members m ON t.id = m.team_id
GROUP BY t.id, u.email;

-- List all active sessions
SELECT m.email, s.created_at, s.expires_at, s.last_activity_at
FROM team_member_sessions s
JOIN team_members m ON s.member_id = m.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity_at DESC;

-- List permissions for a specific member
SELECT m.email, r.display_name as role, p.section, p.subsection, 
       p.can_create, p.can_read, p.can_update, p.can_delete
FROM team_members m
JOIN team_roles r ON m.role_id = r.id
JOIN team_permissions p ON r.id = p.role_id
WHERE m.email = 'member@example.com';
```

---

## Changelog

### Version 1.0.0 (2024-01-01)

**Initial Release**

#### Features
- Dual-team system (User Teams + Admin Teams)
- Separate team member authentication with 64-char session tokens
- Role-based access control with default roles (Owner, Admin, Manager, Viewer)
- Custom role creation with permission inheritance
- Hierarchical permission system with 16 sections and 60+ subsections
- Section-wise CRUD permissions
- Activity audit logging
- Admin oversight of all platform teams
- Sub-admin system for platform administration
- Dedicated login pages for team members and sub-admins
- Password reset functionality
- React UI components for team management

#### Database Tables
- `teams` - One team per user account
- `team_members` - Team members with separate auth
- `team_roles` - Role definitions per team
- `team_permissions` - Section-wise CRUD permissions
- `team_member_sessions` - Active session tokens
- `team_activity_logs` - Audit trail
- `admin_teams` - Platform admin team
- `admin_team_members` - Sub-admin members
- `admin_team_roles` - Admin role definitions
- `admin_team_permissions` - Admin permission matrix
- `admin_team_sessions` - Admin session tokens

#### API Endpoints
- User team management: `/api/team/*`
- Team member auth: `/api/team/auth/*`
- Admin sub-admin auth: `/api/admin/team/auth/*`
- Admin oversight: `/api/admin/teams/*`
- Admin team management: `/api/admin/team/*`

#### Security
- bcrypt password hashing (12 rounds)
- 256-bit cryptographic session tokens
- Server-side session management
- Permission validation on all endpoints
- Complete audit trail

---

## Support

For issues, feature requests, or questions:

- **Documentation**: Check this file and related docs in `plugins/team-management/docs/`
- **Email**: support@agenthr.io
- **GitHub**: Open an issue on the repository

---

*Last Updated: December 2024*
