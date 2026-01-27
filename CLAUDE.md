# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri v2 desktop application template using React + TypeScript + Vite for the frontend, Rust for the backend, with shadcn/ui + Tailwind CSS for the UI layer. The architecture follows Tauri's pattern where the web frontend communicates with the Rust backend through commands.

## Development Commands

### Frontend (Node.js)
- `npm run dev` - Start Vite dev server (runs on port 1420, strict port)
- `npm run build` - Build frontend (TypeScript check + Vite build)
- `npm run preview` - Preview production build

### Tauri (Full Stack)
- `npm run tauri dev` - Run full development mode (starts frontend dev server, builds Rust in debug mode, opens app window)
- `npm run tauri build` - Build release binary for current platform

### Rust Backend
- `cd src-tauri && cargo check` - Check Rust code for errors
- `cd src-tauri && cargo clippy` - Run Rust linter
- `cd src-tauri && cargo test` - Run Rust tests

## Architecture

### Frontend-Backend Communication
The frontend communicates with Rust through Tauri's `invoke()` function:

```typescript
import { invoke } from "@tauri-apps/api/core";
// Call a Rust command defined in lib.rs
const result = await invoke("command_name", { arg: value });
```

### Rust Commands (Backend)
Commands are defined in `src-tauri/src/lib.rs` using the `#[tauri::command]` macro and registered in the `invoke_handler`. To add a new command:
1. Define the function with `#[tauri::command]`
2. Add it to `tauri::generate_handler![...]` in `lib.rs`

### Project Structure
```
src/                      # React frontend
  - components/
    - ui/                # shadcn/ui components
    - layout.tsx         # Main layout with sidebar
    - sidebar.tsx        # Multi-level navigation sidebar
  - lib/
    - utils.ts           # Utility functions (cn helper for class merging)
    - request.ts         # HTTP request wrapper
  - hooks/
    - use-request.ts     # React hook for API requests
  - services/            # API service definitions
    - api.ts             # Common API methods
    - user.ts            # User-related API example
  - pages/               # Page components
  - index.css            # Global styles with Tailwind directives + CSS variables
  - App.tsx             # Main React component with routing
  - main.tsx            # React entry point
src-tauri/
  - src/
    - main.rs           # Rust entry point (calls lib::run())
    - lib.rs            # Tauri app setup, commands, plugins
  - tauri.conf.json     # Tauri configuration (windows, build settings)
  - Cargo.toml          # Rust dependencies
vite.config.ts           # Vite config (port 1420, ignores src-tauri, path aliases)
tailwind.config.js       # Tailwind CSS configuration
.env                     # Environment variables (create from .env.example)
```

### UI Components (shadcn/ui)
The project uses shadcn/ui components with Tailwind CSS. Components are located in `src/components/ui/` and follow these patterns:
- Use `@/lib/utils` `cn()` function for conditional class merging
- Use CSS variables for theming (defined in `src/index.css`)
- Components are copied into the project (not installed as packages)

To add new shadcn/ui components:
1. Visit https://ui.shadcn.com/docs/components
2. Copy the component code to `src/components/ui/[component-name].tsx`
3. Update imports to use `@/lib/utils`

### Important Configuration
- **Dev server**: Fixed port 1420 (required by Tauri)
- **Frontend dist**: Output to `dist/`, consumed by Tauri at `frontendDist: "../dist"`
- **CSP**: Currently disabled (`"csp": null`) for development
- **Window config**: Defined in `src-tauri/tauri.conf.json` under `app.windows`
- **Path aliases**: `@/*` maps to `src/*` (configured in both vite.config.ts and tsconfig.json)

## TypeScript Configuration
- Strict mode enabled with additional checks: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- JSX uses `react-jsx` transform (React 17+)
- Path alias `@/*` is configured for cleaner imports

## Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component components built with Radix UI primitives
- **Dark mode**: Supported via `class` strategy (add `dark` class to enable)
- **CSS variables**: Theme colors use HSL values stored in CSS variables

## API Requests

### Environment Configuration
Create a `.env` file in the project root (copy from `.env.example`):
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### Defining API Services
Create API methods in `src/services/`:

```typescript
// src/services/user.ts
import { get, post, put, del } from "@/lib/request";

export interface User {
  id: number;
  name: string;
  email: string;
}

export function getUserList(params: { page: number; pageSize: number }) {
  return get<{ list: User[]; total: number }>("/users", params);
}

export function createUser(data: { name: string; email: string }) {
  return post<User>("/users", data);
}
```

### Using API in Components
Use the `useRequest` hook:

```typescript
import { useRequest } from "@/hooks/use-request";
import { getUserList } from "@/services/user";

function UserList() {
  const { data, loading, error, refresh } = useRequest(
    () => getUserList({ page: 1, pageSize: 10 }),
    { immediate: true }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.list.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

### Direct API Calls
For non-component usage:

```typescript
import { getUserList } from "@/services/user";

async function loadUsers() {
  try {
    const data = await getUserList({ page: 1, pageSize: 10 });
    console.log(data.list);
  } catch (error) {
    console.error("Failed to load users:", error);
  }
}
```

### Available HTTP Methods
- `get<T>(url, params?)` - GET request
- `post<T>(url, data?)` - POST request
- `put<T>(url, data?)` - PUT request
- `del<T>(url, params?)` - DELETE request
- `patch<T>(url, data?)` - PATCH request
- `request<T>(config)` - Custom request with full control
