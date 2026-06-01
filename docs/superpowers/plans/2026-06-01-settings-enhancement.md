# Settings Page Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 features to the Settings page: sidebar entry, long break + auto-start, daily goal, data management (export/import/clear), and auto-launch with minimize to tray.

**Architecture:** Extend the existing `user_config` table with 4 new columns. Timer store tracks consecutive pomodoro count for long break logic. New Rust commands for data export/import. Tauri plugins for autostart and file dialogs.

**Tech Stack:** Rust + rusqlite + tauri-plugin-autostart + tauri-plugin-dialog (backend), React 19 + TypeScript (frontend)

---

### Task 1: Extend config fields - Rust backend

**Files:**
- Modify: `src-tauri/src/db.rs` (UserConfig struct + init_db)
- Modify: `src-tauri/src/commands.rs` (get_user_config + update_user_config)

- [ ] **Step 1: Add ALTER TABLE statements to `init_db` in `db.rs`**

After the existing `INSERT OR IGNORE INTO user_config` line in `init_db`, add:

```rust
    // 迁移：添加新配置字段（忽略已存在的列）
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN long_break_duration INTEGER NOT NULL DEFAULT 15", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN auto_start INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 8", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN auto_launch INTEGER NOT NULL DEFAULT 0", []);
```

- [ ] **Step 2: Extend `UserConfig` struct in `db.rs`**

Add 4 new fields to the existing `UserConfig` struct:

```rust
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserConfig {
    pub id: i64,
    pub focus_duration: i32,
    pub break_duration: i32,
    pub enable_notifications: bool,
    pub enable_sound: bool,
    pub theme: String,
    pub updated_at: String,
    pub long_break_duration: i32,
    pub auto_start: bool,
    pub daily_goal: i32,
    pub auto_launch: bool,
}
```

- [ ] **Step 3: Extend `get_user_config` query in `commands.rs`**

Update the SQL query and row mapping. Find the `get_user_config` function and replace its entire body with:

```rust
pub fn get_user_config(app: AppHandle) -> Result<UserConfig, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let config = conn.query_row(
        "SELECT id, focus_duration, break_duration, enable_notifications,
         enable_sound, theme, updated_at,
         COALESCE(long_break_duration, 15),
         COALESCE(auto_start, 0),
         COALESCE(daily_goal, 8),
         COALESCE(auto_launch, 0)
         FROM user_config WHERE id = 1",
        [],
        |row| Ok(UserConfig {
            id: row.get(0)?,
            focus_duration: row.get(1)?,
            break_duration: row.get(2)?,
            enable_notifications: row.get(3)?,
            enable_sound: row.get(4)?,
            theme: row.get(5)?,
            updated_at: row.get(6)?,
            long_break_duration: row.get(7)?,
            auto_start: row.get(8)?,
            daily_goal: row.get(9)?,
            auto_launch: row.get(10)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(config)
}
```

- [ ] **Step 4: Extend `update_user_config` in `commands.rs`**

Update the function signature to accept new fields and add SQL builders for them. Replace the entire `update_user_config` function with:

```rust
#[tauri::command]
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
) -> Result<UserConfig, String> {
    {
        let db_guard = app.state::<DbConnection>();
        let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

        let mut set_parts = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(d) = focus_duration {
            set_parts.push("focus_duration = ?");
            params.push(d.to_string());
        }
        if let Some(d) = break_duration {
            set_parts.push("break_duration = ?");
            params.push(d.to_string());
        }
        if let Some(n) = enable_notifications {
            set_parts.push("enable_notifications = ?");
            params.push(if n { "1".to_string() } else { "0".to_string() });
        }
        if let Some(s) = enable_sound {
            set_parts.push("enable_sound = ?");
            params.push(if s { "1".to_string() } else { "0".to_string() });
        }
        if let Some(t) = &theme {
            set_parts.push("theme = ?");
            params.push(t.clone());
        }
        if let Some(d) = long_break_duration {
            set_parts.push("long_break_duration = ?");
            params.push(d.to_string());
        }
        if let Some(a) = auto_start {
            set_parts.push("auto_start = ?");
            params.push(if a { "1".to_string() } else { "0".to_string() });
        }
        if let Some(g) = daily_goal {
            set_parts.push("daily_goal = ?");
            params.push(g.to_string());
        }
        if let Some(a) = auto_launch {
            set_parts.push("auto_launch = ?");
            params.push(if a { "1".to_string() } else { "0".to_string() });
        }
        set_parts.push("updated_at = datetime('now')");

        let sql = format!(
            "UPDATE user_config SET {} WHERE id = 1",
            set_parts.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        conn.execute(&sql, params_refs.as_slice())
            .map_err(|e| e.to_string())?;
    }

    get_user_config(app)
}
```

