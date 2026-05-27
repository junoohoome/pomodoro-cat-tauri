# Menu Bar Timer Display Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix macOS menu bar to display countdown timer (🍅 24:00) during pomodoro sessions and cat logo (🐱) when idle, replacing the current static display.

**Architecture:** Use `Arc<AppHandle>` to maintain global tray icon state, with remove-and-recreate strategy to work around Tauri 2's TrayIcon ownership limitations. Every second during countdown, remove old tray icon and create new one with updated time display.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, Zustand state management

---

## File Structure

**Modified Files:**
- `src-tauri/src/lib.rs` - Replace placeholder TrayIconState with Arc<AppHandle> implementation
- `src-tauri/src/commands.rs` - Implement actual update_tray_title logic
- `src-tauri/src/main.rs` - Update imports for new TrayIconState
- `src/stores/timerStore.ts` - Update pause state title logic

**New File:** None (all changes are to existing files)

---

## Chunk 1: Core TrayIconState Implementation

### Task 1: Replace TrayIconState structure in lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs:12-24`

- [ ] **Step 1: Remove placeholder TrayIconState**

Delete the current placeholder implementation:
```rust
// DELETE lines 12-24
// TrayIconState 全局状态定义
#[cfg(target_os = "macos")]
use tauri::tray::TrayIcon;

#[derive(Clone)]
pub struct TrayIconState;

#[cfg(target_os = "macos")]
impl TrayIconState {
    pub fn get() -> Option<TrayIcon> {
        None // 占位，实际通过其他方式获取
    }
}
```

- [ ] **Step 2: Add new TrayIconState implementation**

Add at line 12 (after `mod db;`):
```rust
// TrayIconState 全局状态管理
#[derive(Clone)]
pub struct TrayIconState(pub Arc<AppHandle>);

#[cfg(target_os = "macos")]
impl TrayIconState {
    pub fn new(app: &AppHandle) -> Self {
        Self(app.clone())
    }
    
    /// 更新菜单栏显示（移除旧的，创建新的）
    pub fn update_tray(&self, title: &str) {
        let app = self.0.clone();
        
        // 移除旧的 tray icon
        let _ = app.remove_tray_by_id("main-tray");
        
        // 创建新的 tray icon（带新标题）
        if let Err(e) = self.create_tray_icon(&app, title) {
            eprintln!("Failed to create tray icon: {}", e);
        }
    }
    
    #[cfg(target_os = "macos")]
    fn create_tray_icon(&self, app: &AppHandle, title: &str) -> Result<(), String> {
        use tauri::tray::{TrayIconBuilder, TrayIconEvent};
        use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
        
        // 重新创建菜单
        let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let hide_item = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let sep1 = PredefinedMenuItem::separator(app)
            .map_err(|e| e.to_string())?;
        let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
            .map_err(|e| e.to_string())?;
        
        let menu = Menu::with_items(app, &[&show_item, &hide_item, &sep1, &quit_item])
            .map_err(|e| e.to_string())?;
        
        let _tray = TrayIconBuilder::new()
            .id("main-tray")
            .menu(&menu)
            .menu_on_left_click(false)
            .title(title)
            .build(app)
            .map_err(|e| e.to_string())?;
        
        // 重新绑定事件监听器
        let app_handle = app.clone();
        app.on_tray_icon_event(move |_tray_id, event| {
            match event {
                TrayIconEvent::Click {
                    id: _,
                    position: _,
                    rect: _,
                    button,
                    button_state: _,
                } => {
                    if button == tauri::tray::MouseButton::Left {
                        let window = app_handle.get_webview_window("main").unwrap();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        });
        
        app.on_menu_event(move |_window, event| {
            match event.id.0.as_str() {
                "show" => {
                    let window = app_handle.get_webview_window("main").unwrap();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                "hide" => {
                    let window = app_handle.get_webview_window("main").unwrap();
                    let _ = window.hide();
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        });
        
        Ok(())
    }
}
```

- [ ] **Step 3: Update lib.rs imports**

Add to the imports section (around line 9):
```rust
use std::sync::{Arc, Mutex};
```

- [ ] **Step 4: Verify compilation**

Run: `cd src-tauri && cargo check`

Expected: No compilation errors, possibly warnings about unused imports

