use crate::db::*;
use crate::TrayIconState;
use rusqlite::params;
use std::collections::HashSet;
use tauri::{AppHandle, Manager, State};
use chrono::{Local, Datelike, Duration, NaiveDate};

const PET_WINDOW_SIZE: i32 = 180;
const PET_WINDOW_MARGIN: i32 = 24;

// 获取任务列表
#[tauri::command]
pub fn get_tasks(
    app: AppHandle,
    completed: bool,
    page: i32,
    page_size: i32,
) -> Result<Vec<Task>, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let offset = (page - 1) * page_size;

    let mut stmt = conn.prepare(
        "SELECT id, name, duration_target, completed_minutes, completed,
         priority, deadline, created_at, updated_at
         FROM tasks WHERE completed = ?
         ORDER BY CASE priority
             WHEN 'high' THEN 0
             WHEN 'medium' THEN 1
             WHEN 'low' THEN 2
             ELSE 1
         END, created_at DESC
         LIMIT ? OFFSET ?"
    ).map_err(|e| e.to_string())?;

    let tasks = stmt.query_map(params![completed, page_size, offset], |row| {
        Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            duration_target: row.get(2)?,
            completed_minutes: row.get(3)?,
            completed: row.get(4)?,
            priority: row.get(5)?,
            deadline: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(tasks)
}

// 创建任务
#[tauri::command]
pub fn create_task(app: AppHandle, task: NewTask) -> Result<Task, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    conn.execute(
        "INSERT INTO tasks (name, duration_target, priority, deadline)
         VALUES (?, ?, ?, ?)",
        params![task.name, task.duration_target, task.priority, task.deadline],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let task = conn.query_row(
        "SELECT id, name, duration_target, completed_minutes, completed,
         priority, deadline, created_at, updated_at FROM tasks WHERE id = ?",
        params![id],
        |row| Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            duration_target: row.get(2)?,
            completed_minutes: row.get(3)?,
            completed: row.get(4)?,
            priority: row.get(5)?,
            deadline: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(task)
}

// 更新任务
#[tauri::command]
pub fn update_task(app: AppHandle, updates: UpdateTask) -> Result<Task, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 构建动态更新语句
    let mut set_parts = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(name) = &updates.name {
        set_parts.push("name = ?");
        params.push(name.clone());
    }
    if let Some(target) = &updates.duration_target {
        set_parts.push("duration_target = ?");
        params.push(target.to_string());
    }
    if let Some(completed) = &updates.completed_minutes {
        set_parts.push("completed_minutes = ?");
        params.push(completed.to_string());
    }
    if let Some(completed) = &updates.completed {
        set_parts.push("completed = ?");
        params.push(if *completed { "1".to_string() } else { "0".to_string() });
    }
    if let Some(priority) = &updates.priority {
        set_parts.push("priority = ?");
        params.push(priority.clone());
    }
    if let Some(Some(deadline)) = &updates.deadline {
        set_parts.push("deadline = ?");
        params.push(deadline.clone());
    } else if updates.deadline.is_some() {
        set_parts.push("deadline = NULL");
    }

    set_parts.push("updated_at = datetime('now')");

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ?",
        set_parts.join(", ")
    );
    params.push(updates.id.to_string());

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .collect();

    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| e.to_string())?;

    let task = conn.query_row(
        "SELECT id, name, duration_target, completed_minutes, completed,
         priority, deadline, created_at, updated_at FROM tasks WHERE id = ?",
        params![updates.id],
        |row| Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            duration_target: row.get(2)?,
            completed_minutes: row.get(3)?,
            completed: row.get(4)?,
            priority: row.get(5)?,
            deadline: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(task)
}