- [ ] **Step 5: Verify Rust compiles**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/commands.rs
git commit -m "feat: extend user_config with long break, auto-start, daily goal, auto-launch fields"
```

---

### Task 2: Extend config fields - TypeScript

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/userStore.ts`

- [ ] **Step 1: Extend `UserConfig` interface in `types/index.ts`**

Add 4 new fields to the existing interface:

```typescript
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
}
```

- [ ] **Step 2: Update `updateConfig` in `userStore.ts`**

Replace the `updateConfig` method body to pass new fields:

```typescript
  updateConfig: async (updates) => {
    await invoke("update_user_config", {
      focusDuration: updates.focusDuration,
      breakDuration: updates.breakDuration,
      enableNotifications: updates.enableNotifications,
      enableSound: updates.enableSound,
      theme: updates.theme,
      longBreakDuration: updates.longBreakDuration,
      autoStart: updates.autoStart,
      dailyGoal: updates.dailyGoal,
      autoLaunch: updates.autoLaunch,
    });
    await get().fetchConfig();
  },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/stores/userStore.ts
git commit -m "feat: extend TypeScript UserConfig with new settings fields"
```

---

### Task 3: Sidebar settings entry

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add SettingsIcon SVG component and settings nav item**

In `App.tsx`, add the gear icon component after the existing `ChartIcon`:

```tsx
const SettingsIcon = ({ color = "#999", size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
```

- [ ] **Step 2: Add settings link to sidebar bottom**

Replace the `<nav>` section (lines 93-126) with:

```tsx
        {/* 导航菜单 */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column' }}>
          <div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/timer' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    margin: '4px 0',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    background: isActive ? 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)' : 'transparent',
                    color: isActive ? '#FF6B6B' : '#666',
                    fontWeight: isActive ? '600' : '500',
                    fontSize: '15px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                >
                  <item.icon color={isActive ? '#FF6B6B' : '#999'} size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* 弹簧间距 */}
          <div style={{ flex: 1 }} />

          {/* 设置入口 - 底部固定 */}
          <Link
            to="/settings"
            onClick={(e) => {
              e.preventDefault();
              navigate('/settings');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              margin: '4px 0',
              borderRadius: '10px',
              textDecoration: 'none',
              background: location.pathname === '/settings' ? 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)' : 'transparent',
              color: location.pathname === '/settings' ? '#FF6B6B' : '#666',
              fontWeight: location.pathname === '/settings' ? '600' : '500',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
          >
            <SettingsIcon color={location.pathname === '/settings' ? '#FF6B6B' : '#999'} size={20} />
            <span>设置</span>
          </Link>
        </nav>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add settings entry to sidebar bottom with gear icon"
```

---

### Task 4: Settings page restructure - timer, goal, notifications, appearance

**Files:**
- Rewrite: `src/pages/Settings.tsx`

This task rewrites the settings page with organized groups for existing settings plus the new timer settings (long break, auto-start) and daily goal.

- [ ] **Step 1: Replace entire `Settings.tsx`**

Write the full file. It includes groups: 计时器, 目标, 通知, 外观, 关于, 测试模式. Data management and auto-launch groups will be added in later tasks.

