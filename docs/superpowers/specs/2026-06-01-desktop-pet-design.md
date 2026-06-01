# Desktop Pet Design Spec

Date: 2026-06-01
Status: Approved

## Overview

Add a desktop floating pet feature to the Pomodoro Cat app. A small, transparent, always-on-top window displays a simple line-art (SVG) cat that reacts to pomodoro timer states. The pet serves as a gentle visual focus reminder without requiring the main window to be open.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pet form | Desktop floating window | True desktop pet experience; Tauri 2 supports transparent windows natively |
| Art style | Simple line-art (SVG) | Vector-scalable, small file size, easy to animate with CSS |
| Behavior | Minimal mode | Cat acts as a timer visual indicator; no feeding/petting interactions |
| Size | 64px cat in 120x120 window | Compact, non-intrusive, like a desktop widget |
| Technical approach | Independent transparent window (Approach A) | Real floating experience; state sync via Tauri events |

## Window Architecture

### Dual Window Structure

- **Main window** (`"main"`): Existing 800x600 application window (Timer, Tasks, Cat, Stats, Settings)
- **Pet window** (`"pet"`): Transparent overlay window, always on top

### Pet Window Configuration

| Property | Value | Notes |
|----------|-------|-------|
| label | `"pet"` | Window identifier |
| size | 120x120 | Contains cat SVG + timer text |
| transparent | `true` | Transparent background (requires `macos-private-api`) |
| decorations | `false` | Frameless |
| alwaysOnTop | `true` | Always above other windows |
| skipTaskbar | `true` | Hidden from taskbar |
| shadow | `false` | No shadow (required for transparent overlay) |
| visibleOnAllWorkspaces | `true` | Visible on all macOS desktops |
| default visible | `false` | Hidden by default; user enables in settings |

### Window Lifecycle

- **App launch**: Pet window hidden by default. Created and shown only when user enables the feature in Settings.
- **Main window closed**: Pet window stays visible; timer continues running.
- **App exit**: Both windows close together.
- **Position memory**: Store last position in `app_state` table; restore on next launch.

### Inter-Window Communication

State sync via Tauri event system:

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `timer-tick` | Main/Background → Pet | `{ remaining }` | Update countdown display |
| `timer-state` | Main/Background → Pet | `{ state: "idle" \| "running" \| "paused" \| "break" }` | Switch cat animation |
| `pet-config` | Main → Pet | `{ show, ... }` | Update pet settings |
| `pet-clicked` | Pet → Main | — | Focus/show main window |
| `pet-dragged` | Pet → Background | `{ x, y }` | Save new position |

## Cat Visual Design

### States and Animations

Four core states matching timer states:

| Timer State | Cat Behavior | Animation | Loop |
|-------------|-------------|-----------|------|
| Idle | Cat sitting, occasionally wagging tail | SVG tail transform | Loop |
| Running (Focus) | Cat meditating with closed eyes, gentle breathing | SVG body scale (breathing) | Loop |
| Break | Cat alert, stretching, looking around | SVG body stretch + head turn | Loop |
| Paused | Cat lying down, eyes half-closed, Z floating up | SVG body position + Z opacity | Loop |

### Animation Implementation

- Each state is a React component: `<CatIdle />`, `<CatRunning />`, `<CatPaused />`, `<CatBreak />`
- Animations via CSS `@keyframes` controlling SVG `transform`, `opacity`
- State transitions use CSS `transition` for smooth morphing
- No sprite sheets or frame-by-frame animation

### Pet Window Layout

```
┌──────────────────────┐
│                      │  120x120 transparent area
│      [SVG Cat]       │  ~64x64 line-art cat
│       24:00          │  12px grey countdown text
│                      │
└──────────────────────┘
```

- Cat area (top portion): draggable region
- Click cat: focus main window
- Timer text: shown only during active timer states (running/paused/break); hidden when idle
- Text style: 12px, gray color, below the cat SVG