// 删除任务
#[tauri::command]
pub fn delete_task(app: AppHandle, id: i64) -> Result<(), String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    conn.execute("DELETE FROM tasks WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// 获取用户配置
#[tauri::command]
pub fn get_user_config(app: AppHandle) -> Result<UserConfig, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let config = conn.query_row(
        "SELECT id, focus_duration, break_duration, enable_notifications,
         enable_sound, theme, updated_at,
         COALESCE(long_break_duration, 15),
         COALESCE(auto_start, 0),
         COALESCE(daily_goal, 2.0),
         COALESCE(auto_launch, 0),
         COALESCE(show_desktop_pet, 0),
         COALESCE(show_daily_goal, 1)
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
            show_desktop_pet: row.get(11)?,
            show_daily_goal: row.get(12)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(config)
}

// 更新用户配置
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
    daily_goal: Option<f64>,
    auto_launch: Option<bool>,
    show_desktop_pet: Option<bool>,
    show_daily_goal: Option<bool>,
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
        if let Some(s) = show_desktop_pet {
            set_parts.push("show_desktop_pet = ?");
            params.push(if s { "1".to_string() } else { "0".to_string() });
        }
        if let Some(s) = show_daily_goal {
            set_parts.push("show_daily_goal = ?");
            params.push(if s { "1".to_string() } else { "0".to_string() });
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
    } // conn 在这里被释放

    get_user_config(app)
}

// 重置用户配置为默认值
#[tauri::command]
pub fn reset_user_config(app: AppHandle) -> Result<UserConfig, String> {
    {
        let db_guard = app.state::<DbConnection>();
        let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

        conn.execute(
            "UPDATE user_config SET
                focus_duration = 25,
                break_duration = 5,
                enable_notifications = 0,
                enable_sound = 1,
                theme = 'light',
                long_break_duration = 15,
                auto_start = 0,
                daily_goal = 4.0,
                auto_launch = 0,
                show_desktop_pet = 1,
                show_daily_goal = 1,
                updated_at = datetime('now')
             WHERE id = 1",
            [],
        ).map_err(|e| e.to_string())?;
    }

    get_user_config(app)
}