```tsx
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";

// 复用的卡片容器样式
const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
  border: '1px solid #FFECE0',
};

const sectionHeader = (emoji: string, title: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '16px',
});

// 开关组件
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: '56px',
        height: '30px',
        borderRadius: '15px',
        background: enabled ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: enabled ? '29px' : '3px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }} />
    </button>
  );
}

// 数字输入行
function NumberInput({ label, hint, value, min, max, unit, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; unit: string;
  onChange: (val: number) => void;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          style={{
            width: '80px',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            background: '#F8F8F8',
            color: '#2C2C2C',
          }}
        />
        <span style={{ fontSize: '14px', color: '#666' }}>{unit}</span>
      </div>
    </div>
  );
}

// 开关设置行
function ToggleRow({ label, hint, enabled, onChange }: {
  label: string; hint: string; enabled: boolean; onChange: () => void;
}) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#999' }}>{hint}</div>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig } = useUserStore();
  const { isTestMode, setIsTestMode } = useTestModeStore();

  const handleClearData = async () => {
    if (confirm("确定要清除所有番茄钟记录吗？此操作不可恢复。")) {
      await invoke("clear_pomodoro_records");
      window.location.reload();
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span style={{ color: '#999' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#2C2C2C', marginBottom: '8px' }}>设置</h1>
        <p style={{ fontSize: '14px', color: '#999' }}>自定义你的番茄钟体验</p>
      </div>

      {/* 计时器设置 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('⏱', '计时器')}>
          <span style={{ fontSize: '20px' }}>⏱</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>计时器</h3>
        </div>
        <NumberInput label="专注时长" hint="每个番茄钟的专注时间" value={config.focusDuration} min={1} max={120} unit="分钟"
          onChange={(v) => updateConfig({ focusDuration: v })} />
        <NumberInput label="休息时长" hint="番茄钟之间的短休息" value={config.breakDuration} min={1} max={30} unit="分钟"
          onChange={(v) => updateConfig({ breakDuration: v })} />
        <NumberInput label="长休息时长" hint="每 4 个番茄后的长休息" value={config.longBreakDuration} min={1} max={60} unit="分钟"
          onChange={(v) => updateConfig({ longBreakDuration: v })} />
        <ToggleRow label="自动开始" hint="休息结束后自动开始下一个番茄钟" enabled={config.autoStart}
          onChange={() => updateConfig({ autoStart: !config.autoStart })} />
      </div>

      {/* 每日目标 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('🎯', '目标')}>
          <span style={{ fontSize: '20px' }}>🎯</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>每日目标</h3>
        </div>
        <NumberInput label="每日番茄目标" hint="每天计划完成的番茄数" value={config.dailyGoal} min={1} max={30} unit="个"
          onChange={(v) => updateConfig({ dailyGoal: v })} />
      </div>

      {/* 通知与提醒 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('🔔', '通知')}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>通知与提醒</h3>
        </div>
        <ToggleRow label="启用通知" hint="计时结束时发送系统通知" enabled={config.enableNotifications}
          onChange={() => updateConfig({ enableNotifications: !config.enableNotifications })} />
        <div style={{ marginBottom: 0 }}>
          <ToggleRow label="启用声音" hint="计时结束时播放提示音" enabled={config.enableSound}
            onChange={() => updateConfig({ enableSound: !config.enableSound })} />
        </div>
      </div>

      {/* 外观主题 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('🎨', '外观')}>
          <span style={{ fontSize: '20px' }}>🎨</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>外观主题</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { value: 'light', icon: '☀️', label: '浅色', desc: '明亮清爽' },
            { value: 'dark', icon: '🌙', label: '深色', desc: '护眼舒适' },
            { value: 'auto', icon: '🔄', label: '跟随系统', desc: '自动切换' },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateConfig({ theme: theme.value as any })}
              style={{
                padding: '16px 12px',
                borderRadius: '10px',
                border: config.theme === theme.value ? '2px solid #FF6B6B' : '1px solid #E0E0E0',
                background: config.theme === theme.value ? 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{theme.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2C' }}>{theme.label}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('ℹ️', '关于')}>
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>关于</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8F8F8', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>应用名称</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2C2C2C' }}>番茄专注猫</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8F8F8', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>版本</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2C2C2C' }}>1.0.0</span>
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)',
          border: '1px solid #FFD9C7',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#FF6B6B', margin: 0 }}>
            感谢使用番茄专注猫，祝你专注高效每一天！ 🍅
          </p>
        </div>
      </div>

      {/* 测试模式 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('🧪', '测试')}>
          <span style={{ fontSize: '20px' }}>🧪</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>测试模式</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px' }}>快速测试功能，使用1分钟代替正常时长</p>
        <ToggleRow label={isTestMode ? '测试模式已开启' : '测试模式已关闭'} hint="" enabled={isTestMode}
          onChange={() => setIsTestMode(!isTestMode)} />
        {isTestMode && (
          <button
            onClick={handleClearData}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              color: '#FF6B6B',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            清除测试数据
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: restructure Settings page with timer, goal, notification groups"
```

---

