# Weekly and Monthly Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekly and monthly report tabs to the Stats page with comprehensive focus, task, and streak data.

**Architecture:** Extend the existing `get_stats` Rust command to return all report data in one call. Add a shared `ReportTab` React component for both weekly and monthly views. Stats page gets a 3-tab switcher (Overview / Weekly / Monthly).

**Tech Stack:** Rust + rusqlite (backend), React 19 + TypeScript (frontend), Tailwind CSS v4

---

### Task 1: Add Rust types to `db.rs`

**Files:**
- Modify: `src-tauri/src/db.rs` (after line 167, the existing `Stats` struct)

- [ ] **Step 1: Add `TaskReportItem` struct after `DailyStats` (after line 175)**

```rust
// 任务报告项
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskReportItem {
    pub task_id: i64,
    pub task_name: String,
    pub pomodoro_count: i32,
    pub focus_minutes: i32,
    pub is_completed: bool,
}
```

- [ ] **Step 2: Extend `Stats` struct with new fields**

Replace the entire `Stats` struct (lines 157-167) with:

```rust
// 统计数据
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    // 现有字段
    pub today_count: i32,
    pub today_minutes: i32,
    pub week_count: i32,
    pub week_minutes: i32,
    pub total_count: i32,
    pub total_minutes: i32,
    pub daily_data: Vec<DailyStats>,

    // 周报数据
    pub week_start_date: String,
    pub week_end_date: String,
    pub week_streak_days: i32,
    pub week_completed_tasks: i32,
    pub week_incomplete_tasks: i32,
    pub week_task_breakdown: Vec<TaskReportItem>,
    pub week_daily_data: Vec<DailyStats>,

    // 月报数据
    pub month_start_date: String,
    pub month_end_date: String,
    pub month_count: i32,
    pub month_minutes: i32,
    pub month_streak_days: i32,
    pub month_completed_tasks: i32,
    pub month_incomplete_tasks: i32,
    pub month_task_breakdown: Vec<TaskReportItem>,
    pub month_daily_data: Vec<DailyStats>,
}
```

- [ ] **Step 3: Verify Rust compiles (will fail until Task 2 is done)**

This step is just to confirm types are syntactically correct. Full compilation requires Task 2.

---

### Task 2: Extend `get_stats` command in `commands.rs`

**Files:**
- Modify: `src-tauri/src/commands.rs` (replace entire `get_stats` function, lines 287-356)

- [ ] **Step 1: Add `std::collections::HashSet` import and `NaiveDate` to chrono import**

At line 1, change:
```rust
use crate::db::*;
use crate::TrayIconState;
use rusqlite::params;
use std::collections::HashSet;
use tauri::{AppHandle, Manager, State};
use chrono::{Utc, Datelike, Duration, NaiveDate};
```

- [ ] **Step 2: Add helper function for task breakdown query (insert before `get_stats`)**

Add this function before the `get_stats` function (before line 287):