- [ ] **Step 5: Commit changes**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: implement TrayIconState with Arc<AppHandle>"
```

---

### Task 2: Register TrayIconState in app setup

**Files:**
- Modify: `src-tauri/src/lib.rs:26-130`

- [ ] **Step 1: Find the tray icon creation code**

Locate the macOS tray icon creation block in the `setup` function (around line 47-128)

- [ ] **Step 2: Create TrayIconState instance before tray creation**

Add before the macOS section (before line 47):
```rust
// 创建全局 TrayIconState
let tray_state = TrayIconState::new(app);
```

- [ ] **Step 3: Replace tray icon creation logic**

Replace the entire macOS tray section (lines 47-128) with:

```rust
// === 创建菜单栏 ===
#[cfg(target_os = "macos")]
{
    use tauri::tray::{TrayIconBuilder, TrayIconEvent};
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    
    // 创建初始菜单栏图标
    if let Err(e) = tray_state.create_tray_icon(app, "🐱") {
        eprintln!("Failed to create initial tray icon: {}", e);
    }
    
    // 注册到 app state
    app.manage(tray_state);
}
```

- [ ] **Step 4: Remove old event listeners**

Delete the old event listener code (lines 81-127) since we now handle this in `create_tray_icon`

- [ ] **Step 5: Test compilation**

Run: `cd src-tauri && cargo check`

Expected: Compiles successfully, maybe unused variable warnings

- [ ] **Step 6: Commit changes**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: register TrayIconState and recreate tray icon creation"
```

---

### Task 3: Implement update_tray_title command

**Files:**
- Modify: `src-tauri/src/commands.rs:407-418`

- [ ] **Step 1: Update command signature**

Replace the current `update_tray_title` function:

```rust
// 更新菜单栏标题（显示计时时间或恢复图标）
#[tauri::command]
pub fn update_tray_title(state: State<TrayIconState>, title: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        state.update_tray(&title);
    }
    Ok(())
}
```

- [ ] **Step 2: Add TrayIconState import**

Add to the imports section at the top of `commands.rs` (around line 8):
```rust
use crate::lib::TrayIconState;
```

- [ ] **Step 3: Test command compilation**

Run: `cd src-tauri && cargo check`

Expected: No compilation errors

- [ ] **Step 4: Commit changes**

```bash
git add src-tauri/src/commands.rs
git commit -m "feat: implement update_tray_title command with state management"
```

---

## Chunk 2: Frontend Integration

### Task 4: Update timerStore title logic

**Files:**
- Modify: `src/stores/timerStore.ts:12-29`

- [ ] **Step 1: Update updateTrayTitle function**

Modify the `updateTrayTitle` function (lines 13-29):

```typescript
async function updateTrayTitle(state: TimerState, remainingSeconds: number, type: PomodoroType) {
  try {
    let title = "🐱"; // 默认显示猫咪logo

    if (state === "running") {
      const timeStr = formatTime(remainingSeconds);
      const emoji = type === "focus" ? "🍅" : "☕";
      title = `${emoji} ${timeStr}`;
    } else if (state === "paused") {
      const timeStr = formatTime(remainingSeconds);
      title = `⏸️ ${timeStr}`;
    }

    await invoke("update_tray_title", { title });
  } catch (e) {
    // macOS only - ignore errors on other platforms
    console.warn('Tray update failed:', e);
  }
}
```

- [ ] **Step 2: Test TypeScript compilation**

Run: `npm run build` or `npx tsc --noEmit`

Expected: No TypeScript errors

- [ ] **Step 3: Commit changes**

```bash
git add src/stores/timerStore.ts
git commit -m "fix: update timerStore title logic for pause state"
```

---

## Chunk 3: Testing and Validation

### Task 5: Manual functionality testing

**Files:**
- Test: Application functionality

- [ ] **Step 1: Run development mode**

Run: `npm run tauri dev`

Expected: Application starts without errors

- [ ] **Step 2: Test idle state**

Check: Menu bar shows 🐱 cat logo

Expected: Menu bar displays cat logo emoji

- [ ] **Step 3: Test timer start**

Click: "开始专注" button

Check: Menu bar changes to 🍅 25:00

Expected: Menu bar displays focus emoji + time

- [ ] **Step 4: Verify countdown updates**

Wait: 10 seconds