### Task 5: Long break + auto-start + daily goal timer logic

**Files:**
- Modify: `src/stores/timerStore.ts`
- Modify: `src/pages/Timer.tsx`

- [ ] **Step 1: Add new state fields to `timerStore.ts`**

Add to the `TimerStore` interface after `pausedRemainingSeconds`:

```typescript
  completedPomodorosInSession: number;

  // Config values stored when start() is called
  storedFocusDuration: number;
  storedBreakDuration: number;
  storedLongBreakDuration: number;
  storedAutoStart: boolean;
```

Add to the initial state in `create<TimerStore>` after `pausedRemainingSeconds: null,`:

```typescript
  completedPomodorosInSession: 0,
  storedFocusDuration: 25,
  storedBreakDuration: 5,
  storedLongBreakDuration: 15,
  storedAutoStart: false,
```

- [ ] **Step 2: Update `start()` signature to accept and store config values**

Replace the `start` method:

```typescript
  start: (focusDuration: number, breakDuration: number, longBreakDuration: number = 15, autoStart: boolean = false) => {
    const { type } = get();
    const duration = type === "focus" ? focusDuration : breakDuration;
    const newSeconds = duration * 60;

    const now = Date.now();
    const targetEndTime = now + (newSeconds * 1000);

    set({
      state: "running",
      remainingSeconds: newSeconds,
      totalSeconds: newSeconds,
      startTime: now,
      targetEndTime: targetEndTime,
      pausedRemainingSeconds: null,
      storedFocusDuration: focusDuration,
      storedBreakDuration: breakDuration,
      storedLongBreakDuration: longBreakDuration,
      storedAutoStart: autoStart,
    });
    updateTrayTitle("running", newSeconds, type);
  },
```

- [ ] **Step 3: Update `prepareBreakMode()` to check for long break**

Replace the `prepareBreakMode` method:

```typescript
  prepareBreakMode: () => {
    const { isTestMode, storedBreakDuration, storedLongBreakDuration, completedPomodorosInSession } = get();
    const isLongBreak = completedPomodorosInSession >= 4;
    const breakMinutes = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
    const breakSeconds = isTestMode ? TEST_BREAK * 60 : breakMinutes * 60;

    set({
      state: "idle",
      type: "break",
      remainingSeconds: breakSeconds,
      totalSeconds: breakSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("idle", breakSeconds, "break");
  },
```

- [ ] **Step 4: Update `switchToBreak()` to use stored durations**

Replace the `switchToBreak` method:

```typescript
  switchToBreak: () => {
    const { isTestMode, storedBreakDuration, storedLongBreakDuration, completedPomodorosInSession } = get();
    const isLongBreak = completedPomodorosInSession >= 4;
    const breakMinutes = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
    const breakSeconds = isTestMode ? TEST_BREAK * 60 : breakMinutes * 60;

    const now = Date.now();
    const targetEndTime = now + (breakSeconds * 1000);

    set({
      state: "running",
      type: "break",
      remainingSeconds: breakSeconds,
      totalSeconds: breakSeconds,
      startTime: now,
      targetEndTime: targetEndTime,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("running", breakSeconds, "break");
  },
```

- [ ] **Step 5: Update `switchToFocus()` to reset counter after long break**

Replace the `switchToFocus` method:

```typescript
  switchToFocus: () => {
    const { isTestMode, storedFocusDuration, completedPomodorosInSession } = get();
    const shouldReset = completedPomodorosInSession >= 4;
    const focusSeconds = isTestMode ? TEST_FOCUS * 60 : storedFocusDuration * 60;

    set({
      state: "idle",
      type: "focus",
      remainingSeconds: focusSeconds,
      totalSeconds: focusSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
      ...(shouldReset ? { completedPomodorosInSession: 0 } : {}),
    });
    updateTrayTitle("idle", focusSeconds, "focus");
  },
```

- [ ] **Step 6: Update `Timer.tsx` - import `fetchStats`, add daily goal display, update `handleComplete`**

At the top of `Timer.tsx`, update the `useUserStore` destructuring to include `fetchStats` and `stats`:

```typescript
  const { config, fetchConfig, userData, stats, fetchStats } = useUserStore();
```

Replace the `handleComplete` function:

