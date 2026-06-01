# Desktop Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transparent, always-on-top desktop pet window that displays a simple line-art cat reacting to pomodoro timer states.

**Architecture:** A second Tauri window ("pet") created programmatically from Rust, loading a separate Vite multi-page HTML entry. The pet window uses Tauri's event system to receive timer state from the main window and sends click/drag events back. SVG cat components with CSS keyframe animations render the four timer states.

**Tech Stack:** Tauri 2 (transparent window, event system), React 19, TypeScript, SVG + CSS animations, Vite multi-page config

**Design Spec:** `docs/superpowers/specs/2026-06-01-desktop-pet-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `pet.html` | Vite HTML entry for pet window (transparent bg, loads pet main.tsx) |
| `src/pet/main.tsx` | React entry point for pet window (renders PetWindow) |
| `src/pet/PetWindow.tsx` | Root pet component: listens to Tauri events, renders cat + timer text |
| `src/pet/components/CatIdle.tsx` | SVG idle cat with tail wag animation |
| `src/pet/components/CatRunning.tsx` | SVG meditating cat with breathing animation |
| `src/pet/components/CatPaused.tsx` | SVG lying cat with Zzz animation |
| `src/pet/components/CatBreak.tsx` | SVG alert cat with stretch animation |
| `src/pet/styles.css` | Pet window CSS: transparent bg, cat keyframe animations |

### Modified Files

| File | Changes |
|------|---------|
| `vite.config.ts` | Add multi-page rollup input for `pet.html` |
| `src-tauri/src/db.rs` | Add `show_desktop_pet` column migration + field to `UserConfig` |
| `src-tauri/src/commands.rs` | Add `show_desktop_pet` param to `update_user_config`, `get_user_config` |
| `src-tauri/src/lib.rs` | Create pet window on setup, handle `pet-clicked` event, global shortcut |
| `src-tauri/capabilities/default.json` | Add `pet` window, window permissions |
| `src/types/index.ts` | Add `showDesktopPet` to `UserConfig` |
| `src/stores/userStore.ts` | Pass `showDesktopPet` in `updateConfig` |
| `src/stores/timerStore.ts` | Emit Tauri events on state changes and ticks |
| `src/pages/Settings.tsx` | Add desktop pet toggle section |

---

## Task 1: Vite Multi-Page Setup

**Files:**
- Create: `pet.html`
- Modify: `vite.config.ts`

This sets up the build infrastructure so the pet window gets its own HTML entry point.

- [ ] **Step 1: Create `pet.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pet</title>
    <style>
      html, body {
        background: transparent;
        margin: 0;
        padding: 0;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/pet/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Update `vite.config.ts` to add multi-page input**

Replace the entire file content of `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        pet: resolve(__dirname, "pet.html"),
      },
    },
  },
}));
```

- [ ] **Step 3: Create placeholder `src/pet/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div style={{ color: "#333", fontSize: "12px" }}>Pet Window</div>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts on port 1420 without errors. Both `index.html` and `pet.html` are accessible.

- [ ] **Step 5: Commit**

```bash
git add pet.html vite.config.ts src/pet/main.tsx
git commit -m "feat: add Vite multi-page setup for pet window"
```

---

## Task 2: Tauri Pet Window Creation (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs`

This creates the transparent pet window from Rust when the app starts. The window is hidden by default and will be shown when the user enables the setting.

- [ ] **Step 1: Add pet window creation in `lib.rs` setup block**

Inside the `setup` closure in `run()`, after the `#[cfg(target_os = "macos")]` tray icon block (after line 145 `}`), add:

```rust
            // === 创建桌面宠物窗口（默认隐藏）===
            {
                use tauri::{WebviewUrl, WebviewWindowBuilder};

                let _pet_window = WebviewWindowBuilder::new(
                    app,
                    "pet",
                    WebviewUrl::App("pet.html".into()),
                )
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .inner_size(120.0, 120.0)
                .resizable(false)
                .shadow(false)
                .visible(false)
                .build()
                .expect("Failed to create pet window");
            }
```

- [ ] **Step 2: Update capabilities to include pet window permissions**

Replace the content of `src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for main and pet windows",
  "windows": ["main", "pet"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-set-ignore-cursor-events",
    "core:window:allow-set-always-on-top",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-close",
    "core:window:allow-set-focus",
    "core:window:allow-inner-position",
    "core:window:allow-set-position",
    "opener:default",
    "notification:default"
  ]
}
```

- [ ] **Step 3: Verify Tauri builds**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri/src-tauri && cargo build`
Expected: Compiles without errors. The pet window is created but hidden.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: create transparent pet window in Rust setup"
```

---

## Task 3: Pet Window Event Handling (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs`

This adds event listeners so the pet window can communicate with the main window. The pet window emits `pet-clicked` to focus the main window, and `pet-dragged` to save its position.

- [ ] **Step 1: Add event listeners in `lib.rs` setup**

After the pet window creation block (after the `_pet_window` code), add these event listeners:

```rust
            // === 宠物窗口事件监听 ===
            let app_handle = app.handle().clone();
            app.listen("pet-clicked", move |_| {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });

            let app_handle_drag = app.handle().clone();
            app.listen("pet-dragged", move |event| {
                if let Some(payload) = event.payload().as_str() {
                    let _ = app_handle_drag
                        .state::<DbConnection>()
                        .0
                        .lock()
                        .map_err(|e| e.to_string())
                        .and_then(|conn| {
                            conn.execute(
                                "INSERT OR REPLACE INTO app_state (key, value) VALUES ('pet_position', ?)",
                                rusqlite::params![payload],
                            ).map_err(|e| e.to_string())
                        });
                }
            });
```

Add at the top of `lib.rs`, after the existing `use` statements:

```rust
use rusqlite::params;
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri/src-tauri && cargo build`
Expected: Compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add pet window event listeners for click and drag"
```

---

## Task 4: SVG Cat Components

**Files:**
- Create: `src/pet/components/CatIdle.tsx`
- Create: `src/pet/components/CatRunning.tsx`
- Create: `src/pet/components/CatPaused.tsx`
- Create: `src/pet/components/CatBreak.tsx`
- Create: `src/pet/styles.css`

Each component is an inline SVG with unique CSS animations. All cats share the same 64x64 viewBox and stroke style for visual consistency.

- [ ] **Step 1: Create `src/pet/styles.css`**

```css
/* Pet window styles */
html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* Cat container */
.pet-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  cursor: grab;
}

