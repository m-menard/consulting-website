# Team Management Plugin - Structure

## Directory Layout

```
plugins/team-management/
├── index.ts                    # Plugin entry point
├── types.ts                    # TypeScript definitions
├── plugin.json                 # Plugin metadata
├── INSTALLATION.md             # Installation guide
├── STRUCTURE.md                # This file
├── README.md                   # Quick reference
│
├── frontend/
│   └── index.tsx               # Plugin bundle entry
│
├── migrations/
│   └── 001_team_tables.sql     # Database schema
│
├── routes/
│   ├── user-team.routes.ts     # User team CRUD
│   ├── user-members.routes.ts  # Member management
│   ├── user-roles.routes.ts    # Role management
│   ├── user-permissions.routes.ts
│   ├── team-auth.routes.ts     # Member authentication
│   ├── admin-team.routes.ts    # Admin team management
│   ├── admin-team-auth.routes.ts
│   └── admin-teams.routes.ts   # Admin oversight
│
├── services/
│   ├── team.service.ts         # Core team logic
│   ├── team-auth.service.ts    # Authentication
│   ├── team-permission.service.ts
│   └── admin-team.service.ts
│
├── middleware/
│   └── team-auth.middleware.ts # Auth middleware
│
├── ui/
│   ├── AdminTeamManagement.tsx # Admin panel component
│   ├── UserTeamManagement.tsx  # User settings component
│   └── PermissionMatrixEditor.tsx
│
└── docs/
    └── DOCUMENTATION.md
```

## Data Flow

```
Frontend (Plugin UI)
    │
    ▼
API Routes (/api/team/*, /api/admin/team/*)
    │
    ▼
Services (TeamService, TeamAuthService)
    │
    ▼
Database (teams, team_members, team_roles, team_permissions)
```

## Key Components

### Plugin Entry (index.ts)
- Exports route factory functions
- Registers all routes with middleware
- Exports services for external use

### UI Components
- **AdminTeamManagement** - Platform-wide team management
- **UserTeamManagement** - User's team settings
- **PermissionMatrixEditor** - Permission configuration

### Services
- **TeamService** - CRUD operations for teams, members, roles
- **TeamAuthService** - Login, logout, sessions
- **TeamPermissionService** - Permission checking

## Plugin Bundle

The frontend bundle is built with:
```bash
node scripts/build-plugins.js team-management
```

Output: `plugins/team-management/dist/bundle.js`