```typescript
  const handleComplete = async () => {
    if (type === "focus") {
      const focusMinutes = config?.focusDuration || 25;
      await invoke("record_pomodoro", {
        record: {
          taskId: currentTask?.id || null,
          duration: focusMinutes,
          type: "focus",
        },
      });

      if (currentTask) {
        await incrementTaskProgress(currentTask.id);
      }

      // Increment pomodoro session counter
      useTimerStore.setState(s => ({ completedPomodorosInSession: s.completedPomodorosInSession + 1 }));

      // Check daily goal
      await fetchStats();
      const todayCount = useUserStore.getState().stats?.todayCount || 0;
      const dailyGoal = config?.dailyGoal || 8;

      try {
        await sendNotification({
          title: '专注完成！',
          body: todayCount >= dailyGoal
            ? '目标达成！今天太棒了！'
            : '太棒了！休息一下吧~',
          sound: 'default',
        });
      } catch (error) {
        console.error('通知发送失败:', error);
        showBrowserNotification('专注完成！', todayCount >= dailyGoal ? '目标达成！' : '太棒了！休息一下吧~');
      }

      prepareBreakMode();

      // Auto-start break if enabled
      if (config?.autoStart) {
        const { storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart, completedPomodorosInSession } = useTimerStore.getState();
        const isLongBreak = completedPomodorosInSession >= 4;
        const breakMins = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
        start(storedFocusDuration, breakMins, storedLongBreakDuration, storedAutoStart);
      }
    } else {
      // Break complete
      try {
        await sendNotification({
          title: '休息结束！',
          body: '准备开始新的专注吧~',
          sound: 'default',
        });
      } catch (error) {
        console.error('通知发送失败:', error);
        showBrowserNotification('休息结束！', '准备开始新的专注吧~');
      }

      stop();

      // Auto-start next focus if enabled
      if (config?.autoStart) {
        const { storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart } = useTimerStore.getState();
        start(storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart);
      }
    }
  };
```

- [ ] **Step 7: Add daily goal progress display to `Timer.tsx`**

Add before the closing `</div>` of the root element, after the current task display block:

```tsx
      {/* 每日目标进度 */}
      {config && stats && (
        <div style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
          borderRadius: '9px',
          border: '1px solid #FFECE0',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#666' }}>今日目标</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '120px',
              height: '6px',
              background: '#F0F0F0',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, (stats.todayCount / (config.dailyGoal || 8)) * 100)}%`,
                height: '100%',
                background: stats.todayCount >= (config.dailyGoal || 8)
                  ? 'linear-gradient(90deg, #4CAF50, #66BB6A)'
                  : 'linear-gradient(90deg, #FF6B6B, #FFA94D)',
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: stats.todayCount >= (config.dailyGoal || 8) ? '#4CAF50' : '#FF6B6B',
            }}>
              {stats.todayCount}/{config.dailyGoal || 8}
            </span>
          </div>
        </div>
      )}
```

- [ ] **Step 8: Add `fetchStats` call in the existing `useEffect`**

Update the existing useEffect that calls `fetchConfig` and `fetchActiveTasks`:

```typescript
  useEffect(() => {
    fetchConfig();
    fetchActiveTasks();
    fetchStats();
  }, [fetchConfig, fetchActiveTasks, fetchStats]);
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add src/stores/timerStore.ts src/pages/Timer.tsx
git commit -m "feat: implement long break, auto-start, and daily goal progress"
```

---

### Task 6: Install Tauri plugins

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `package.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add Rust plugin dependencies**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
tauri-plugin-dialog = "2"
tauri-plugin-autostart = "2"
```

- [ ] **Step 2: Install npm packages**

Run:
```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-autostart
```

- [ ] **Step 3: Add capabilities for dialog plugin**

In `src-tauri/capabilities/default.json`, add dialog permissions:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "notification:default",
    "dialog:default"
  ]
}
```

- [ ] **Step 4: Register plugins in `lib.rs`**

In `src-tauri/src/lib.rs`, add imports at top:

```rust
use tauri_plugin_autostart::MacosLauncher;
```

In the `run()` function, add plugin registrations after the existing `.plugin(tauri_plugin_notification::init())`:

```rust
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
```

