# 任务时间估算 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pomodoro-count task estimation with hour-based input, keeping the backend unchanged.

**Architecture:** UI-only change. Frontend converts hours ↔ pomodoro rounds using a 30-minute-per-round formula. New DurationSelector component replaces PomodoroSelector. A new TomatoIcon SVG replaces 🍅 emoji. Task progress displays switch from "2/5 🍅" to "50min / 2h 30min".

**Tech Stack:** React 19, TypeScript, inline styles (matching existing codebase patterns), inline SVG icons.

---

### Task 1: Add TomatoIcon SVG component

**Files:**
- Modify: `src/pages/Tasks.tsx` (lines 1-6, add after imports)

Add a `TomatoIcon` inline SVG component matching the project's icon style (`strokeWidth="1.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`). This icon replaces all 🍅 emoji occurrences.

- [ ] **Step 1: Add TomatoIcon component after imports**

In `src/pages/Tasks.tsx`, add this component right after the imports (after line 3):

```tsx
// ─── Tomato icon (replaces 🍅 emoji) ───
const TomatoIcon = ({ color = "var(--accent-color)", size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c-1.5 0-2.5.8-3 2 .5-.3 1.2-.5 2-.5h2c.8 0 1.5.2 2 .5-.5-1.2-1.5-2-3-2z" fill="currentColor" />
    <circle cx="12" cy="13" r="9" />
    <path d="M9 5c-1.5-2-3-2.5-3.5-2s.5 3.5 2 5" />
    <path d="M15 5c1.5-2 3-2.5 3.5-2s-.5 3.5-2 5" />
  </svg>
);
```

- [ ] **Step 2: Verify the component renders**

Run: `npm run dev`
Expected: App starts without errors (TomatoIcon is defined but not yet used).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat: add TomatoIcon SVG component"
```

---

### Task 2: Add time formatting helper and conversion utilities

**Files:**
- Modify: `src/pages/Tasks.tsx` (add after TomatoIcon component)

Add utility functions for hour ↔ pomodoro conversion and time display formatting. These are pure functions used by both the DurationSelector and progress display.

- [ ] **Step 1: Add conversion and formatting utilities**

Add after the `TomatoIcon` component:

```tsx
// ─── Time ↔ Pomodoro conversion ───
const ROUND_MINUTES = 30; // focusDuration(25) + breakDuration(5)
const PRESETS = [
  { label: '30min', hours: 0.5 },
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: '4h', hours: 4 },
] as const;

const hoursToPomodoros = (hours: number): number => Math.ceil(hours * 60 / ROUND_MINUTES);
const pomodorosToHours = (pomodoros: number): number => pomodoros * ROUND_MINUTES / 60;

// Format total minutes into human-readable string: "50min", "1h 30min", "2h"
const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};
```

- [ ] **Step 2: Verify no errors**

Run: `npm run dev`
Expected: App starts without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat: add time conversion and formatting utilities"
```

---

### Task 3: Replace PomodoroSelector with DurationSelector

**Files:**
- Modify: `src/pages/Tasks.tsx`

Replace the `PomodoroSelector` component (lines 288-311) with a `DurationSelector` that has preset buttons + a free hour input.

- [ ] **Step 1: Replace PomodoroSelector with DurationSelector**

Find and replace the entire `PomodoroSelector` component (lines 287-311):

```tsx
  // ─── Duration selector (replaces PomodoroSelector) ───
  const DurationSelector = ({ hours, onChange }: { hours: number; onChange: (h: number) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {PRESETS.map((preset) => (
        <span
          key={preset.label}
          tabIndex={0}
          onClick={() => onChange(preset.hours)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(preset.hours); }}
          style={{
            fontSize: '13px',
            color: hours === preset.hours ? 'var(--accent-color)' : 'var(--text-tertiary)',
            fontWeight: hours === preset.hours ? '600' : '400',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: '4px',
            background: hours === preset.hours ? 'var(--accent-light)' : 'transparent',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {preset.label}
        </span>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
        <input
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={PRESETS.some(p => p.hours === hours) ? '' : hours}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0.5 && val <= 24) onChange(val);
          }}
          placeholder="h"
          style={{
            width: '42px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            background: 'var(--surface-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            outline: 'none',
            fontFamily: 'inherit',
            padding: '2px 6px',
            textAlign: 'center',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>h</span>
      </div>
    </div>
  );
```

- [ ] **Step 2: Update state variables from pomodoro counts to hours**

Change the add-form state (line 27) from pomodoro count to hours:

