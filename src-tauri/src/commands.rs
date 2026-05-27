use crate::db::*;
use crate::TrayIconState;
use rusqlite::params;
use tauri::{AppHandle, Manager, State};
use chrono::{Utc, Datelike, Duration};

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
        "SELECT id, name, target_pomodoros, completed_pomodoros, completed,
         priority, deadline, created_at, updated_at
         FROM tasks WHERE completed = ?
         ORDER BY priority DESC, created_at DESC
         LIMIT ? OFFSET ?"
    ).map_err(|e| e.to_string())?;

    let tasks = stmt.query_map(params![completed, page_size, offset], |row| {
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
        "INSERT INTO tasks (name, target_pomodoros, priority, deadline)
         VALUES (?, ?, ?, ?)",
        params![task.name, task.target_pomodoros, task.priority, task.deadline],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let task = conn.query_row(
        "SELECT id, name, target_pomodoros, completed_pomodoros, completed,
         priority, deadline, created_at, updated_at FROM tasks WHERE id = ?",
        params![id],
        |row| Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            target_pomodoros: row.get(2)?,
            completed_pomodoros: row.get(3)?,
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
    if let Some(target) = &updates.target_pomodoros {
        set_parts.push("target_pomodoros = ?");
        params.push(target.to_string());
    }
    if let Some(completed) = &updates.completed_pomodoros {
        set_parts.push("completed_pomodoros = ?");
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
        "SELECT id, name, target_pomodoros, completed_pomodoros, completed,
         priority, deadline, created_at, updated_at FROM tasks WHERE id = ?",
        params![updates.id],
        |row| Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            target_pomodoros: row.get(2)?,
            completed_pomodoros: row.get(3)?,
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
         enable_sound, theme, updated_at FROM user_config WHERE id = 1",
        [],
        |row| Ok(UserConfig {
            id: row.get(0)?,
            focus_duration: row.get(1)?,
            break_duration: row.get(2)?,
            enable_notifications: row.get(3)?,
            enable_sound: row.get(4)?,
            theme: row.get(5)?,
            updated_at: row.get(6)?,
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
                "UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1,
                 completed = CASE WHEN completed_pomodoros + 1 >= target_pomodoros
                 THEN 1 ELSE completed END,
                 updated_at = datetime('now')
                 WHERE id = ?",
                params![task_id],
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

// 获取统计数据
#[tauri::command]
pub fn get_stats(app: AppHandle) -> Result<Stats, String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let now = Utc::now();
    let today = now.format("%Y-%m-%d").to_string();

    // 获取本周一
    let weekday = now.weekday();
    let days_since_monday = (weekday.num_days_from_monday()) as i64;
    let this_monday = (now - Duration::days(days_since_monday)).format("%Y-%m-%d").to_string();

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
        params![this_monday],
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
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i32>(1)?,
            row.get::<_, i32>(2)?,
        ))
    }).map_err(|e| e.to_string())?;

    for row in rows {
        let (date, count, minutes) = row.map_err(|e| e.to_string())?;
        daily_data.push(DailyStats { date, count, minutes });
    }

    Ok(Stats {
        today_count,
        today_minutes,
        week_count,
        week_minutes,
        total_count,
        total_minutes,
        daily_data,
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

// 清除所有番茄钟记录（用于测试模式数据重置）
#[tauri::command]
pub fn clear_pomodoro_records(app: AppHandle) -> Result<(), String> {
    let db_guard = app.state::<DbConnection>();
    let conn = db_guard.0.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 清除番茄钟记录
    conn.execute("DELETE FROM pomodoro_records", [])
        .map_err(|e| e.to_string())?;

    // 重置所有任务的番茄钟进度
    conn.execute("UPDATE tasks SET completed_pomodoros = 0, completed = 0", [])
        .map_err(|e| e.to_string())?;

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