.pet-container:active {
  cursor: grabbing;
}

/* Timer text below cat */
.pet-timer {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* === Idle: tail wag === */
@keyframes tailWag {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
}

.cat-idle-tail {
  animation: tailWag 2s ease-in-out infinite;
  transform-origin: 32px 52px;
}

/* === Running: breathing === */
@keyframes breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.06); }
}

.cat-running-body {
  animation: breathe 2.5s ease-in-out infinite;
  transform-origin: center bottom;
}

/* === Paused: Zzz float === */
@keyframes zzzFloat {
  0% { opacity: 0; transform: translate(0, 0); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translate(5px, -12px); }
}

.cat-paused-zzz {
  animation: zzzFloat 2s ease-in-out infinite;
}

.cat-paused-zzz-delay {
  animation: zzzFloat 2s ease-in-out 0.7s infinite;
}

/* === Break: head turn === */
@keyframes headTurn {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
}

.cat-break-head {
  animation: headTurn 3s ease-in-out infinite;
}
```

- [ ] **Step 2: Create `src/pet/components/CatIdle.tsx`**

```tsx
export default function CatIdle() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear */}
      <path d="M18 28 L14 12 L26 22" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right ear */}
      <path d="M46 28 L50 12 L38 22" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Head */}
      <ellipse cx="32" cy="34" rx="16" ry="14" stroke="#333" strokeWidth="2.5" fill="none" />
      {/* Eyes */}
      <circle cx="26" cy="32" r="2" fill="#333" />
      <circle cx="38" cy="32" r="2" fill="#333" />
      {/* Nose */}
      <path d="M31 37 L32 38 L33 37" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Whiskers */}
      <line x1="16" y1="36" x2="24" y2="35" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="38" x2="24" y2="38" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="40" y1="35" x2="48" y2="36" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="40" y1="38" x2="48" y2="38" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="32" cy="52" rx="12" ry="8" stroke="#333" strokeWidth="2.5" fill="none" />
      {/* Tail (animated) */}
      <g className="cat-idle-tail">
        <path d="M44 52 Q54 48 52 40" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: Create `src/pet/components/CatRunning.tsx`**