// 记录番茄钟
#[tauri::command]
pub fn record_pomodoro(app: AppHandle, record: NewPomodoroRecord) -> Result<PomodoroRecord, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    conn.execute(
        "INSERT INTO pomodoro_records (task_id, duration, type) VALUES (?, ?, ?)",
        params![record.task_id, record.duration, record.r#type],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // 如果关联了任务，更新任务进度
    if let Some(task_id) = record.task_id {
        if record.r#type == "focus" {
            conn.execute(
                "UPDATE tasks SET completed_minutes = completed_minutes + ?,
                 updated_at = datetime('now')
                 WHERE id = ?",
                params![record.duration, task_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    let record = conn.query_row(
        "SELECT id, task_id, duration, type, recorded_at FROM pomodoro_records WHERE id = ?",
        params![id],
        |row| Ok(PomodoroRecord {
            id: row.get(0)?,
            task_id: row.get(1)?,
            duration: row.get(2)?,
            r#type: row.get(3)?,
            recorded_at: row.get(4)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(record)
}

// 查询任务明细（周报/月报共用）
fn query_task_breakdown(conn: &rusqlite::Connection, start_date: &str, end_date: &str) -> Result<Vec<TaskReportItem>, String> {
    let mut stmt = conn.prepare(
        "SELECT
            COALESCE(pr.task_id, 0) as task_id,
            COALESCE(t.name, '未关联任务') as task_name,
            CASE WHEN COALESCE(t.completed, 0) = 1 THEN 1 ELSE 0 END as is_completed,
            COUNT(*) as session_count,
            COALESCE(SUM(pr.duration), 0) as focus_minutes
         FROM pomodoro_records pr
         LEFT JOIN tasks t ON pr.task_id = t.id
         WHERE pr.type = 'focus' AND date(pr.recorded_at, 'localtime') >= ? AND date(pr.recorded_at, 'localtime') <= ?
         GROUP BY pr.task_id
         ORDER BY session_count DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![start_date, end_date], |row| {
        Ok(TaskReportItem {
            task_id: row.get(0)?,
            task_name: row.get(1)?,
            is_completed: row.get::<_, i32>(2)? != 0,
            session_count: row.get(3)?,
            focus_minutes: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// 查询每日数据（周报/月报共用）
fn query_daily_data(conn: &rusqlite::Connection, start_date: &str, end_date: &str) -> Result<Vec<DailyStats>, String> {
    let mut stmt = conn.prepare(
        "SELECT date(recorded_at, 'localtime'), COUNT(*), COALESCE(SUM(duration), 0)
         FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at, 'localtime') >= ? AND date(recorded_at, 'localtime') <= ?
         GROUP BY date(recorded_at, 'localtime')
         ORDER BY date(recorded_at, 'localtime')"
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

// 获取统计数据
#[tauri::command]
pub fn get_stats(app: AppHandle) -> Result<Stats, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let now = Local::now();
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
         WHERE type = 'focus' AND date(recorded_at, 'localtime') = ?",
        params![today],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // 本周统计
    let (week_count, week_minutes): (i32, i32) = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at, 'localtime') >= ?",
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
        "SELECT date(recorded_at, 'localtime'), COUNT(*), COALESCE(SUM(duration), 0)
         FROM pomodoro_records
         WHERE type = 'focus' AND date(recorded_at, 'localtime') >= date('now', 'localtime', '-6 days')
         GROUP BY date(recorded_at, 'localtime')
         ORDER BY date(recorded_at, 'localtime')"
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

    // === 新增：今日报告数据 ===
    let today_task_breakdown = query_task_breakdown(&conn, &today, &today)?;

    let today_completed_tasks = today_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && item.is_completed).count() as i32;
    let today_incomplete_tasks = today_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && !item.is_completed).count() as i32;

    // 今日时段统计：上午(6-12), 下午(12-18), 晚上(18-24), 深夜(0-6)
    let segments = [
        ("上午", 6, 12),
        ("下午", 12, 18),
        ("晚上", 18, 24),
        ("深夜", 0, 6),
    ];

    let mut today_hourly_data = Vec::new();
    for (label, start, end) in &segments {
        let (count, minutes): (i32, i32) = if *start < *end {
            conn.query_row(
                "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
                 WHERE type = 'focus' AND date(recorded_at, 'localtime') = ? AND strftime('%H', recorded_at, 'localtime') >= ? AND strftime('%H', recorded_at, 'localtime') < ?",
                params![today, format!("{:02}", start), format!("{:02}", end)],
                |row| Ok((row.get(0)?, row.get(1)?)),
            ).unwrap_or((0, 0))
        } else {
            // 深夜: 0-6 (跨越午夜的前半段)
            conn.query_row(
                "SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM pomodoro_records
                 WHERE type = 'focus' AND date(recorded_at, 'localtime') = ? AND (strftime('%H', recorded_at, 'localtime') >= ? OR strftime('%H', recorded_at, 'localtime') < ?)",
                params![today, format!("{:02}", start), format!("{:02}", end)],
                |row| Ok((row.get(0)?, row.get(1)?)),
            ).unwrap_or((0, 0))
        };
        today_hourly_data.push(HourlySegment {
            label: label.to_string(),
            start_hour: *start,
            count,
            minutes,
        });
    }

    // === 新增：连续专注天数 ===
    let mut focus_dates_stmt = conn.prepare(
        "SELECT DISTINCT date(recorded_at, 'localtime') FROM pomodoro_records WHERE type = 'focus'"
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
         WHERE type = 'focus' AND date(recorded_at, 'localtime') >= ? AND date(recorded_at, 'localtime') <= ?",
        params![month_start_date, month_end_date],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let month_task_breakdown = query_task_breakdown(&conn, &month_start_date, &month_end_date)?;
    let month_daily_data = query_daily_data(&conn, &month_start_date, &month_end_date)?;

    let month_completed_tasks = month_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && item.is_completed).count() as i32;
    let month_incomplete_tasks = month_task_breakdown.iter()
        .filter(|item| item.task_id > 0 && !item.is_completed).count() as i32;

    // === 读取每日目标 ===
    let daily_goal: f64 = conn.query_row(
        "SELECT COALESCE(daily_goal, 2.0) FROM user_config WHERE id = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(2.0);

    Ok(Stats {
        today_count,
        today_minutes,
        week_count,
        week_minutes,
        total_count,
        total_minutes,
        daily_data,
        today_completed_tasks,
        today_incomplete_tasks,
        today_task_breakdown,
        today_hourly_data,
        daily_goal,
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

// 获取应用状态
#[tauri::command]
pub fn get_state(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let result = conn.query_row(
        "SELECT value FROM app_state WHERE key = ?",
        params![key],
        |row| row.get(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// 设置应用状态
#[tauri::command]
pub fn set_state(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)",
        params![key, value],
    ).map_err(|e| e.to_string())?;

    Ok(())
}


// 导出数据到 JSON 文件
#[tauri::command]
pub fn export_data(app: AppHandle, path: String) -> Result<(), String> {
    let (pomodoro_records, tasks) = {
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
            "SELECT id, name, duration_target, completed_minutes, completed,
             priority, deadline, created_at, updated_at FROM tasks ORDER BY id"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                name: row.get(1)?,
                duration_target: row.get(2)?,
                completed_minutes: row.get(3)?,
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

        (pomodoro_records, tasks)
    }; // lock is released here

    // 读取用户配置（在锁释放后）
    let user_config = get_user_config(app.clone())?;

    let data = ExportData {
        version: 1,
        exported_at: Local::now().to_rfc3339(),
        pomodoro_records,
        tasks,
        user_config,
    };

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}

// 从 JSON 文件导入数据
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
            "INSERT INTO tasks (id, name, duration_target, completed_minutes, completed, priority, deadline, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![task.id, task.name, task.duration_target, task.completed_minutes,
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
         long_break_duration = ?, auto_start = ?, daily_goal = ?, auto_launch = ?,
         show_desktop_pet = ?, show_daily_goal = ?
         WHERE id = 1",
        params![uc.focus_duration, uc.break_duration, uc.enable_notifications,
                uc.enable_sound, uc.theme, uc.long_break_duration, uc.auto_start,
                uc.daily_goal, uc.auto_launch, uc.show_desktop_pet, uc.show_daily_goal],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch("COMMIT").map_err(|e| e.to_string())?;

    Ok(())
}

// 更新菜单栏标题（显示计时时间或恢复图标）
#[tauri::command]
pub fn update_tray_title(state: State<TrayIconState>, title: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        state.update_tray(&title);
    }
    Ok(())
}

// 切换桌面宠物窗口显示/隐藏
#[tauri::command]
pub fn toggle_pet_window(app: AppHandle, show: bool) -> Result<(), String> {
    apply_pet_window_visibility(&app, show)
}

pub fn sync_pet_window_with_config(app: &AppHandle) -> Result<(), String> {
    let show = {
        let db_guard = app.state::<DbConnection>();
        let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        conn.query_row(
            "SELECT COALESCE(show_desktop_pet, 0) FROM user_config WHERE id = 1",
            [],
            |row| row.get::<_, bool>(0),
        )
        .map_err(|e| format!("Failed to read desktop pet config: {}", e))?
    };

    apply_pet_window_visibility(app, show)
}

pub fn apply_pet_window_visibility(app: &AppHandle, show: bool) -> Result<(), String> {
    let pet_window = app
        .get_webview_window("pet")
        .ok_or_else(|| "Desktop pet window was not created".to_string())?;

    if show {
        let monitors = app
            .available_monitors()
            .map_err(|e| format!("Failed to read monitor info: {}", e))?;
        let position = saved_pet_position(&app)
            .filter(|pos| is_pet_position_visible(pos, &monitors))
            .unwrap_or(default_pet_position(&app)?);

        pet_window
            .set_position(tauri::Position::Physical(position))
            .map_err(|e| format!("Failed to position desktop pet: {}", e))?;
        pet_window
            .set_always_on_top(true)
            .map_err(|e| format!("Failed to keep desktop pet on top: {}", e))?;
        pet_window
            .set_ignore_cursor_events(false)
            .map_err(|e| format!("Failed to enable desktop pet interaction: {}", e))?;
        pet_window
            .show()
            .map_err(|e| format!("Failed to show desktop pet: {}", e))?;
    } else {
        pet_window
            .hide()
            .map_err(|e| format!("Failed to hide desktop pet: {}", e))?;
    }

    Ok(())
}

fn saved_pet_position(app: &AppHandle) -> Option<tauri::PhysicalPosition<i32>> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().ok()?;
    let pos_json = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = 'pet_position'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()?;
    let pos = serde_json::from_str::<serde_json::Value>(&pos_json).ok()?;
    let x = pos["x"].as_i64()?.try_into().ok()?;
    let y = pos["y"].as_i64()?.try_into().ok()?;

    Some(tauri::PhysicalPosition::new(x, y))
}

fn is_pet_position_visible(
    pos: &tauri::PhysicalPosition<i32>,
    monitors: &[tauri::Monitor],
) -> bool {
    monitors.iter().any(|monitor| {
        let origin = monitor.position();
        let size = monitor.size();
        let left = origin.x;
        let top = origin.y;
        let right = left + size.width as i32;
        let bottom = top + size.height as i32;

        pos.x >= left
            && pos.y >= top
            && pos.x + PET_WINDOW_SIZE <= right
            && pos.y + PET_WINDOW_SIZE <= bottom
    })
}

fn default_pet_position(app: &AppHandle) -> Result<tauri::PhysicalPosition<i32>, String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| format!("Failed to read primary monitor: {}", e))?
        .or_else(|| app.available_monitors().ok().and_then(|mut monitors| monitors.pop()))
        .ok_or_else(|| "No monitor available for desktop pet".to_string())?;
    let origin = monitor.position();
    let size = monitor.size();
    let max_x = origin.x + size.width as i32 - PET_WINDOW_SIZE - PET_WINDOW_MARGIN;
    let max_y = origin.y + size.height as i32 - PET_WINDOW_SIZE - PET_WINDOW_MARGIN;

    Ok(tauri::PhysicalPosition::new(
        max_x.max(origin.x + PET_WINDOW_MARGIN),
        max_y.max(origin.y + PET_WINDOW_MARGIN),
    ))
}

// 惰性新陈代谢计算：根据时间差扣除重量
fn compute_metabolism(conn: &rusqlite::Connection) -> Result<CatState, String> {
    let state: CatState = conn.query_row(
        "SELECT weight, food_inventory, last_fed_at, last_metabolism_at FROM cat_state WHERE id = 1",
        [],
        |row| Ok(CatState {
            weight: row.get(0)?,
            food_inventory: row.get(1)?,
            last_fed_at: row.get(2)?,
            last_metabolism_at: row.get(3)?,
        }),
    ).map_err(|e| e.to_string())?;

    // 计算时间差（小时）
    let last_time = chrono::NaiveDateTime::parse_from_str(&state.last_metabolism_at, "%Y-%m-%d %H:%M:%S")
        .map_err(|e| format!("Parse last_metabolism_at error: {}", e))?;
    let now = chrono::Local::now().naive_utc();
    let hours_diff = (now - last_time).num_seconds() as f64 / 3600.0;

    if hours_diff > 0.0 {
        // 每天消耗 0.3kg = 每小时 0.3/24 = 0.0125kg
        let consumption = hours_diff * (0.3 / 24.0);
        let new_weight = (state.weight - consumption).max(1.0);

        conn.execute(
            "UPDATE cat_state SET weight = ?, last_metabolism_at = datetime('now') WHERE id = 1",
            params![new_weight],
        ).map_err(|e| e.to_string())?;

        Ok(CatState {
            weight: new_weight,
            food_inventory: state.food_inventory,
            last_fed_at: state.last_fed_at,
            last_metabolism_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        })
    } else {
        Ok(state)
    }
}

// 获取猫咪状态
#[tauri::command]
pub fn get_cat_state(app: AppHandle) -> Result<CatState, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    compute_metabolism(&conn)
}

// 喂食猫咪
#[tauri::command]
pub fn feed_cat(app: AppHandle) -> Result<CatState, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 先计算新陈代谢
    let current = compute_metabolism(&conn)?;

    if current.food_inventory <= 0 {
        return Err("没有罐头了".to_string());
    }
    if current.weight >= 10.0 {
        return Err("猫咪已经太胖了，不能再喂了".to_string());
    }

    let new_weight = (current.weight + 0.3).min(10.0);
    let new_inventory = current.food_inventory - 1;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE cat_state SET weight = ?, food_inventory = ?, last_fed_at = ? WHERE id = 1",
        params![new_weight, new_inventory, now],
    ).map_err(|e| e.to_string())?;

    Ok(CatState {
        weight: new_weight,
        food_inventory: new_inventory,
        last_fed_at: now,
        last_metabolism_at: current.last_metabolism_at,
    })
}

// 添加食物（番茄钟完成时调用）
#[tauri::command]
pub fn add_food(app: AppHandle) -> Result<CatState, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 先计算新陈代谢
    let current = compute_metabolism(&conn)?;

    conn.execute(
        "UPDATE cat_state SET food_inventory = food_inventory + 1 WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(CatState {
        weight: current.weight,
        food_inventory: current.food_inventory + 1,
        last_fed_at: current.last_fed_at,
        last_metabolism_at: current.last_metabolism_at,
    })
}
