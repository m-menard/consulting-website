# AgentHR Plugin System

This directory contains all installed plugins for AgentHR. The plugin system enables a true marketplace architecture where plugins can be purchased, installed, and activated without modifying core application code.

## Installed Plugins

| Plugin | Version | Type | Description |
|--------|---------|------|-------------|
| sip-engine | 2.0.0 | Full Stack | SIP trunk integration with ElevenLabs/OpenAI engines |
| team-management | 1.0.0 | Full Stack | Team members, roles, and CRUD permissions |
| rest-api | 1.0.0 | Backend Only | REST API with API key authentication |

## Plugin Installation

1. **Obtain the plugin** - Purchase or download the plugin folder
2. **Copy to plugins directory** - Place the plugin folder in `/plugins`
3. **Build frontend bundles** - Run: `node scripts/build-plugins.js`
4. **Restart the application** - The plugin will be auto-discovered and loaded

## Creating a New Plugin

### Required Files

```
plugins/my-plugin/
├── plugin.json          # Plugin manifest (required)
├── index.ts             # Backend entry point (required)
├── frontend/            # Frontend components (optional)
│   └── index.tsx        # Frontend entry point
├── routes/              # API route handlers
├── services/            # Business logic
├── migrations/          # Database migrations
└── README.md            # Documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "description": "Description of what the plugin does",
  "author": "Your Name",
  "entryPoint": "index.ts",
  "registerFunction": "registerMyPluginRoutes",
  
  "ui": {
    "frontendBundle": "dist/bundle.js",
    "adminSettings": {
      "tab": "my-plugin",
      "label": "My Plugin",
      "component": "MyPluginAdminTab"
    }
  },
  
  "database": {
    "migrations": ["migrations/001_initial.sql"]
  }
}
```

### Frontend Entry Point (frontend/index.tsx)

```tsx
import { usePluginRegistry } from '@/contexts/plugin-registry';

function MyPluginSettingsTab() {
  return <div>My Plugin Settings UI</div>;
}

function MyPluginAdminTab() {
  return <div>My Plugin Admin UI</div>;
}

// Self-registration - this runs when the bundle is loaded
(function registerPlugin() {
  const registry = (window as any).__AGENTHR_PLUGIN_REGISTRY__;
  
  if (registry) {
    // Register settings tab for users
    registry.registerSettingsTab('my-plugin', 'My Plugin', MyPluginSettingsTab);
    
    // Register admin settings tab
    registry.registerAdminSettingsTab('my-plugin', 'My Plugin', MyPluginAdminTab);
    
    // Register admin sidebar menu item
    registry.registerAdminMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      icon: 'Settings',
      path: '/admin/my-plugin',
      component: MyPluginAdminPage,
    });
    
    console.log('[MyPlugin] Registered UI components');
  }
})();
```

### Backend Entry Point (index.ts)

```typescript
import { Express } from 'express';

export function registerMyPluginRoutes(app: Express) {
  app.get('/api/my-plugin/status', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  console.log('[MyPlugin] Routes registered');
}
```

## Available Registration Methods

Plugins can register UI components using these methods from the plugin registry:

| Method | Description |
|--------|-------------|
| `registerSettingsTab(id, label, component)` | Add tab to user settings page |
| `registerPhoneNumbersTab(id, label, component)` | Add tab to phone numbers section |
| `registerAdminMenuItem(menuItem)` | Add item to admin sidebar navigation |
| `registerAdminSettingsTab(id, label, component)` | Add tab to admin settings page |

## Building Plugin Bundles

Frontend bundles must be built before they can be loaded:

```bash
# Build all plugins
node scripts/build-plugins.js

# Build specific plugin
node scripts/build-plugins.js my-plugin

# Watch mode for development
node scripts/build-plugins.js --watch
```

The build script:
- Bundles TypeScript/TSX files using esbuild
- Externalizes React, ReactDOM, and TanStack Query (uses host app instances)
- Outputs minified IIFE bundles to `dist/bundle.js`

## Shared Dependencies

Plugin bundles automatically use these from the host application:
- `react` and `react-dom`
- `@tanstack/react-query` (useQuery, useMutation, etc.)
- UI components from `@/components/ui/*` (shadcn/ui)
- Hooks from `@/hooks/*`
- Utilities from `@/lib/*`

## Plugin Types

### Full Stack Plugins
Have both backend routes and frontend UI. Examples: sip-engine, team-management

### Backend Only Plugins
Only register API routes, no frontend bundle. Example: rest-api

## Best Practices

1. **Use the plugin registry** - Always register components via the global registry
2. **Externalize shared deps** - Don't bundle React or TanStack Query
3. **Follow naming conventions** - Use kebab-case for plugin names
4. **Include migrations** - Use SQL migrations for database changes
5. **Document your plugin** - Include README.md and INSTALLATION.md
6. **Version your plugin** - Follow semantic versioning in plugin.json