```tsx
export default function CatRunning() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="cat-running-body">
        {/* Left ear */}
        <path d="M18 28 L14 12 L26 22" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Right ear */}
        <path d="M46 28 L50 12 L38 22" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Head */}
        <ellipse cx="32" cy="34" rx="16" ry="14" stroke="#333" strokeWidth="2.5" fill="none" />
        {/* Closed eyes (meditating) */}
        <path d="M23 32 Q26 29 29 32" stroke="#333" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M35 32 Q38 29 41 32" stroke="#333" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Nose */}
        <path d="M31 37 L32 38 L33 37" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Body */}
        <ellipse cx="32" cy="52" rx="12" ry="8" stroke="#333" strokeWidth="2.5" fill="none" />
        {/* Tail wrapped around */}
        <path d="M44 52 Q48 56 44 58" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Create `src/pet/components/CatPaused.tsx`**

```tsx
export default function CatPaused() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head (tilted) */}
      <ellipse cx="32" cy="26" rx="14" ry="12" stroke="#333" strokeWidth="2.5" fill="none" />
      {/* Left ear */}
      <path d="M20 20 L16 6 L28 16" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right ear */}
      <path d="M44 20 L48 6 L36 16" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Half-closed eyes */}
      <path d="M23 24 Q26 22 29 24" stroke="#333" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M35 24 Q38 22 41 24" stroke="#333" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <path d="M31 28 L32 29 L33 28" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Body lying down */}
      <ellipse cx="32" cy="42" rx="18" ry="8" stroke="#333" strokeWidth="2.5" fill="none" />
      {/* Tail */}
      <path d="M50 42 Q56 38 52 32" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Zzz floating text */}
      <text className="cat-paused-zzz" x="44" y="14" fill="#999" fontSize="10" fontFamily="sans-serif">z</text>
      <text className="cat-paused-zzz-delay" x="50" y="8" fill="#999" fontSize="8" fontFamily="sans-serif">z</text>
    </svg>
  );
}
```

- [ ] **Step 5: Create `src/pet/components/CatBreak.tsx`**

```tsx
export default function CatBreak() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear */}
      <path d="M18 26 L14 10 L26 20" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right ear */}
      <path d="M46 26 L50 10 L38 20" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g className="cat-break-head">
        {/* Head */}
        <ellipse cx="32" cy="32" rx="16" ry="14" stroke="#333" strokeWidth="2.5" fill="none" />
        {/* Big open eyes (alert) */}
        <circle cx="26" cy="30" r="3" fill="#333" />
        <circle cx="38" cy="30" r="3" fill="#333" />
        {/* Eye highlights */}
        <circle cx="27" cy="29" r="1" fill="#fff" />
        <circle cx="39" cy="29" r="1" fill="#fff" />
        {/* Nose */}
        <path d="M31 35 L32 36 L33 35" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Mouth (happy) */}
        <path d="M28 38 Q32 42 36 38" stroke="#333" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Whiskers */}
        <line x1="16" y1="34" x2="24" y2="33" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="16" y1="36" x2="24" y2="36" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="40" y1="33" x2="48" y2="34" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="40" y1="36" x2="48" y2="36" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* Body */}
      <ellipse cx="32" cy="50" rx="12" ry="8" stroke="#333" strokeWidth="2.5" fill="none" />
      {/* Front paws up (stretching) */}
      <path d="M22 48 L16 42" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M42 48 L48 42" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Tail up */}
      <path d="M44 50 Q52 46 50 38" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: No errors (components are valid TSX, CSS import will be resolved by Vite).

- [ ] **Step 7: Commit**

```bash
git add src/pet/components/ src/pet/styles.css
git commit -m "feat: add SVG cat components with CSS animations for all timer states"
```

---

## Task 5: Pet Window React Application

**Files:**
- Modify: `src/pet/main.tsx`
- Create: `src/pet/PetWindow.tsx`

This wires up the pet window: listens for Tauri events from the main window, renders the correct cat state, shows the timer countdown, handles dragging, click-through, and cat click → focus main window.

- [ ] **Step 1: Create `src/pet/PetWindow.tsx`**

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import CatIdle from "./components/CatIdle";
import CatRunning from "./components/CatRunning";
import CatPaused from "./components/CatPaused";
import CatBreak from "./components/CatBreak";
import "./styles.css";

