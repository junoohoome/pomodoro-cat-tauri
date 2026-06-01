use rusqlite::{Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

// 数据库文件名
const DB_NAME: &str = "pomodoro-cat.db";

// 获取数据库路径
pub fn get_db_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir()
        .expect("Failed to get app data dir")
        .join(DB_NAME)
}

// 获取数据库连接
pub fn get_connection(app: &AppHandle) -> SqliteResult<Connection> {
    let db_path = get_db_path(app);
    Connection::open(&db_path)
}

// 初始化数据库表
pub fn init_db(conn: &Connection) -> SqliteResult<()> {
    // 任务表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_pomodoros INTEGER NOT NULL DEFAULT 1,
            completed_pomodoros INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            deadline TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;

    // 用户配置表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            focus_duration INTEGER NOT NULL DEFAULT 25,
            break_duration INTEGER NOT NULL DEFAULT 5,
            enable_notifications INTEGER NOT NULL DEFAULT 1,
            enable_sound INTEGER NOT NULL DEFAULT 1,
            theme TEXT NOT NULL DEFAULT 'light',
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;

    // 番茄钟记录表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pomodoro_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            duration INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'focus',
            recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // 应用状态表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // 初始化默认用户配置
    conn.execute(
        "INSERT OR IGNORE INTO user_config (id) VALUES (1)",
        [],
    )?;

    // 迁移：添加新配置字段（忽略已存在的列）
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN long_break_duration INTEGER NOT NULL DEFAULT 15", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN auto_start INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 8", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN auto_launch INTEGER NOT NULL DEFAULT 0", []);

    Ok(())
}

// 全局数据库连接（使用 Mutex 保证线程安全）
pub struct DbConnection(pub Mutex<Connection>);

// 任务相关的数据结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub name: String,
    pub target_pomodoros: i32,
    pub completed_pomodoros: i32,
    pub completed: bool,
    pub priority: String,
    pub deadline: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTask {
    pub name: String,
    pub target_pomodoros: i32,
    pub priority: String,
    pub deadline: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTask {
    pub id: i64,
    pub name: Option<String>,
    pub target_pomodoros: Option<i32>,
    pub completed_pomodoros: Option<i32>,
    pub completed: Option<bool>,
    pub priority: Option<String>,
    pub deadline: Option<Option<String>>,
}

// 用户配置
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

// 番茄钟记录
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroRecord {
    pub id: i64,
    pub task_id: Option<i64>,
    pub duration: i32,
    pub r#type: String,
    pub recorded_at: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPomodoroRecord {
    pub task_id: Option<i64>,
    pub duration: i32,
    pub r#type: String,
}

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

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStats {
    pub date: String,
    pub count: i32,
    pub minutes: i32,
}

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