- [ ] **Step 5: Verify Rust compiles**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/capabilities/default.json src-tauri/src/lib.rs package.json package-lock.json
git commit -m "feat: add tauri-plugin-dialog and tauri-plugin-autostart"
```

---

### Task 7: Data management - export/import

**Files:**
- Modify: `src-tauri/src/commands.rs` (add export_data, import_data)
- Modify: `src-tauri/src/lib.rs` (register commands)
- Modify: `src-tauri/src/db.rs` (add ExportData struct)
- Modify: `src/stores/userStore.ts` (add export/import methods)
- Modify: `src/pages/Settings.tsx` (add data management section)

- [ ] **Step 1: Add `ExportData` struct in `db.rs`**

After the `TaskReportItem` struct, add:

```rust
// 数据导出结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: i32,
    pub exported_at: String,
    pub pomodoro_records: Vec<PomodoroRecord>,
    pub tasks: Vec<Task>,
    pub user_config: UserConfig,
}
```

- [ ] **Step 2: Add `export_data` command in `commands.rs`**

Add before the `update_tray_title` function:

```rust
// 导出数据
#[tauri::command]
pub fn export_data(app: AppHandle, path: String) -> Result<(), String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 读取所有番茄钟记录
    let mut pomodoro_records = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, task_id, duration, type, recorded_at FROM pomodoro_records ORDER BY id"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(PomodoroRecord {
            id: row.get(0)?,
            task_id: row.get(1)?,
            duration: row.get(2)?,
            r#type: row.get(3)?,
            recorded_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    for row in rows {
        pomodoro_records.push(row.map_err(|e| e.to_string())?);
    }

    // 读取所有任务
    let mut tasks = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, name, target_pomodoros, completed_pomodoros, completed,
         priority, deadline, created_at, updated_at FROM tasks ORDER BY id"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            target_pomodoros: row.get(2)?,
            completed_pomodoros: row.get(3)?,
            completed: row.get(4)?,
            priority: row.get(5)?,
            deadline: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    for row in rows {
        tasks.push(row.map_err(|e| e.to_string())?);
    }

    // 读取用户配置
    let user_config = get_user_config(app.clone())?;

    let data = ExportData {
        version: 1,
        exported_at: Utc::now().to_rfc3339(),
        pomodoro_records,
        tasks,
        user_config,
    };

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}