Check: Menu bar time updates every second

Expected: Menu bar shows 🍅 24:59 → 🍅 24:58 → ...

- [ ] **Step 5: Test pause functionality**

Click: "暂停" button

Check: Menu bar shows ⏸️ with current time

Expected: Menu bar displays pause emoji + time

- [ ] **Step 6: Test resume functionality**

Click: "继续" button

Check: Menu bar returns to countdown mode

Expected: Menu bar resumes countdown display

- [ ] **Step 7: Test completion**

Wait: For timer to complete (or click "放弃")

Check: Menu bar returns to 🐱 cat logo

Expected: Menu bar returns to idle state display

- [ ] **Step 8: Test break mode**

Start: A break session

Check: Menu bar shows ☕ emoji + break time

Expected: Menu bar displays break emoji + time

---

### Task 6: Performance monitoring

**Files:**
- Test: System performance

- [ ] **Step 1: Monitor CPU usage during countdown**

Run: Activity Monitor → CPU usage

Check: CPU usage during active countdown

Expected: CPU usage stays reasonable (< 10%)

- [ ] **Step 2: Monitor memory usage**

Run: Activity Monitor → Memory usage

Check: Memory usage over 5-minute countdown

Expected: No significant memory leaks

- [ ] **Step 3: Test menu bar responsiveness**

Interact: Quickly click through different states

Check: Menu bar updates without lag

Expected: Updates feel responsive (< 100ms delay)

- [ ] **Step 4: Test extended runtime**

Run: Timer for full 25-minute cycle

Check: Application remains stable

Expected: No crashes or performance degradation

- [ ] **Step 5: Verify no duplicate tray icons**

Check: System menu bar area

Expected: Only one tray icon visible at any time

---

### Task 7: Edge cases and error handling

**Files:**
- Test: Error scenarios

- [ ] **Step 1: Test rapid state changes**

Action: Quickly click Start → Pause → Resume → Stop

Check: Application handles rapid updates gracefully

Expected: No crashes, updates complete successfully

- [ ] **Step 2: Test app minimization**

Action: Start timer, minimize app, wait 10 seconds

Check: Menu bar continues to update

Expected: Menu bar updates work when app is minimized

- [ ] **Step 3: Test window close vs quit**