### Click-Through Behavior

- Transparent areas: mouse events pass through to desktop (`setIgnoreCursorEvents(true)`)
- Cat area: captures mouse events for drag/click
- Toggle via `mouseenter`/`mouseleave` on the cat SVG element

## Settings Integration

### New Settings Section

Added to existing Settings page (`/settings`):

```
Desktop Pet Section:
  - Show desktop pet: [toggle switch]
  - Position: remembered from last session
  - Shortcut: Cmd+Shift+P to toggle show/hide
```

### Storage

- `show_desktop_pet`: New boolean field in `user_config` table, default `false`
- Pet window position: Stored in `app_state` table as JSON `{ x, y }`

### Global Shortcut

- `Cmd+Shift+P` (macOS): Toggle pet window visibility
- Registered via Tauri's global shortcut API

## Data Flow

```
Timer Page ──timerStore──→ Tauri Events ──→ Pet Window
    │                                          │
    │ invoke()                            emit("pet-clicked")
    ▼                                          │
commands.rs ──position save──→ app_state   Focus Main Window
    │
    └──event forward──→ Pet Window
```

### Flows

1. **Timer state change**: `timerStore` emits `timer-state` event → pet window switches cat animation
2. **Timer tick (every second)**: emits `timer-tick` event → pet window updates time display
3. **Cat clicked**: pet window emits `pet-clicked` → Rust side shows/focuses main window
4. **Cat dragged**: pet window calls `invoke('set_state')` on `mouseup` to save position to `app_state`
5. **Pet toggled in Settings**: Settings page invokes update to `user_config` → Rust side creates/destroys pet window

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `pet.html` | HTML entry point for pet window (Vite multi-page) |
| `src/pet/main.tsx` | Pet window React entry point |
| `src/pet/PetWindow.tsx` | Pet window root component |
| `src/pet/components/CatIdle.tsx` | Idle state SVG cat |
| `src/pet/components/CatRunning.tsx` | Focus/running state SVG cat |
| `src/pet/components/CatPaused.tsx` | Paused state SVG cat |
| `src/pet/components/CatBreak.tsx` | Break state SVG cat |
| `src/pet/styles.css` | Pet window CSS (animations, transparent background) |

### Modified Files

| File | Changes |
|------|---------|
| `src-tauri/src/lib.rs` | Pet window creation logic, event forwarding, global shortcut |
| `src-tauri/src/commands.rs` | Pet window management commands (show/hide/toggle) |
| `src-tauri/src/db.rs` | `user_config` add `show_desktop_pet` field |
| `src-tauri/capabilities/default.json` | Add `pet` window, window permissions |
| `src/stores/timerStore.ts` | Add Tauri event emit on state changes and ticks |
| `src/pages/Settings.tsx` | Desktop pet toggle section |
| `vite.config.ts` | Multi-page app config (rollup input for `pet.html`) |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User hasn't enabled pet | No window created, no event listeners, zero overhead |
| User closes pet window | Setting syncs to "off", no auto-rebuild |
| Main window minimized | Pet stays visible, timer continues |
| System sleep/wake | Pet position preserved, time synced via timerStore (timestamp-based) |
| Multi-monitor setup | Pet remembers which display + position, restores to original |
| Position out of bounds | On startup, check if saved position is within current screen bounds; reset to bottom-right corner if invalid |

## Out of Scope (YAGNI)

These features are explicitly excluded from this iteration:

- Multiple cats / skin selection
- Cat walking around / random movement
- Feeding / petting interactions
- Cat sound effects
- Windows/Linux-specific adaptations (macOS only for now)
- Cat level affecting pet appearance
- Customizable shortcut keys

## Future Extensions (Not in Scope)

- Different cat line-art styles per level
- Occasional random micro-animations (yawning, ear twitch)
- Customizable shortcuts
- Windows/Linux support
- Skin/theme selection for the cat