```rust
// 查询任务明细（周报/月报共用）
fn query_task_breakdown(conn: &rusqlite::Connection, start_date: &str, end_date: &str) -> Result<Vec<TaskReportItem>, String> {
    let mut stmt = conn.prepare(
        "SELECT
            COALESCE(pr.task_id, 0) as task_id,
            COALESCE(t.name, '未关联任务') as task_name,
            CASE WHEN COALESCE(t.completed, 0) = 1 THEN 1 ELSE 0 END as is_completed,
            COUNT(*) as pomodoro_count,
            COALESCE(SUM(pr.duration), 0) as focus_minutes
         FROM pomodoro_records pr
         LEFT JOIN tasks t ON pr.task_id = t.id
         WHERE pr.type = 'focus' AND date(pr.recorded_at) >= ? AND date(pr.recorded_at) <= ?
         GROUP BY pr.task_id
         ORDER BY pomodoro_count DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![start_date, end_date], |row| {
        Ok(TaskReportItem {
            task_id: row.get(0)?,
            task_name: row.get(1)?,
            is_completed: row.get::<_, i32>(2)? != 0,
            pomodoro_count: row.get(3)?,
            focus_minutes: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// 查询每日数据（周报/月报共用）
fn query_daily_data(conn: &rusqlite::Connection, start_date: &str, end_date: &str) -> Result<Vec<DailyStats>, String> {
    let mut stmt = conn.prepare(
        "SELECT date(recorded_at), COUNT(*), COALESCE(SUM(duration), 0)
         FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at) >= ? AND date(recorded_at) <= ?
         GROUP BY date(recorded_at)
         ORDER BY date(recorded_at)"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![start_date, end_date], |row| {
        Ok(DailyStats {
            date: row.get(0)?,
            count: row.get(1)?,
            minutes: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Replace entire `get_stats` function with extended version**

Replace lines 287-356 (the entire `get_stats` function) with:

```rust
// 获取统计数据
#[tauri::command]
pub fn get_stats(app: AppHandle) -> Result<Stats, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let now = Utc::now();
    let today = now.format("%Y-%m-%d").to_string();
    let year = now.year();
    let month = now.month();

    // 获取本周一
    let weekday = now.weekday();
    let days_since_monday = weekday.num_days_from_monday() as i64;
    let week_start_date = (now - Duration::days(days_since_monday)).format("%Y-%m-%d").to_string();
    let week_end_date = (now - Duration::days(days_since_monday) + Duration::days(6)).format("%Y-%m-%d").to_string();

    // 获取本月范围
    let month_start_date = format!("{:04}-{:02}-01", year, month);
    let next_month_first = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1).unwrap()
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1).unwrap()
    };
    let month_end_date = next_month_first.pred_opt().unwrap().format("%Y-%m-%d").to_string();

    // === 现有查询 ===

    // 今日统计
    let (today_count, today_minutes): (i32, i32) = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at) = ?",
        params![today],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // 本周统计
    let (week_count, week_minutes): (i32, i32) = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at) >= ?",
        params![week_start_date],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // 总计统计
    let (total_count, total_minutes): (i32, i32) = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
         WHERE type = 'focus'",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // 最近7天数据
    let mut daily_data = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT date(recorded_at), COUNT(*), COALESCE(SUM(duration), 0)
         FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at) >= date('now', '-6 days')
         GROUP BY date(recorded_at)
         ORDER BY date(recorded_at)"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(DailyStats {
            date: row.get(0)?,
            count: row.get(1)?,
            minutes: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    for row in rows {
        let ds = row.map_err(|e| e.to_string())?;
        daily_data.push(ds);
    }

    // === 新增：连续专注天数 ===
    let mut focus_dates_stmt = conn.prepare(
        "SELECT DISTINCT date(recorded_at) FROM pomodoro_records WHERE type = 'focus'"
    ).map_err(|e| e.to_string())?;

    let focus_dates: HashSet<String> = focus_dates_stmt.query_map([], |row| {
        row.get::<_, String>(0)
    }).map_err(|e| e.to_string())?
    .collect::<Result<HashSet<_>, _>>()
    .map_err(|e| e.to_string())?;

    let mut streak_days: i32 = 0;
    let mut check_date = now;
    for _ in 0..365 {
        let date_str = check_date.format("%Y-%m-%d").to_string();
        if focus_dates.contains(&date_str) {
            streak_days += 1;
            check_date = check_date - Duration::days(1);
        } else {
            break;
        }
    }

    // === 新增：周报数据 ===
    let week_task_breakdown = query_task_breakdown(&conn, &week_start_date, &week_end_date)?;
    let week_daily_data = query_daily_data(&conn, &week_start_date, &week_end_date)?;

    let week_completed_tasks = week_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && item.is_completed).count() as i32;
    let week_incomplete_tasks = week_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && !item.is_completed).count() as i32;

    // === 新增：月报数据 ===
    let (month_count, month_minutes): (i32, i32) = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at) >= ? AND date(recorded_at) <= ?",
        params![month_start_date, month_end_date],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let month_task_breakdown = query_task_breakdown(&conn, &month_start_date, &month_end_date)?;
    let month_daily_data = query_daily_data(&conn, &month_start_date, &month_end_date)?;

    let month_completed_tasks = month_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && item.is_completed).count() as i32;
    let month_incomplete_tasks = month_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && !item.is_completed).count() as i32;

    Ok(Stats {
        today_count,
        today_minutes,
        week_count,
        week_minutes,
        total_count,
        total_minutes,
        daily_data,
        week_start_date,
        week_end_date,
        week_streak_days: streak_days,
        week_completed_tasks,
        week_incomplete_tasks,
        week_task_breakdown,
        week_daily_data,
        month_start_date,
        month_end_date,
        month_count,
        month_minutes,
        month_streak_days: streak_days,
        month_completed_tasks,
        month_incomplete_tasks,
        month_task_breakdown,
        month_daily_data,
    })
}
```

- [ ] **Step 4: Verify Rust compiles**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/commands.rs
git commit -m "feat: extend get_stats with weekly/monthly report data"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `src/types/index.ts` (after line 80, the existing `Stats` interface)

- [ ] **Step 1: Add `TaskReportItem` interface after `DailyStats` (after line 87)**

```typescript
// 任务报告项
export interface TaskReportItem {
  taskId: number;
  taskName: string;
  pomodoroCount: number;
  focusMinutes: number;
  isCompleted: boolean;
}
```

- [ ] **Step 2: Extend `Stats` interface with new fields**

Replace the entire `Stats` interface (lines 72-80) with:

```typescript
// 统计数据
export interface Stats {
  todayCount: number;
  todayMinutes: number;
  weekCount: number;
  weekMinutes: number;
  totalCount: number;
  totalMinutes: number;
  dailyData: DailyStats[];

