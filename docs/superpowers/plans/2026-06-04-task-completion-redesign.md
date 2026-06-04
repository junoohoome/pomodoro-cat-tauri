# 任务完成机制 + 次数制改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将任务完成改为纯手动、放弃不记录、统计改为次数制、时间格式改为 `1h25min`。

**Architecture:** 后端先改（去掉自动完成 SQL），再改 store 层（简化逻辑），再改核心 GlobalTimer（删放弃记录），最后改 UI 页面（交互重设计 + 显示格式）。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2 (Rust), SQLite

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/utils/format.ts` | Create | 共享 `formatDuration` 函数 |
| `src-tauri/src/db.rs:105` | Modify | `daily_goal` 默认值 2→4 |
| `src-tauri/src/commands.rs:334-343` | Modify | 移除自动完成 SQL |
| `src-tauri/src/commands.rs:307` | Modify | 重置默认值 `daily_goal` 2.0→4.0 |
| `src/stores/taskStore.ts:128-141` | Modify | 简化 `incrementTaskProgress` |
| `src/components/GlobalTimer.tsx:13-71` | Modify | 删除 `handleStopWithProgress`，简化 `handleComplete` |
| `src/pages/Tasks.tsx` | Modify | checkbox=完成，加 ▶/■ 按钮，新时间格式 |
| `src/pages/Timer.tsx` | Modify | 今日统计改次数，每日目标改次数，新时间格式 |
| `src/pages/Settings.tsx:149` | Modify | 每日目标从小时改为次数 |
| `src/pages/Stats.tsx` | Modify | 主指标改为次数，新时间格式 |
| `src/components/stats/ReportTab.tsx` | Modify | 新时间格式 |

---

### Task 1: 创建共享 `formatDuration` 工具函数

**Files:**
- Create: `src/lib/utils/format.ts`

- [ ] **Step 1: 创建 format.ts**

```typescript
/**
 * 将分钟数格式化为易读的时间字符串
 * 5 → "5min", 60 → "1h", 85 → "1h25min"
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}min`;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/utils/format.ts
git commit -m "feat: add shared formatDuration utility"
```

---

### Task 2: 后端 — 移除自动完成 SQL + 改 daily_goal 默认值

**Files:**
- Modify: `src-tauri/src/commands.rs:334-343`
- Modify: `src-tauri/src/db.rs:105`
- Modify: `src-tauri/src/commands.rs:307`

- [ ] **Step 1: `commands.rs` — 移除 record_pomodoro 中的自动完成 SQL**

将 `record_pomodoro` 函数（约 321-359 行）中的任务进度更新 SQL 从：

```rust
if record.r#type == "focus" {
    conn.execute(
        "UPDATE tasks SET completed_minutes = completed_minutes + ?,
         completed = CASE WHEN (completed_minutes + ?) >= CAST(ROUND(duration_target * 60) AS INTEGER) THEN 1 ELSE completed END,
         updated_at = datetime('now')
         WHERE id = ?",
        params![record.duration, record.duration, task_id],
    ).map_err(|e| e.to_string())?;
}
```

改为：

```rust
if record.r#type == "focus" {
    conn.execute(
        "UPDATE tasks SET completed_minutes = completed_minutes + ?,
         updated_at = datetime('now')
         WHERE id = ?",
        params![record.duration, task_id],
    ).map_err(|e| e.to_string())?;
}
```

- [ ] **Step 2: `db.rs:105` — 改 daily_goal 默认值为 4**

```rust
// 原: DEFAULT 4 是正确的（之前迁移已改为 4），确认无需改动
// 但检查 init_db 中 INSERT OR IGNORE 的默认值：
// user_config 默认 daily_goal 来自 ALTER TABLE ADD COLUMN 的 DEFAULT 4
// 所以新建用户的 daily_goal 已经是 4
```

确认 `db.rs:105` 已经是 `DEFAULT 4`。无需改动。

- [ ] **Step 3: `commands.rs:307` — 改 reset_user_config 中的 daily_goal 默认值**

在 `reset_user_config` 函数中找到 `daily_goal = 2.0`，改为 `daily_goal = 4.0`：

```sql
-- 原
daily_goal = 2.0,
-- 改为
daily_goal = 4.0,
```

- [ ] **Step 4: 编译验证**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

Expected: 编译成功，无错误

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands.rs
git commit -m "refactor(commands): remove auto-complete SQL, change daily_goal default to 4"
```

---

### Task 3: Store 层 — 简化 incrementTaskProgress

**Files:**
- Modify: `src/stores/taskStore.ts:128-141`

- [ ] **Step 1: 简化 `incrementTaskProgress`，移除自动完成判定**

将 `incrementTaskProgress` 从：

```typescript
incrementTaskProgress: async (taskId, elapsedMinutes) => {
  const task = [...get().activeTasks, ...get().completedTasks].find(
    (t) => t.id === taskId
  );
  if (!task) return;

  const newMinutes = task.completedMinutes + elapsedMinutes;
  const completed = newMinutes >= Math.round(task.durationTarget * 60);

  await get().updateTask(taskId, {
    completedMinutes: newMinutes,
    completed,
  });
},
```

改为：

```typescript
incrementTaskProgress: async (taskId, elapsedMinutes) => {
  const task = [...get().activeTasks, ...get().completedTasks].find(
    (t) => t.id === taskId
  );
  if (!task) return;

  const newMinutes = task.completedMinutes + elapsedMinutes;

  await get().updateTask(taskId, {
    completedMinutes: newMinutes,
  });
},
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/taskStore.ts
git commit -m "refactor(taskStore): remove auto-complete from incrementTaskProgress"
```

---

### Task 4: GlobalTimer — 删除放弃记录逻辑

**Files:**
- Modify: `src/components/GlobalTimer.tsx`

这是改动最大的核心文件。需要：
1. 删除 `handleStopWithProgress` 函数（约 13-71 行）
2. 删除 `isStopping` 变量
3. 简化 `handleComplete`（移除任务自动完成判定）
4. 删除放弃监听（subscribe 回调中的放弃分支）

- [ ] **Step 1: 删除 `handleStopWithProgress` 函数和 `isStopping` 变量**

删除 GlobalTimer.tsx 中的以下代码（约第 10-71 行）：

```typescript
// 删除这一行:
let isStopping = false;

// 删除整个 handleStopWithProgress 函数 (约第 13-71 行)
```

保留 `let isCompleting = false;`（完成逻辑仍需要）。

- [ ] **Step 2: 简化 `handleComplete` — 移除任务自动完成判定**

在 `handleComplete` 函数中，找到更新任务进度的部分（约第 107-119 行），将：

```typescript
// 更新任务进度
if (currentTask) {
  try {
    const newMinutes = currentTask.completedMinutes + elapsedMinutes;
    const taskCompleted = newMinutes >= Math.round(currentTask.durationTarget * 60);
    await useTaskStore.getState().incrementTaskProgress(currentTask.id, elapsedMinutes);
    if (taskCompleted) {
      useTaskStore.getState().setCurrentTask(null);
      useTimerStore.getState().setTaskId(undefined);
    }
  } catch (e) {
    console.error("task update failed:", e);
  }
}
```

改为：

```typescript
// 更新任务进度
if (currentTask) {
  try {
    await useTaskStore.getState().incrementTaskProgress(currentTask.id, elapsedMinutes);
  } catch (e) {
    console.error("task update failed:", e);
  }
}
```

移除了 `taskCompleted` 判定和 `setCurrentTask(null)` — 任务不再自动完成。

- [ ] **Step 3: 删除放弃监听逻辑**

在 subscribe 回调中（约第 216-247 行），删除整个放弃分支。将：

```typescript
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe((state, prevState) => {
    // 正常完成：remainingSeconds 归零
    if (
      prevState.remainingSeconds > 0 &&
      state.remainingSeconds === 0 &&
      prevState.state === "running" &&
      !isCompleting
    ) {
      isCompleting = true;
      handleComplete(prevState.type);
    }

    // 放弃：从 running/paused 变为 idle（非正常完成触发）
    if (
      (prevState.state === "running" || prevState.state === "paused") &&
      state.state === "idle" &&
      !isCompleting &&
      !isStopping
    ) {
      isStopping = true;
      handleStopWithProgress({
        state: prevState.state,
        type: prevState.type,
        startTime: prevState.startTime,
        totalSeconds: prevState.totalSeconds,
        pausedRemainingSeconds: prevState.pausedRemainingSeconds,
        remainingSeconds: prevState.remainingSeconds,
      }).finally(() => { isStopping = false; });
    }
  });
  return unsubscribe;
}, []);
```

改为：

```typescript
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe((state, prevState) => {
    // 正常完成：remainingSeconds 归零
    if (
      prevState.remainingSeconds > 0 &&
      state.remainingSeconds === 0 &&
      prevState.state === "running" &&
      !isCompleting
    ) {
      isCompleting = true;
      handleComplete(prevState.type);
    }
  });
  return unsubscribe;
}, []);
```

- [ ] **Step 4: 删除未使用的 import**

检查文件顶部，`invoke` 不再需要用于放弃记录（但 `handleComplete` 中仍使用 `invoke("record_pomodoro")` 和 `invoke("add_food")`），所以 import 保留。

检查是否有 `useTaskStore` import — 仍然需要（`handleComplete` 中使用）。

- [ ] **Step 5: 提交**

```bash
git add src/components/GlobalTimer.tsx
git commit -m "refactor(GlobalTimer): remove abandon recording, simplify completion logic"
```

---

### Task 5: Tasks 页面 — 交互重设计 + 新时间格式

**Files:**
- Modify: `src/pages/Tasks.tsx`

这是 UI 改动最大的文件。需要：
1. 替换 `formatMinutes` 为 `formatDuration`
2. Checkbox 改为完成操作
3. 新增 ▶/■ 选择按钮
4. 已完成任务的显示调整

- [ ] **Step 1: 替换 formatMinutes 为 formatDuration**

在文件顶部 import 区域添加：

```typescript
import { formatDuration } from "../lib/utils/format";
```

删除本地的 `formatMinutes` 函数（约第 25-28 行）：

```typescript
// 删除这个函数
const formatMinutes = (totalMinutes: number): string => {
  const hours = totalMinutes / 60;
  return `${parseFloat(hours.toFixed(1))}h`;
};
```

全局替换所有 `formatMinutes(` 为 `formatDuration(`。

具体替换位置：
- 第 835 行附近：`{formatMinutes(task.completedMinutes)} / {formatMinutes(Math.round(task.durationTarget * 60))}`
  → `{formatDuration(task.completedMinutes)} / {formatDuration(Math.round(task.durationTarget * 60))}`
- 第 907 行附近：`{formatMinutes(task.completedMinutes)}`
  → `{formatDuration(task.completedMinutes)}`

- [ ] **Step 2: 添加 PlayButton 组件**

在 `CircleCheckbox` 组件定义之后（约第 447 行之后），添加 `PlayButton` 组件：

```typescript
// ─── Play/Stop button (select/deselect current task) ───
const PlayButton = ({
  isCurrent,
  disabled,
  onClick,
}: {
  isCurrent: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    style={{
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      flexShrink: 0,
      marginTop: '1px',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.4 : 1,
      background: isCurrent ? 'var(--accent-light)' : 'transparent',
    }}
  >
    {isCurrent ? (
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        background: 'var(--accent-color)',
      }} />
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--text-tertiary)">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    )}
  </div>
);
```

- [ ] **Step 3: 修改 active task 行 — checkbox 改为完成操作，加 PlayButton**

找到 active task 的渲染区域（约第 640-851 行），对每个 task 行做以下修改：

**3a. 修改 CircleCheckbox 的 props：**

将：
```jsx
<CircleCheckbox
  color={pColor}
  filled={isCurrent}
  disabled={timerState !== 'idle'}
  onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}
/>
```

改为：
```jsx
<CircleCheckbox
  color="var(--success-color)"
  filled={false}
  disabled={timerState !== 'idle'}
  onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
/>
```

**3b. 在 task content 的 `</div>` 之后、行 `</div>` 之前添加 PlayButton：**

找到（约第 845 行附近）：
```jsx
                    </div>
                  </div>
```

改为：
```jsx
                    </div>
                    <PlayButton
                      isCurrent={isCurrent}
                      disabled={timerState !== 'idle'}
                      onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}
                    />
                  </div>
```

**3c. 删除旧的 handleSelectTask 中的 timerState 检查逻辑（已有 toast）：**

`handleSelectTask` 函数保持不变（第 122-134 行），它已经处理了 toggle 逻辑。只是调用方从 checkbox 移到了 PlayButton。

- [ ] **Step 4: 调整已完成任务的时间显示**

在已完成任务区域（约第 905-908 行），将时间显示改为新格式。这里已经用了 `formatDuration`（Step 1 全局替换已处理）。

- [ ] **Step 5: 验证**

```bash
npm run dev
```

验证：
1. 任务列表显示 `25min / 1h30min` 格式
2. 点击 checkbox → 弹出确认 → 标记完成
3. 点击 ▶ → 选为当前任务（高亮）
4. 已选任务点击 ■ → 取消选择
5. 编辑任务仍通过点击文字触发

- [ ] **Step 6: 提交**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat(Tasks): checkbox=complete, play/stop button=select, new time format"
```

---

### Task 6: Timer 页面 — 次数制统计 + 新时间格式

**Files:**
- Modify: `src/pages/Timer.tsx`

- [ ] **Step 1: 替换 formatMinutes 为 formatDuration**

在文件顶部 import 区域添加：

```typescript
import { formatDuration } from "../lib/utils/format";
```

删除本地的 `formatMinutes` 函数（约第 34-37 行）：

```typescript
// 删除
const formatMinutes = (totalMinutes: number): string => {
  const hours = totalMinutes / 60;
  return `${parseFloat(hours.toFixed(1))}h`;
};
```

- [ ] **Step 2: 修改今日概览 — 小时改为次数**

在 `renderTodayStats` 函数中（约第 291-325 行），修改第一个统计卡片。

将：
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
  <span style={{
    fontSize: '22px', fontWeight: '600', color: 'var(--accent-color)',
    fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
  }}>{(stats.todayMinutes / 60).toFixed(1)}h</span>
  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>今日专注</span>
</div>
```

改为：
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
  <span style={{
    fontSize: '22px', fontWeight: '600', color: 'var(--accent-color)',
    fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
  }}>{stats.todayCount}次</span>
  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>今日专注</span>
</div>
```

同时修改第四个卡片（累计专注），将小时改为次数：

将：
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
  <span style={{
    fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
  }}>{(stats.totalMinutes / 60).toFixed(1)}h</span>
  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>累计专注</span>
</div>
```

改为：
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
  <span style={{
    fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
  }}>{stats.totalCount}次</span>
  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>累计专注</span>
</div>
```

- [ ] **Step 3: 修改当前任务卡片的时间格式**

在 `renderCurrentTask` 中（约第 327-393 行），全局替换 `formatMinutes` 为 `formatDuration`。

约第 335 行：
```jsx
// 原: {formatMinutes(currentTask.completedMinutes)} / {formatMinutes(Math.round(currentTask.durationTarget * 60))}
// 改为: （Step 1 的全局替换已处理）
```

同时修改进度条（约第 377-385 行）的百分比文字，将：
```jsx
{Math.round((currentTask.completedMinutes / (currentTask.durationTarget * 60)) * 100)}%
```
保持不变（百分比显示无需修改）。

- [ ] **Step 4: 修改每日目标 — 从小时改为次数**

在 `renderDailyGoal` 中（约第 395-413 行），将进度显示从小时改为次数。

将：
```jsx
const renderDailyGoal = () => config && config.showDailyGoal && stats && (
  <div style={cardStyle}>
    <div style={cardTitleStyle}>今日目标</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>进度</span>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{
          width: `${Math.min(100, (stats.todayMinutes / 60 / (config.dailyGoal || 2)) * 100)}%`,
        }} />
      </div>
      <span style={{
        fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)',
        flexShrink: 0, fontVariantNumeric: 'tabular-nums',
      }}>
        {(stats.todayMinutes / 60).toFixed(1)}h/{parseFloat((config.dailyGoal || 2).toFixed(1))}h
      </span>
    </div>
  </div>
);
```

改为：
```jsx
const renderDailyGoal = () => config && config.showDailyGoal && stats && (
  <div style={cardStyle}>
    <div style={cardTitleStyle}>今日目标</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>进度</span>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{
          width: `${Math.min(100, (stats.todayCount / (config.dailyGoal || 4)) * 100)}%`,
        }} />
      </div>
      <span style={{
        fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)',
        flexShrink: 0, fontVariantNumeric: 'tabular-nums',
      }}>
        {stats.todayCount}/{Math.round(config.dailyGoal || 4)}次
      </span>
    </div>
  </div>
);
```

- [ ] **Step 5: 修改其他任务卡片的时间格式**

在 `renderOtherTasks` 中（约第 415-458 行），替换 `formatMinutes` 为 `formatDuration`（Step 1 全局替换已处理）。

- [ ] **Step 6: 提交**

```bash
git add src/pages/Timer.tsx
git commit -m "feat(Timer): count-based stats, count-based daily goal, new time format"
```

---

### Task 7: Settings 页面 — 每日目标从小时改为次数

**Files:**
- Modify: `src/pages/Settings.tsx:149`

- [ ] **Step 1: 修改每日目标输入**

将第 149 行的 NumberInput：

```jsx
<NumberInput label="每日专注目标" hint="每天计划专注的小时数" value={config.dailyGoal} min={0.5} max={12} step={0.5} unit="小时"
  onChange={(v) => updateConfig({ dailyGoal: v })} />
```

改为：

```jsx
<NumberInput label="每日专注目标" hint="每天计划完成的专注次数" value={config.dailyGoal} min={1} max={12} step={1} unit="次"
  onChange={(v) => updateConfig({ dailyGoal: v })} />
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(Settings): daily goal from hours to session count"
```

---

### Task 8: Stats 页面 + ReportTab — 次数制 + 新时间格式

**Files:**
- Modify: `src/pages/Stats.tsx`
- Modify: `src/components/stats/ReportTab.tsx`

- [ ] **Step 1: Stats.tsx — 日报今日目标卡片改为次数**

在 `renderToday` 函数中，找到第三个 summary card（今日目标，约第 99-112 行）：

将：
```jsx
<span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
  {(stats.todayMinutes / 60).toFixed(1)}/{parseFloat(stats.dailyGoal.toFixed(1))}h
</span>
<span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>今日目标</span>
```

改为：
```jsx
<span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
  {stats.todayCount}/{Math.round(stats.dailyGoal)}次
</span>
<span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>今日目标</span>
```

- [ ] **Step 2: Stats.tsx — 任务投入明细改为新时间格式**

在 `renderToday` 的任务投入明细中（约第 273-274 行），将时间显示从小时改为 `formatDuration`：

在文件顶部添加 import：
```typescript
import { formatDuration } from "../lib/utils/format";
```

将：
```jsx
{task.focusMinutes > 0 ? (task.focusMinutes / 60).toFixed(1) + "h" : "0h"}
```

改为：
```jsx
{task.focusMinutes > 0 ? formatDuration(task.focusMinutes) : "0min"}
```

- [ ] **Step 3: Stats.tsx — 时段分布柱状图标签改为新格式**

在时段分布的柱状图中（约第 202 行），将：
```jsx
{seg.minutes > 0 ? (seg.minutes / 60).toFixed(1) + "h" : ""}
```

改为：
```jsx
{seg.minutes > 0 ? formatDuration(seg.minutes) : ""}
```

- [ ] **Step 4: Stats.tsx — 日报专注时长卡片改为 formatDuration**

将第一个 summary card（约第 80-83 行）的时间显示：
```jsx
{stats.todayMinutes > 0 ? (stats.todayMinutes / 60).toFixed(1) + "h" : "0h"}
```

改为：
```jsx
{stats.todayMinutes > 0 ? formatDuration(stats.todayMinutes) : "0min"}
```

- [ ] **Step 5: ReportTab.tsx — 导入 formatDuration，替换时间格式**

在 `src/components/stats/ReportTab.tsx` 顶部添加：
```typescript
import { formatDuration } from "../../lib/utils/format";
```

替换所有 `(minutes / 60).toFixed(1) + "h"` 格式为 `formatDuration(minutes)`。

具体位置（约第 83 行）：
```jsx
// 原: {minutes > 0 ? (minutes / 60).toFixed(1) + "h" : "0h"}
// 改为:
{minutes > 0 ? formatDuration(minutes) : "0min"}
```

任务投入明细（约第 278 行）：
```jsx
// 原: {task.focusMinutes > 0 ? (task.focusMinutes / 60).toFixed(1) + "h" : "0h"}
// 改为:
{task.focusMinutes > 0 ? formatDuration(task.focusMinutes) : "0min"}
```

柱状图标签（约第 37 行）：
```typescript
// 原: const hours = mins > 0 ? (mins / 60).toFixed(1) : "0";
// 改为:
const hours = mins > 0 ? formatDuration(mins) : "0";
```

- [ ] **Step 6: 提交**

```bash
git add src/pages/Stats.tsx src/components/stats/ReportTab.tsx
git commit -m "feat(Stats): count-based daily goal, new time format across stats"
```

---

### Task 9: 整体验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证清单**

逐项检查：

1. **任务列表页**
   - [ ] 时间显示为 `25min / 1h30min` 格式
   - [ ] 点击 checkbox → 弹出确认 → 标记完成
   - [ ] 点击 ▶ → 选为当前任务
   - [ ] 已选任务显示 ■ → 点击取消选择
   - [ ] 点击任务文字 → 展开编辑面板
   - [ ] 已完成任务显示新时间格式

2. **Timer 页面**
   - [ ] 今日概览显示 `3次`（专注次数）
   - [ ] 累计专注显示次数
   - [ ] 每日目标进度条显示 `2/4 次`
   - [ ] 当前任务卡片显示新时间格式
   - [ ] 完成一次专注后统计刷新

3. **Settings 页面**
   - [ ] 每日目标显示为"次"单位
   - [ ] 输入范围 1-12，步进 1

4. **Stats 页面**
   - [ ] 日报今日目标显示 `2/4次`
   - [ ] 时间格式为 `1h25min`
   - [ ] 周报/月报时间格式统一

5. **放弃专注**
   - [ ] 开始专注后点击"放弃" → 不记录任何数据
   - [ ] 统计不增加
   - [ ] 任务进度不增加

- [ ] **Step 3: 最终提交（如有遗漏修复）**

```bash
git add -A
git commit -m "fix: final adjustments for task completion redesign"
```