// 导入数据
#[tauri::command]
pub fn import_data(app: AppHandle, path: String) -> Result<(), String> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: ExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    conn.execute_batch("BEGIN TRANSACTION").map_err(|e| e.to_string())?;

    // 清空现有数据
    conn.execute("DELETE FROM pomodoro_records", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks", []).map_err(|e| e.to_string())?;

    // 导入任务
    for task in &data.tasks {
        conn.execute(
            "INSERT INTO tasks (id, name, target_pomodoros, completed_pomodoros, completed, priority, deadline, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![task.id, task.name, task.target_pomodoros, task.completed_pomodoros,
                    task.completed, task.priority, task.deadline, task.created_at, task.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    // 导入番茄钟记录
    for record in &data.pomodoro_records {
        conn.execute(
            "INSERT INTO pomodoro_records (id, task_id, duration, type, recorded_at)
             VALUES (?, ?, ?, ?, ?)",
            params![record.id, record.task_id, record.duration, record.r#type, record.recorded_at],
        ).map_err(|e| e.to_string())?;
    }

    // 导入用户配置
    let uc = &data.user_config;
    conn.execute(
        "UPDATE user_config SET focus_duration = ?, break_duration = ?,
         enable_notifications = ?, enable_sound = ?, theme = ?,
         long_break_duration = ?, auto_start = ?, daily_goal = ?, auto_launch = ?
         WHERE id = 1",
        params![uc.focus_duration, uc.break_duration, uc.enable_notifications,
                uc.enable_sound, uc.theme, uc.long_break_duration, uc.auto_start,
                uc.daily_goal, uc.auto_launch],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch("COMMIT").map_err(|e| e.to_string())?;

    Ok(())
}
```

- [ ] **Step 3: Register new commands in `lib.rs`**

In the `invoke_handler![]` macro, add after `commands::update_tray_title,`:

```rust
            commands::export_data,
            commands::import_data,
```

- [ ] **Step 4: Verify Rust compiles**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully.

- [ ] **Step 5: Add export/import methods to `userStore.ts`**

Add `exportData` and `importData` to the `UserStore` interface:

```typescript
  exportData: (path: string) => Promise<void>;
  importData: (path: string) => Promise<void>;
```

Add implementations in the store:

```typescript
  exportData: async (path: string) => {
    await invoke("export_data", { path });
  },

  importData: async (path: string) => {
    await invoke("import_data", { path });
    await get().fetchConfig();
    await get().fetchStats();
  },
```

- [ ] **Step 6: Add data management section to `Settings.tsx`**

Add imports at the top:

```typescript
import { save, open } from "@tauri-apps/plugin-dialog";
```

Add the data management card after the "外观主题" card and before the "关于" card:

```tsx
      {/* 数据管理 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('💾', '数据')}>
          <span style={{ fontSize: '20px' }}>💾</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>数据管理</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={async () => {
              const path = await save({
                defaultPath: `pomodoro-cat-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [{ name: 'JSON', extensions: ['json'] }],
              });
              if (path) {
                try {
                  await exportData(path);
                  alert('数据导出成功！');
                } catch (e) {
                  alert('导出失败：' + e);
                }
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              color: '#4CAF50',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            导出数据
          </button>
          <button
            onClick={async () => {
              const path = await open({
                filters: [{ name: 'JSON', extensions: ['json'] }],
                multiple: false,
              });
              if (path) {
                if (!confirm('导入将覆盖现有数据，是否继续？')) return;
                try {
                  await importData(path as string);
                  alert('数据导入成功！');
                  window.location.reload();
                } catch (e) {
                  alert('导入失败：' + e);
                }
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              color: '#2196F3',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            导入数据
          </button>
          <button
            onClick={handleClearData}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              color: '#FF6B6B',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            清除所有番茄记录
          </button>
        </div>
      </div>
```

Update the `useUserStore` destructuring to include `exportData` and `importData`:

```typescript
  const { config, fetchConfig, updateConfig, exportData, importData } = useUserStore();
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src/stores/userStore.ts src/pages/Settings.tsx
git commit -m "feat: add data export/import with JSON format"
```

---

### Task 8: Auto-launch + minimize to tray

**Files:**
- Modify: `src-tauri/src/lib.rs` (startup window visibility)
- Modify: `src/pages/Settings.tsx` (system section)
- Modify: `src/stores/userStore.ts` (auto-launch toggle)

- [ ] **Step 1: Add startup window visibility logic in `lib.rs`**

In the `setup` closure, after `app.manage(DbConnection(Mutex::new(conn)));`, add:

```rust
            // 开机启动时隐藏窗口（最小化到托盘）
            let auto_launch: bool = {
                let db_guard = app.state::<DbConnection>();
                let conn = db_guard.0.lock().unwrap();
                conn.query_row(
                    "SELECT COALESCE(auto_launch, 0) FROM user_config WHERE id = 1",
                    [],
                    |row| row.get::<_, i32>(0),
                ).unwrap_or(0) != 0
            };
            if auto_launch {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
```

- [ ] **Step 2: Add auto-launch toggle method to `userStore.ts`**

Add to `UserStore` interface:

```typescript
  toggleAutoLaunch: (enabled: boolean) => Promise<void>;
```

Add implementation:

```typescript
  toggleAutoLaunch: async (enabled: boolean) => {
    await invoke("update_user_config", { autoLaunch: enabled });
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    if (enabled) {
      await enable();
    } else {
      await disable();
    }
    await get().fetchConfig();
  },
```

- [ ] **Step 3: Add system section to `Settings.tsx`**

Add the auto-launch section after the data management card and before the "关于" card:

```tsx
      {/* 系统 */}
      <div className="card" style={cardStyle}>
        <div style={sectionHeader('🖥', '系统')}>
          <span style={{ fontSize: '20px' }}>🖥</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>系统</h3>
        </div>
        <ToggleRow label="开机启动" hint="登录系统时自动启动并最小化到托盘" enabled={config.autoLaunch}
          onChange={() => toggleAutoLaunch(!config.autoLaunch)} />
      </div>
```

Update the `useUserStore` destructuring to include `toggleAutoLaunch`:

```typescript
  const { config, fetchConfig, updateConfig, exportData, importData, toggleAutoLaunch } = useUserStore();
```

- [ ] **Step 4: Verify everything builds and runs**

Run: `npm run build && cd src-tauri && cargo build`
Expected: Both compile successfully.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src/stores/userStore.ts src/pages/Settings.tsx
git commit -m "feat: add auto-launch with minimize to tray"
```