```tsx
// Before (line 27):
const [targetPomodoros, setTargetPomodoros] = useState(3);

// After:
const [estimatedHours, setEstimatedHours] = useState(1.5);
```

Change the edit-form state (line 34) similarly:

```tsx
// Before (line 34):
const [editTargetPomodoros, setEditTargetPomodoros] = useState(1);

// After:
const [editEstimatedHours, setEditEstimatedHours] = useState(0.5);
```

- [ ] **Step 3: Update handleInlineCreate to convert hours → pomodoros**

Replace the `handleInlineCreate` function (lines 70-85):

```tsx
  const handleInlineCreate = async () => {
    if (!taskName.trim()) {
      setIsAdding(false);
      resetAddForm();
      return;
    }
    await createTask({
      name: taskName,
      targetPomodoros: hoursToPomodoros(estimatedHours),
      priority,
      deadline: deadline || null,
    });
    resetAddForm();
    setIsAdding(false);
    fetchActiveTasks();
  };
```

- [ ] **Step 4: Update openInlineEdit to convert pomodoros → hours**

Replace the `openInlineEdit` function (lines 116-127):

```tsx
  const openInlineEdit = (task: any) => {
    if (currentTask?.id === task.id) {
      setPendingAction({ type: 'edit', task });
      setShowConfirmDialog(true);
      return;
    }
    setEditingTaskId(task.id);
    setEditName(task.name);
    setEditEstimatedHours(pomodorosToHours(task.targetPomodoros));
    setEditPriority(task.priority);
    setEditDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
  };
```

- [ ] **Step 5: Update handleEditSave to convert hours → pomodoros**

Replace the `handleEditSave` function (lines 129-139):

```tsx
  const handleEditSave = async () => {
    if (!editName.trim() || !editingTaskId) return;
    await updateTask(editingTaskId, {
      name: editName,
      targetPomodoros: hoursToPomodoros(editEstimatedHours),
      priority: editPriority,
      deadline: editDeadline || undefined,
    });
    closeInlineEdit();
    fetchActiveTasks();
  };
```

- [ ] **Step 6: Update useEffect dependency for click-outside-save**

In the click-outside-save useEffect (line 166), replace `editTargetPomodoros` with `editEstimatedHours`:

```tsx
// Before (line 166):
}, [editingTaskId, editName, editTargetPomodoros, editPriority, editDeadline]);

// After:
}, [editingTaskId, editName, editEstimatedHours, editPriority, editDeadline]);
```

- [ ] **Step 7: Update closeInlineEdit**

Replace `closeInlineEdit` (lines 168-174):

```tsx
  const closeInlineEdit = () => {
    setEditingTaskId(null);
    setEditName("");
    setEditEstimatedHours(0.5);
    setEditPriority("medium");
    setEditDeadline("");
  };
```

- [ ] **Step 8: Update confirmAction for edit case**

In `confirmAction` (lines 187-201), update the edit branch to use hours:

```tsx
  const confirmAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'edit') {
      const { task } = pendingAction;
      setEditingTaskId(task.id);
      setEditName(task.name);
      setEditEstimatedHours(pomodorosToHours(task.targetPomodoros));
      setEditPriority(task.priority);
      setEditDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
    } else {
      await deleteTask(pendingAction.task.id);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };
```

- [ ] **Step 9: Update resetAddForm**

Replace `resetAddForm` (lines 203-208):

```tsx
  const resetAddForm = () => {
    setTaskName("");
    setEstimatedHours(1.5);
    setPriority("medium");
    setDeadline(new Date().toISOString().split('T')[0]);
  };
```

- [ ] **Step 10: Update inline add form to use DurationSelector**

In the inline add form (around line 491), replace `<PomodoroSelector ...>` with:

```tsx
// Before:
<PomodoroSelector value={targetPomodoros} onChange={setTargetPomodoros} />

// After:
<DurationSelector hours={estimatedHours} onChange={setEstimatedHours} />
```

- [ ] **Step 11: Update inline edit form to use DurationSelector**

In the inline edit form (around lines 594-597), replace the pomodoro section:

```tsx
// Before (lines 594-597):
<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', letterSpacing: '0.3px' }}>番茄数</span>
  <PomodoroSelector value={editTargetPomodoros} onChange={setEditTargetPomodoros} />
</div>

// After:
<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', letterSpacing: '0.3px' }}>预估时长</span>
  <DurationSelector hours={editEstimatedHours} onChange={setEditEstimatedHours} />
</div>
```

- [ ] **Step 12: Verify the DurationSelector works in both add and edit modes**

