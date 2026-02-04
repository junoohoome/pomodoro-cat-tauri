# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **番茄专注猫** (Pomodoro Cat) - a cross-platform desktop Pomodoro timer application built with:
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Tauri 2 + Rust
- **Database**: SQLite (via rusqlite in Rust, with Drizzle ORM for type definitions)
- **State Management**: Zustand

## Common Commands

### Development
```bash
npm run dev          # Start Vite dev server (port 1420)
npm run tauri dev    # Start Tauri dev mode (runs both frontend and Rust)
npm run build        # TypeScript check + Vite build
npm run tauri build  # Build production Tauri app
npm run preview      # Preview Vite build
```

### Rust-specific
```bash
cd src-tauri
cargo build          # Build Rust code
cargo test           # Run Rust tests
cargo clippy         # Lint Rust code
```

## Architecture

### Project Structure
```
pomodoro-cat-tauri/
├── src/                      # React frontend
│   ├── pages/               # Page components (Timer, Tasks, Cat, Stats, Settings)
│   ├── stores/              # Zustand state stores
│   ├── lib/                 # Utilities (db schema, utils)
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main layout with sidebar navigation
│   └── main.tsx             # React Router setup
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point (calls lib.rs)
│   │   ├── lib.rs          # Tauri app setup, command registration
│   │   ├── db.rs           # Database schema + connection management
│   │   └── commands.rs     # Tauri commands (business logic)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json
```

### Frontend-Backend Communication

**Tauri Commands**: All data operations go through Tauri commands defined in `src-tauri/src/commands.rs`:
- Task CRUD: `get_tasks`, `create_task`, `update_task`, `delete_task`
- Config: `get_user_config`, `update_user_config`
- Records: `record_pomodoro`, `get_stats`, `clear_pomodoro_records`
- State: `get_state`, `set_state`

**Pattern**: Frontend stores call `invoke()` from `@tauri-apps/api/core` to execute Rust commands.

### Data Flow
1. Frontend stores (`stores/`) call Tauri commands via `invoke()`
2. Rust commands in `commands.rs` use the global `DbConnection` from `lib.rs`
3. Database operations use raw SQL via `rusqlite`
4. Results are serialized (camelCase) and returned to frontend
5. Frontend Zustand stores update and components re-render

### State Management (Zustand Stores)
- `timerStore`: Timer state (idle/running/paused), remaining time, test mode
- `taskStore`: Active/completed tasks, pagination, CRUD operations
- `userStore`: User configuration and preferences
- `testModeStore`: Test mode toggle for development

### Database Schema (Defined in Two Places)
- **Rust**: `src-tauri/src/db.rs` - actual table creation, SQL queries
- **TypeScript**: `src/lib/db/schema.ts` - Drizzle ORM definitions for type inference

**Tables**:
- `tasks`: User tasks with pomodoro targets, priorities, deadlines
- `user_config`: Single-row config (focus/break duration, notifications, theme)
- `pomodoro_records`: Focus session history
- `app_state`: Key-value store for app persistence

### Routing
React Router with nested routes under `<App />` (sidebar layout):
- `/` or `/timer` - Main timer page
- `/tasks` - Task management
- `/cat` - Cat/tamagotchi page
- `/stats` - Statistics with charts
- `/settings` - User settings

### Type Safety
- TypeScript types mirror Rust structs (defined in `src/types/index.ts`)
- Rust uses `#[serde(rename_all = "camelCase")]` to match JS conventions
- Drizzle schema infers TypeScript types from database schema

### Cat/Tamagotchi System
The app gamifies productivity with a virtual cat that grows as users complete pomodoros:
- Users earn "cans" (罐头) for each completed focus session
- Cat has growth stages (levels) with unlock thresholds
- Implemented in `stores/userStore.ts` and `pages/Cat.tsx`

### Test Mode
A development feature in `timerStore` for quick testing:
- 1-minute focus/break sessions (vs 25/5 normal)
- Toggle only available when timer is idle
- Use `clear_pomodoro_records` command to reset test data

## Important Notes

- **Port**: Vite dev server runs on port 1420 (strict port - fails if occupied)
- **Database Location**: App data directory via `app.path().app_data_dir()`
- **Chinese UI**: The app interface is in Chinese (番茄专注猫)
- **Inline Styling**: Components use inline styles (no CSS modules or styled-components)
- **No Tests**: Project currently has no test setup

## Development Workflow

When modifying data operations:
1. Update Rust structs in `src-tauri/src/db.rs`
2. Update SQL queries in `src-tauri/src/commands.rs`
3. Update TypeScript types in `src/types/index.ts`
4. Update Drizzle schema in `src/lib/db/schema.ts`
5. Update frontend store in `src/stores/*.ts`
6. Update UI components as needed

When adding new Tauri commands:
1. Add the command function to `src-tauri/src/commands.rs`
2. Register in `invoke_handler!` macro in `src-tauri/src/lib.rs`
3. Create corresponding TypeScript wrapper in a store file using `invoke()`