type PetState = "idle" | "running" | "paused" | "break";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function PetWindow() {
  const [state, setState] = useState<PetState>("idle");
  const [remaining, setRemaining] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for timer events from main window
  useEffect(() => {
    const unlistenState = listen<{ state: PetState }>("timer-state", (event) => {
      setState(event.payload.state);
    });

    const unlistenTick = listen<{ remaining: number }>("timer-tick", (event) => {
      setRemaining(event.payload.remaining);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenTick.then((fn) => fn());
    };
  }, []);

  // Click-through: ignore cursor events when mouse is outside the cat area
  const handleMouseEnter = useCallback(async () => {
    await getCurrentWindow().setIgnoreCursorEvents(false);
  }, []);

  const handleMouseLeave = useCallback(async () => {
    await getCurrentWindow().setIgnoreCursorEvents(true);
  }, []);

  // Click cat → focus main window
  const handleClick = useCallback(async () => {
    await emit("pet-clicked");
  }, []);

  // Drag: start dragging on mousedown, save position on mouseup
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0) {
      await getCurrentWindow().startDragging();
    }
  }, []);

  const handleMouseUp = useCallback(async () => {
    try {
      const position = await getCurrentWindow().innerPosition();
      await emit("pet-dragged", { x: position.x, y: position.y });
    } catch {
      // Ignore errors if window position can't be read
    }
  }, []);

  // Render correct cat component
  const renderCat = () => {
    switch (state) {
      case "running":
        return <CatRunning />;
      case "paused":
        return <CatPaused />;
      case "break":
        return <CatBreak />;
      default:
        return <CatIdle />;
    }
  };

  const showTimer = state !== "idle";

  return (
    <div
      ref={containerRef}
      className="pet-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {renderCat()}
      {showTimer && <span className="pet-timer">{formatTime(remaining)}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/pet/main.tsx` to render PetWindow**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import PetWindow from "./PetWindow";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PetWindow />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/pet/main.tsx src/pet/PetWindow.tsx
git commit -m "feat: add PetWindow component with event listening, drag, and click-through"
```

---

## Task 6: Timer Store Event Emission

**Files:**
- Modify: `src/stores/timerStore.ts`

This makes the timer store emit Tauri events whenever the timer state or remaining seconds change, so the pet window can react.

- [ ] **Step 1: Add event emission helper to `timerStore.ts`**

Add this import at the top of `src/stores/timerStore.ts`, after the existing imports:

```ts
import { emit } from "@tauri-apps/api/event";
```

Add this helper function after the `updateTrayTitle` function:

```ts
// 向宠物窗口发送计时器状态
async function emitTimerState(state: TimerState, type: PomodoroType) {
  try {
    // Map timer state + type to pet state
    let petState: string = state;
    if (state === "running" && type === "break") {
      petState = "break";
    }
    await emit("timer-state", { state: petState });
  } catch {
    // Pet window may not exist
  }
}

async function emitTimerTick(remaining: number) {
  try {
    await emit("timer-tick", { remaining });
  } catch {
    // Pet window may not exist
  }
}
```

- [ ] **Step 2: Add emit calls to each timer action**

In the `start` action, after `updateTrayTitle("running", newSeconds, type);`, add:

```ts
    emitTimerState("running", type);
    emitTimerTick(newSeconds);
```

In the `pause` action, after `updateTrayTitle("paused", remainingSeconds, type);`, add:

```ts
    emitTimerState("paused", type);
```

In the `resume` action, after `updateTrayTitle("running", pausedRemainingSeconds, type);`, add:

```ts
    emitTimerState("running", type);
    emitTimerTick(pausedRemainingSeconds);
```

In the `stop` action, after `updateTrayTitle("idle", initialSeconds, "focus");`, add:

```ts
    emitTimerState("idle", "focus");
```

In the `switchToBreak` action, after `updateTrayTitle("running", breakSeconds, "break");`, add:

```ts
    emitTimerState("running", "break");
    emitTimerTick(breakSeconds);
```

In the `prepareBreakMode` action, after `updateTrayTitle("idle", breakSeconds, "break");`, add:

```ts
    emitTimerState("idle", "break");
```

In the `switchToFocus` action, after `updateTrayTitle("idle", focusSeconds, "focus");`, add:

```ts
    emitTimerState("idle", "focus");
```

In the `tick` action, after `updateTrayTitle("running", remaining, type);` (inside the if block), add:

```ts
      emitTimerTick(remaining);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/timerStore.ts
git commit -m "feat: emit Tauri events from timer store for pet window sync"
```

---

## Task 7: Database Migration — `show_desktop_pet` Field

**Files:**
- Modify: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src/types/index.ts`
- Modify: `src/stores/userStore.ts`

This adds the `show_desktop_pet` boolean to the user config so the pet can be toggled from settings.

- [ ] **Step 1: Add migration in `db.rs`**

After the last `let _ = conn.execute(...)` migration line in `init_db` (line 86), add:

```rust
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN show_desktop_pet INTEGER NOT NULL DEFAULT 0", []);
```

Add `show_desktop_pet` field to the `UserConfig` struct:

```rust
pub show_desktop_pet: bool,
```

- [ ] **Step 2: Update `get_user_config` query in `commands.rs`**

Add `COALESCE(show_desktop_pet, 0)` to the SELECT query (after the `COALESCE(auto_launch, 0)` column), and add the corresponding `row.get(...)` in the mapping. The row index for the new column will be 11 (0-indexed).

Update the SELECT in `get_user_config` to:

```sql
SELECT id, focus_duration, break_duration, enable_notifications,
       enable_sound, theme, updated_at,
       COALESCE(long_break_duration, 15),
       COALESCE(auto_start, 0),
       COALESCE(daily_goal, 8),
       COALESCE(auto_launch, 0),
       COALESCE(show_desktop_pet, 0)
       FROM user_config WHERE id = 1
```

Add to the `UserConfig` construction:

```rust
show_desktop_pet: row.get(11)?,
```

- [ ] **Step 3: Update `update_user_config` in `commands.rs`**

Add `show_desktop_pet` parameter to the function signature:

```rust
pub fn update_user_config(
    app: AppHandle,
    focus_duration: Option<i32>,
    break_duration: Option<i32>,
    enable_notifications: Option<bool>,
    enable_sound: Option<bool>,
    theme: Option<String>,
    long_break_duration: Option<i32>,
    auto_start: Option<bool>,
    daily_goal: Option<i32>,
    auto_launch: Option<bool>,
    show_desktop_pet: Option<bool>,
) -> Result<UserConfig, String> {
```

Add the param handling block (after the `auto_launch` block, before `set_parts.push("updated_at = ...)`):

```rust
        if let Some(s) = show_desktop_pet {
            set_parts.push("show_desktop_pet = ?");
            params.push(if s { "1".to_string() } else { "0".to_string() });
        }
```

- [ ] **Step 4: Update TypeScript type in `src/types/index.ts`**

Add `showDesktopPet` to the `UserConfig` interface:

```ts
export interface UserConfig {
  id: number;
  focusDuration: number;
  breakDuration: number;
  enableNotifications: boolean;
  enableSound: boolean;
  theme: "light" | "dark" | "auto";
  updatedAt: string;
  longBreakDuration: number;
  autoStart: boolean;
  dailyGoal: number;
  autoLaunch: boolean;
  showDesktopPet: boolean;
}
```

- [ ] **Step 5: Update `userStore.ts` to pass `showDesktopPet`**

In the `updateConfig` function, add the parameter to the invoke call:

```ts
      showDesktopPet: updates.showDesktopPet,
```

- [ ] **Step 6: Verify everything compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri/src-tauri && cargo build`
Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: Both compile without errors.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/commands.rs src/types/index.ts src/stores/userStore.ts
git commit -m "feat: add show_desktop_pet field to user config"
```

---

## Task 8: Settings Page — Desktop Pet Toggle

**Files:**
- Modify: `src/pages/Settings.tsx`

This adds a new card in the Settings page with a toggle to show/hide the desktop pet.

- [ ] **Step 1: Add desktop pet section to Settings**

Add the following card section in `src/pages/Settings.tsx`, between the "通知与提醒" card (ending at the `})` around line 266) and the "外观主题" card. Add this after line 266:

```tsx
      {/* 桌面宠物 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🐱</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>桌面宠物</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>在桌面上显示一只小猫咪，跟随番茄钟状态变化</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>显示桌面宠物</div>
            <div style={{ fontSize: '12px', color: '#999' }}>快捷键 Cmd+Shift+P 切换</div>
          </div>
          <button
            onClick={() => updateConfig({ showDesktopPet: !config.showDesktopPet })}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: config.showDesktopPet ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: config.showDesktopPet ? '29px' : '3px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}></span>
          </button>
        </div>
      </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add desktop pet toggle section to Settings page"
```

---

## Task 9: Pet Window Show/Hide Logic (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands.rs`

This implements the actual show/hide logic: when `show_desktop_pet` changes in user config, show or hide the pet window. Also adds a Tauri command to toggle the pet and restores saved position.

- [ ] **Step 1: Add `toggle_pet_window` command in `commands.rs`**

Add this new command at the end of `commands.rs`:

```rust
// 切换桌面宠物窗口显示/隐藏
#[tauri::command]
pub fn toggle_pet_window(app: AppHandle, show: bool) -> Result<(), String> {
    if let Some(pet_window) = app.get_webview_window("pet") {
        if show {
            // 尝试恢复保存的位置
            let saved_pos = {
                let db_guard = app.state::<DbConnection>();
                let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
                conn.query_row(
                    "SELECT value FROM app_state WHERE key = 'pet_position'",
                    [],
                    |row| row.get::<_, String>(0),
                ).ok()
            };

            if let Some(pos_json) = saved_pos {
                if let Ok(pos) = serde_json::from_str::<serde_json::Value>(&pos_json) {
                    if let (Some(x), Some(y)) = (pos["x"].as_f64(), pos["y"].as_f64()) {
                        let _ = pet_window.set_position(tauri::Position::Logical(
                            tauri::LogicalPosition::new(x, y)
                        ));
                    }
                }
            }

            let _ = pet_window.show();
            let _ = pet_window.set_ignore_cursor_events(true);
        } else {
            let _ = pet_window.hide();
        }
    }
    Ok(())
}
```

- [ ] **Step 2: Register the new command in `lib.rs`**

Add `commands::toggle_pet_window` to the `invoke_handler![]` macro in `lib.rs`:

```rust
        .invoke_handler(tauri::generate_handler![
            // 任务相关
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            // 配置相关
            commands::get_user_config,
            commands::update_user_config,
            // 记录相关
            commands::record_pomodoro,
            commands::get_stats,
            commands::clear_pomodoro_records,
            // 状态相关
            commands::get_state,
            commands::set_state,
            // 菜单栏相关
            commands::update_tray_title,
            // 桌面宠物相关
            commands::toggle_pet_window,
        ])
```

- [ ] **Step 3: Verify Rust compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri/src-tauri && cargo build`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/commands.rs
git commit -m "feat: add toggle_pet_window command with position restore"
```

---

## Task 10: Wire Settings Toggle to Pet Window

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/stores/userStore.ts`

When the user toggles the desktop pet setting, we need to call `toggle_pet_window` to show/hide the pet window.

- [ ] **Step 1: Update Settings page to invoke `toggle_pet_window`**

In `src/pages/Settings.tsx`, update the desktop pet toggle button's `onClick` to also call `toggle_pet_window`:

Change:
```tsx
onClick={() => updateConfig({ showDesktopPet: !config.showDesktopPet })}
```

To:
```tsx
onClick={async () => {
  const newValue = !config.showDesktopPet;
  await updateConfig({ showDesktopPet: newValue });
              invoke("toggle_pet_window", { show: newValue });
            }}
```

Make sure `invoke` is already imported at the top of Settings.tsx (it is: line 2).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: wire Settings toggle to show/hide pet window"
```

---

## Task 11: Manual Smoke Test

This task verifies the entire feature works end-to-end.

- [ ] **Step 1: Start Tauri dev**

Run: `cd /Users/fangjunqiang/ai-workspace/WeChatProjects/pomodoro-cat-tauri && npm run tauri dev`
Expected: App launches. Main window shows. No pet window visible yet.

- [ ] **Step 2: Enable desktop pet in Settings**

Navigate to Settings page. Toggle "显示桌面宠物" to ON.
Expected: A small transparent window with a line-art cat appears on screen. Cat shows idle state with tail wagging.

- [ ] **Step 3: Start a pomodoro timer**

Go to Timer page. Start a focus session.
Expected: Pet window cat switches to meditating/breathing animation. Timer text appears below the cat showing countdown.

- [ ] **Step 4: Test pause**

Pause the timer.
Expected: Cat switches to lying down with Zzz animation.

- [ ] **Step 5: Test resume and break**

Resume the timer. Wait for focus session to end (or use test mode for 1-minute sessions).
Expected: Cat switches to alert/happy state during break with timer text.

- [ ] **Step 6: Test drag**

Drag the pet window to a different screen position.
Expected: Pet window is draggable. After releasing, position is saved.

- [ ] **Step 7: Test click-through**

Move mouse to transparent area around the cat.
Expected: Clicks pass through to desktop (can click desktop icons through transparent area).

- [ ] **Step 8: Test click cat**

Click on the cat.
Expected: Main window is focused and brought to front.

- [ ] **Step 9: Test toggle off**

Go to Settings. Toggle "显示桌面宠物" to OFF.
Expected: Pet window disappears.

- [ ] **Step 10: Test toggle on again**

Toggle "显示桌面宠物" to ON again.
Expected: Pet window reappears at the saved position.

- [ ] **Step 11: Final commit**

```bash
git add -A
git commit -m "feat: complete desktop pet feature - transparent floating cat window"
```