Run: `npm run dev`
Expected: Clicking "+" shows the new DurationSelector with preset buttons (30min, 1h, 2h, 4h) and an hour input. Clicking a task opens edit mode with the same DurationSelector showing the task's estimated hours.

- [ ] **Step 13: Commit**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat: replace PomodoroSelector with hour-based DurationSelector"
```

---

### Task 4: Update task progress display in Tasks.tsx

**Files:**
- Modify: `src/pages/Tasks.tsx`

Replace all 🍅 emoji progress displays (`🍅 2/5` style) with `TomatoIcon` + time format (`50min / 2h 30min`).

- [ ] **Step 1: Update active task progress display**

In the active task row (around lines 735-738), replace the pomodoro display:

```tsx
// Before (lines 735-738):
{task.targetPomodoros > 1 && (
  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
    🍅 {task.completedPomodoros}/{task.targetPomodoros}
  </span>
)}

// After:
{task.targetPomodoros > 1 && (
  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
    <TomatoIcon size={12} /> {formatMinutes(task.completedPomodoros * 25)} / {formatMinutes(task.targetPomodoros * ROUND_MINUTES)}
  </span>
)}
```

Also update the `hasDetails` condition — it should show for any task with pomodoros > 1 (same logic, no change needed since `hasDetails` already checks `task.targetPomodoros > 1`).

- [ ] **Step 2: Update completed task progress display**

In the completed tasks section (around lines 807-810), replace the pomodoro display:

```tsx
// Before (lines 807-810):
{task.targetPomodoros > 1 && (
  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
    🍅 {task.completedPomodoros}/{task.targetPomodoros}
  </span>
)}

// After:
{task.targetPomodoros > 1 && (
  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
    <TomatoIcon size={12} /> {formatMinutes(task.completedPomodoros * 25)}
  </span>
)}
```

Note: Completed tasks only show total completed time (no "/ total" needed since they're done).

- [ ] **Step 3: Verify task progress displays correctly**

Run: `npm run dev`
Expected: Active tasks with targetPomodoros > 1 show e.g. `<TomatoIcon/> 50min / 2h 30min`. Completed tasks show e.g. `<TomatoIcon/> 2h 30min`. No 🍅 emoji visible.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat: replace tomato emoji with TomatoIcon and time-based progress"
```

---

### Task 5: Update Timer.tsx progress display

**Files:**
- Modify: `src/pages/Timer.tsx`

Update the "当前任务" card and "其他任务" list to show time-based progress instead of pomodoro counts.

- [ ] **Step 1: Add formatting helpers to Timer.tsx**

Add these constants and function at the top of `TimerPage` function (after line 31, after `TEST_BREAK_DURATION`):

```tsx
const ROUND_MINUTES = 30; // focusDuration(25) + breakDuration(5)

const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};
```

- [ ] **Step 2: Update renderCurrentTask progress text**

In `renderCurrentTask` (around line 333), replace the progress text:

```tsx
// Before (line 333):
{currentTask.completedPomodoros}/{currentTask.targetPomodoros} 番茄钟

// After:
{formatMinutes(currentTask.completedPomodoros * 25)} / {formatMinutes(currentTask.targetPomodoros * ROUND_MINUTES)}
```

- [ ] **Step 3: Update renderOtherTasks progress text**

In `renderOtherTasks` (around line 418), replace the progress text:

```tsx
// Before (line 418):
{task.completedPomodoros}/{task.targetPomodoros}

// After:
{formatMinutes(task.completedPomodoros * 25)} / {formatMinutes(task.targetPomodoros * ROUND_MINUTES)}
```

- [ ] **Step 4: Verify Timer page shows time-based progress**

Run: `npm run dev`
Expected: Current task card shows "50min / 2h 30min" instead of "2/5 番茄钟". Other tasks list shows the same format. Progress dots remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Timer.tsx
git commit -m "feat: update Timer page to show time-based task progress"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full build to check for TypeScript errors**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`

Verify all of the following:
1. **Create task**: Click "+", see DurationSelector with 30min/1h/2h/4h presets + hour input. Default shows 1.5h (1h preset highlighted). Type task name, press Enter — task created.
2. **Preset selection**: Click "2h" preset — button highlights. Click free input, type "3", shows "3h". Presets deselect.
3. **Edit task**: Click a task, see DurationSelector with the task's estimated hours. Change and save.
4. **Task list progress**: Active tasks show `<TomatoIcon/> 25min / 1h 30min` style. No 🍅 emoji.
5. **Timer page**: Current task shows "25min / 1h 30min". Other tasks show same format. Progress dots unchanged.
6. **Completed tasks**: Show completed time with TomatoIcon.