  // 周报数据
  weekStartDate: string;
  weekEndDate: string;
  weekStreakDays: number;
  weekCompletedTasks: number;
  weekIncompleteTasks: number;
  weekTaskBreakdown: TaskReportItem[];
  weekDailyData: DailyStats[];

  // 月报数据
  monthStartDate: string;
  monthEndDate: string;
  monthCount: number;
  monthMinutes: number;
  monthStreakDays: number;
  monthCompletedTasks: number;
  monthIncompleteTasks: number;
  monthTaskBreakdown: TaskReportItem[];
  monthDailyData: DailyStats[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: May have errors until userStore is updated (Task 4). Type errors in Stats.tsx are expected until Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TaskReportItem type and extend Stats interface"
```

---

### Task 4: Update `userStore.ts` to use streak days

**Files:**
- Modify: `src/stores/userStore.ts` (line 87)

- [ ] **Step 1: Replace hardcoded `streakDays: 0` with value from stats**

On line 87, change:
```typescript
          streakDays: 0, // TODO: 计算连续天数
```
to:
```typescript
          streakDays: stats.weekStreakDays,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in userStore.ts. Stats.tsx errors are expected until Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/stores/userStore.ts
git commit -m "feat: use streak days from stats data"
```

---

### Task 5: Add `ReportTab` component

**Files:**
- Create: `src/components/stats/ReportTab.tsx`

This is a shared component used by both the weekly and monthly report tabs.

- [ ] **Step 1: Create `ReportTab.tsx`**

```tsx
import type { TaskReportItem, DailyStats } from "../../types";

interface ReportTabProps {
  title: string;
  dateRange: string;
  count: number;
  minutes: number;
  streakDays: number;
  completedTasks: number;
  incompleteTasks: number;
  taskBreakdown: TaskReportItem[];
  dailyData: DailyStats[];
  allDays: string[];
}

export default function ReportTab({
  title,
  dateRange,
  count,
  minutes,
  streakDays,
  completedTasks,
  incompleteTasks,
  taskBreakdown,
  dailyData,
  allDays,
}: ReportTabProps) {
  const isWeekly = allDays.length <= 7;
  const barWidth = isWeekly ? "26px" : "8px";

  // 构建图表数据：每个日期对应的数据
  const chartData = allDays.map((date) => {
    const found = dailyData.find((d) => d.date === date);
    const mins = found?.minutes || 0;
    const standardMinutes = 480;
    const heightPercent = (mins / standardMinutes) * 100;
    const adjustedHeight = mins > 0 ? Math.max(10, Math.min(100, heightPercent)) : 5;
    const hours = mins > 0 ? (mins / 60).toFixed(1) : "0";

    const d = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let shortLabel: string;
    if (isWeekly) {
      if (d.getTime() === today.getTime()) shortLabel = "今天";
      else if (d.getTime() === yesterday.getTime()) shortLabel = "昨天";
      else shortLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      // 月报：只在 1号、5号、10号、15号、20号、25号 和最后一天显示标签
      const day = d.getDate();
      const lastDay = allDays.length;
      if (day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 25 || day === lastDay) {
        shortLabel = `${day}`;
      } else {
        shortLabel = "";
      }
    }

    return { date, mins, hours, height: adjustedHeight, shortLabel };
  });

  return (
    <div>
      {/* 周期标题 */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>{title}</span>
        <span style={{ fontSize: "12px", color: "#999" }}>{dateRange}</span>
      </div>

      {/* 汇总卡片 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {count}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>番茄数</span>
        </div>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {minutes > 0 ? (minutes / 60).toFixed(1) + "h" : "0h"}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>专注时长</span>
        </div>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {streakDays}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>连续天数</span>
        </div>
      </div>

      {/* 任务完成概要 */}
      <div style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
        border: "1px solid #FFECE0",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>📋</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#2C2C2C" }}>任务完成情况</span>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
          <span style={{ color: "#4CAF50" }}>已完成 {completedTasks}</span>
          <span style={{ color: "#FF9800" }}>进行中 {incompleteTasks}</span>
        </div>
      </div>

      {/* 每日柱状图 */}
      <div className="card chart-section" style={{ padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <div style={{
            fontSize: "16px",
            marginRight: "6px",
            width: "24px",
            height: "24px",
            background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: "1",
          }}>
            📈
          </div>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
            {isWeekly ? "每日专注" : "本月每日专注"}
          </span>
        </div>

        <div style={{
          borderRadius: "8px",
          padding: "12px 4px 10px",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: "160px",
          }}>
            {chartData.map((data) => (
              <div key={data.date} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                padding: "0 1px",
              }}>
                <div style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: "100%",
                }}>
                  {data.mins > 0 && (
                    <div style={{
                      width: barWidth,
                      minHeight: "6px",
                      background: "linear-gradient(180deg, #FF6B6B 0%, #FFA94D 100%)",
                      borderRadius: isWeekly ? "6px 6px 0 0" : "3px 3px 0 0",
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      transition: "height 0.5s ease",
                      boxShadow: "0 2px 6px rgba(255, 107, 107, 0.25)",
                      height: `${Math.max(data.height, 6)}%`,
                    }}>
                      {isWeekly && (
                        <span style={{
                          position: "absolute",
                          top: "-14px",
                          fontSize: "11px",
                          color: "#FF6B6B",
                          fontWeight: "700",
                          textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
                        }}>
                          {data.hours}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {data.shortLabel && (
                  <span style={{
                    fontSize: isWeekly ? "10px" : "9px",
                    color: "#666",
                    marginTop: "8px",
                    fontWeight: "500",
                  }}>
                    {data.shortLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务投入明细 */}
      {taskBreakdown.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #FFECE0",
          marginTop: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <div style={{
              fontSize: "16px",
              marginRight: "6px",
              width: "24px",
              height: "24px",
              background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: "1",
            }}>
              🍅
            </div>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>任务投入明细</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {taskBreakdown.map((task) => (
              <div key={task.taskId} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#f8f8f8",
                borderRadius: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: task.isCompleted ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 152, 0, 0.1)",
                    color: task.isCompleted ? "#4CAF50" : "#FF9800",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}>
                    {task.isCompleted ? "已完成" : "进行中"}
                  </span>
                  <span style={{
                    fontSize: "13px",
                    color: "#2C2C2C",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {task.taskName}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexShrink: 0 }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {task.pomodoroCount} 番茄
                  </span>
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    {task.focusMinutes > 0 ? (task.focusMinutes / 60).toFixed(1) + "h" : "0h"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/stats/ReportTab.tsx
git commit -m "feat: add shared ReportTab component for weekly/monthly reports"
```

---

### Task 6: Rewrite `Stats.tsx` with tab switching

**Files:**
- Modify: `src/pages/Stats.tsx` (replace entire file)

- [ ] **Step 1: Replace entire `Stats.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useUserStore } from "../stores/userStore";
import ReportTab from "../components/stats/ReportTab";

type StatsTab = "overview" | "weekly" | "monthly";

export default function StatsPage() {
  const { stats, fetchStats } = useUserStore();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-gray">加载中...</span>
      </div>
    );
  }

  // 格式化日期范围显示
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
  };

  // 生成周报的所有天（周一到周日）
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(stats.weekStartDate + "T00:00:00");
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // 生成月报的所有天
  const startDate = new Date(stats.monthStartDate + "T00:00:00");
  const endDate = new Date(stats.monthEndDate + "T00:00:00");
  const totalDays = endDate.getDate();
  const monthDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // === 概览 Tab 内容（保持原有逻辑） ===
  const renderOverview = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const chartData = last7Days.map((date) => {
      const found = stats.dailyData.find((d) => d.date === date);
      const minutes = found?.minutes || 0;
      const standardMinutes = 480;
      const heightPercent = (minutes / standardMinutes) * 100;
      const adjustedHeight = minutes > 0 ? Math.max(10, Math.min(100, heightPercent)) : 5;
      const hours = minutes > 0 ? (minutes / 60).toFixed(1) : "0";

      return {
        date,
        count: found?.count || 0,
        minutes,
        hours,
        height: adjustedHeight,
        shortLabel: (() => {
          const d = new Date(date);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (d.toDateString() === today.toDateString()) return "今天";
          if (d.toDateString() === yesterday.toDateString()) return "昨天";
          return `${d.getMonth() + 1}/${d.getDate()}`;
        })(),
      };
    });

    return (
      <>
        {/* 统计数据 */}
        <div className="total-section" style={{ marginBottom: "12px" }}>
          <div className="total-header" style={{ padding: "8px 0" }}>
            <span className="total-title" style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
              统计数据
            </span>
          </div>
          <div className="total-cards" style={{ display: "flex", gap: "8px" }}>
            <div className="total-card card" style={{
              flex: 1,
              background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
              borderRadius: "10px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
              border: "1px solid #FFECE0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <div className="total-icon-wrapper" style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}>
                <span className="total-icon" style={{ fontSize: "20px", lineHeight: "1" }}>📅</span>
              </div>
              <span className="total-label" style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px", fontWeight: "500" }}>
                今日专注
              </span>
              <span className="total-value" style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#FF6B6B",
                display: "block",
                marginBottom: "4px",
              }}>
                {stats.todayMinutes > 0 ? (stats.todayMinutes / 60).toFixed(1) + "h" : "0h"}
              </span>
              <div className="total-pomodoro" style={{
                display: "flex",
                alignItems: "baseline",
                gap: "3px",
                padding: "4px 8px",
                background: "rgba(255, 107, 107, 0.08)",
                borderRadius: "10px",
              }}>
                <span className="pomodoro-number" style={{ fontSize: "14px", fontWeight: "700", color: "#FF6B6B" }}>
                  {stats.todayCount}
                </span>
                <span className="pomodoro-unit" style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.85 }}>
                  个番茄钟
                </span>
              </div>
            </div>

            <div className="total-card card" style={{
              flex: 1,
              background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
              borderRadius: "10px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
              border: "1px solid #FFECE0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <div className="total-icon-wrapper" style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}>
                <span className="total-icon" style={{ fontSize: "20px", lineHeight: "1" }}>📊</span>
              </div>
              <span className="total-label" style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px", fontWeight: "500" }}>
                本周专注
              </span>
              <span className="total-value" style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#FF6B6B",
                display: "block",
              }}>
                {stats.weekMinutes > 0 ? (stats.weekMinutes / 60).toFixed(1) + "h" : "0h"}
              </span>
              <div className="total-pomodoro" style={{
                display: "flex",
                alignItems: "baseline",
                gap: "3px",
                padding: "4px 8px",
                background: "rgba(255, 107, 107, 0.08)",
                borderRadius: "10px",
              }}>
                <span className="pomodoro-number" style={{ fontSize: "14px", fontWeight: "700", color: "#FF6B6B" }}>
                  {stats.weekCount}
                </span>
                <span className="pomodoro-unit" style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.85 }}>
                  个番茄钟
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 历史柱状图 */}
        <div className="card chart-section" style={{ padding: "14px" }}>
          <div className="section-header" style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
            <div className="section-icon" style={{
              fontSize: "16px",
              marginRight: "6px",
              width: "24px",
              height: "24px",
              background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: "1",
            }}>
              📈
            </div>
            <span className="section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
              最近7天
            </span>
          </div>

          <div className="chart-container" style={{
            borderRadius: "8px",
            padding: "12px 4px 10px",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
          }}>
            <div className="chart-bars" style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: "160px",
            }}>
              {chartData.map((data) => (
                <div key={data.date} className="chart-bar-item" style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  padding: "0 2px",
                }}>
                  <div className="bar-wrapper" style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    height: "100%",
                  }}>
                    {data.minutes > 0 && (
                      <div className="bar-fill" style={{
                        width: "26px",
                        minHeight: "6px",
                        background: "linear-gradient(180deg, #FF6B6B 0%, #FFA94D 100%)",
                        borderRadius: "6px 6px 0 0",
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        transition: "height 0.5s ease",
                        boxShadow: "0 2px 6px rgba(255, 107, 107, 0.25)",
                        height: `${Math.max(data.height, 6)}%`,
                      }}>
                        <span className="bar-value" style={{
                          position: "absolute",
                          top: "-14px",
                          fontSize: "11px",
                          color: "#FF6B6B",
                          fontWeight: "700",
                          textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
                        }}>
                          {data.hours}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="bar-label" style={{ fontSize: "10px", color: "#666", marginTop: "8px", fontWeight: "500" }}>
                    {data.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 总计统计 */}
        <div className="card" style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #FFECE0",
          marginBottom: "12px",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C", marginBottom: "12px" }}>
            总统计数据
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f8f8f8", borderRadius: "6px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px" }}>🍅</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>总番茄数</p>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>{stats.totalCount}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f8f8f8", borderRadius: "6px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px" }}>⏱</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>总专注时长</p>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
                  {stats.totalMinutes > 0 ? (stats.totalMinutes / 60).toFixed(1) + "h" : "0h"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const tabs: { key: StatsTab; label: string }[] = [
    { key: "overview", label: "概览" },
    { key: "weekly", label: "周报" },
    { key: "monthly", label: "月报" },
  ];

  return (
    <div>
      {/* Tab 切换栏 */}
      <div style={{
        display: "flex",
        background: "#f5f5f5",
        borderRadius: "10px",
        padding: "3px",
        marginBottom: "14px",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? "600" : "400",
              color: activeTab === tab.key ? "#FF6B6B" : "#999",
              background: activeTab === tab.key ? "#fff" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === "overview" && renderOverview()}

      {activeTab === "weekly" && (
        <ReportTab
          title="本周报告"
          dateRange={formatDateRange(stats.weekStartDate, stats.weekEndDate)}
          count={stats.weekCount}
          minutes={stats.weekMinutes}
          streakDays={stats.weekStreakDays}
          completedTasks={stats.weekCompletedTasks}
          incompleteTasks={stats.weekIncompleteTasks}
          taskBreakdown={stats.weekTaskBreakdown}
          dailyData={stats.weekDailyData}
          allDays={weekDays}
        />
      )}

      {activeTab === "monthly" && (
        <ReportTab
          title="本月报告"
          dateRange={formatDateRange(stats.monthStartDate, stats.monthEndDate)}
          count={stats.monthCount}
          minutes={stats.monthMinutes}
          streakDays={stats.monthStreakDays}
          completedTasks={stats.monthCompletedTasks}
          incompleteTasks={stats.monthIncompleteTasks}
          taskBreakdown={stats.monthTaskBreakdown}
          dailyData={stats.monthDailyData}
          allDays={monthDays}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify full app builds and runs**

Run: `npm run tauri dev`
Expected: App starts, Stats page shows 3 tabs, switching tabs shows the correct content.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Stats.tsx
git commit -m "feat: add tab switching and weekly/monthly reports to Stats page"
```