Action: Close main window (don't quit), check menu bar

Check: Menu bar remains functional

Expected: Menu bar still works without main window

- [ ] **Step 4: Test error scenarios**

Action: Simulate tray icon creation failure

Check: Application continues to function

Expected: Main timer functionality not affected

- [ ] **Step 5: Test break mode switching**

Action: Switch between focus and break modes multiple times

Check: Menu bar updates correctly for each mode

Expected: Emoji changes between 🍅 and ☕

---

## Chunk 4: Production Build and Final Validation

### Task 8: Build production version

**Files:**
- Build: Production application

- [ ] **Step 1: Clean previous build artifacts**

Run: `cd src-tauri && cargo clean`

Expected: Build cache cleared

- [ ] **Step 2: Build production version**

Run: `npm run tauri build`

Expected: Build completes without errors

- [ ] **Step 3: Verify app bundle was created**

Run: `ls -la src-tauri/target/release/bundle/macos/`

Check: `pomodoro-cat-tauri.app` exists

Expected: Application bundle created successfully

- [ ] **Step 4: Open production app**

Run: `open src-tauri/target/release/bundle/macos/pomodoro-cat-tauri.app`

Expected: Production app launches

---

### Task 9: Production app testing

**Files:**
- Test: Production application

- [ ] **Step 1: Verify menu bar icon in production**

Check: Menu bar shows correct icon

Expected: Production app menu bar works correctly

- [ ] **Step 2: Test full countdown cycle**

Action: Start 25-minute focus session

Check: Menu bar updates for entire duration

Expected: Consistent updates throughout full cycle

- [ ] **Step 3: Test app quit and restart**

Action: Quit app completely, restart

Check: Menu bar icon appears/disappears correctly

Expected: Clean startup and shutdown

- [ ] **Step 4: Verify notification integration**

Action: Complete a pomodoro session

Check: Both menu bar and notification work

Expected: Both features work together without conflict

---

### Task 10: Documentation and cleanup

**Files:**
- Modify: Documentation files

- [ ] **Step 1: Update CLAUDE.md**

Update the macOS menu bar section in `CLAUDE.md` (around line 43):

Add after "Title updates": 
```markdown
**菜单栏时间显示**：计时过程中显示剩余时间（🍅 24:00），空闲时显示猫咪logo（🐱）
```

- [ ] **Step 2: Update README if needed**

Check if README mentions menu bar features

- [ ] **Step 3: Add inline code comments**

Add comments explaining the remove-and-recreate strategy in `create_tray_icon`

- [ ] **Step 4: Commit documentation updates**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update menu bar timer display documentation"
```

---

## Chunk 5: Performance Optimization

### Task 11: Add deduplication logic (if needed)

**Files:**
- Modify: `src/stores/timerStore.ts`

- [ ] **Step 1: Add title tracking**

Add to TimerStore interface:
```typescript
interface TimerStore {
  // ... existing fields ...
  lastTrayTitle: string;
  setLastTrayTitle: (title: string) => void;
}
```

- [ ] **Step 2: Implement deduplication in create**

Add to the store creation:
```typescript
lastTrayTitle: "",

setLastTrayTitle: (title: string) => set({ lastTrayTitle: title }),
```

- [ ] **Step 3: Update updateTrayTitle to check for changes**

Modify the function to avoid unnecessary tray updates:
```typescript
async function updateTrayTitle(state: TimerState, remainingSeconds: number, type: PomodoroType) {
  try {
    let title = "🐱";

    if (state === "running") {
      const timeStr = formatTime(remainingSeconds);
      const emoji = type === "focus" ? "🍅" : "☕";
      title = `${emoji} ${timeStr}`;
    } else if (state === "paused") {
      const timeStr = formatTime(remainingSeconds);
      title = `⏸️ ${timeStr}`;
    }

    // Only update if title actually changed
    if (title !== lastTrayTitle) {
      await invoke("update_tray_title", { title });
      setLastTrayTitle(title);
    }
  } catch (e) {
    console.warn('Tray update failed:', e);
  }
}
```

- [ ] **Step 4: Test optimization**

Run: `npm run tauri dev`

Check: Menu bar still updates correctly

Expected: Same functionality with fewer tray recreations

- [ ] **Step 5: Commit optimization**

```bash
git add src/stores/timerStore.ts
git commit -m "perf: add title deduplication to reduce tray updates"
```

---

## Implementation Notes

### Testing Requirements

**Manual Testing Checklist:**
- [ ] Application starts without errors
- [ ] Menu bar shows 🐱 when idle
- [ ] Menu bar shows 🍅 24:00 during focus countdown
- [ ] Menu bar shows ☕ 05:00 during break countdown  
- [ ] Menu bar shows ⏸️ 24:00 when paused
- [ ] Menu bar updates every second during countdown
- [ ] Menu bar returns to 🐱 when timer completes or is stopped
- [ ] No duplicate tray icons in menu bar
- [ ] App remains stable during 25-minute countdown
- [ ] No memory leaks during extended use

**Performance Benchmarks:**
- CPU usage during countdown: < 10%
- Memory usage: No upward trend over time
- Menu bar update latency: < 200ms

### Known Limitations

1. **Recreation Overhead**: Every second we remove and recreate the tray icon. This is necessary due to Tauri 2's ownership model but has performance implications.

2. **macOS Only**: This feature is macOS-specific and uses `#[cfg(target_os = "macos")]` conditional compilation.

3. **API Uncertainty**: The `remove_tray_by_id` API availability in Tauri 2.10.1 needs verification during implementation.

4. **Event Listener Persistence**: Event listeners need to be rebound on each tray icon recreation, which adds complexity.

### Rollback Plan

If the recreation approach causes issues:
1. **Fallback to static display**: Keep menu bar as 🐱 at all times
2. **Reduce update frequency**: Update every 5-10 seconds instead of every second
3. **Use alternative notification method**: Rely more on in-app display and system notifications

### Success Criteria

- ✅ Menu bar displays correct emoji/title for each state
- ✅ Updates occur smoothly without visual glitches
- ✅ Performance is acceptable (CPU < 10%, no memory leaks)
- ✅ All timer states (idle, running, paused, completed) work correctly
- ✅ Application remains stable during extended use
- ✅ Production build works as expected