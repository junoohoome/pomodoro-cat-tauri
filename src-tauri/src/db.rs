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
            duration_target REAL NOT NULL DEFAULT 0.5,
            completed_minutes INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            deadline TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            deleted_at TEXT
        )",
        [],
    )?;

    // 用户配置表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            focus_duration INTEGER NOT NULL DEFAULT 25,
            break_duration INTEGER NOT NULL DEFAULT 5,
            enable_notifications INTEGER NOT NULL DEFAULT 0,
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

    // 猫咪状态表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cat_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            weight REAL NOT NULL DEFAULT 2.0,
            food_inventory INTEGER NOT NULL DEFAULT 0,
            last_fed_at TEXT NOT NULL,
            last_metabolism_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;

    // 迁移：猫咪罐头每日获取追踪（必须在 INSERT 之前）
    let _ = conn.execute("ALTER TABLE cat_state ADD COLUMN food_earned_today INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE cat_state ADD COLUMN food_earned_date TEXT NOT NULL DEFAULT ''", []);

    // 初始化默认猫咪状态
    conn.execute(
        "INSERT OR IGNORE INTO cat_state (id, weight, food_inventory, last_fed_at, last_metabolism_at, food_earned_today, food_earned_date)
         VALUES (1, 2.0, 0, datetime('now'), datetime('now'), 0, '')",
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
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 4", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN auto_launch INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN show_desktop_pet INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE user_config ADD COLUMN show_daily_goal INTEGER NOT NULL DEFAULT 1", []);

    // 迁移：任务软删除（deleted_at 为 NULL 表示未删除）
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN deleted_at TEXT", []);

    // 迁移：时间驱动指标体系 (v1)
    let migrated: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM app_state WHERE key = 'migration_time_metrics_v1'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !migrated {
        let _ = conn.execute_batch(
            "ALTER TABLE tasks RENAME COLUMN target_pomodoros TO duration_target;
             ALTER TABLE tasks RENAME COLUMN completed_pomodoros TO completed_minutes;"
        );
        let _ = conn.execute_batch(
            "UPDATE tasks SET duration_target = CAST(duration_target AS REAL) * (SELECT focus_duration FROM user_config WHERE id = 1) / 60.0;
             UPDATE tasks SET completed_minutes = completed_minutes * (SELECT focus_duration FROM user_config WHERE id = 1);"
        );
        let _ = conn.execute_batch(
            "UPDATE user_config SET daily_goal = CAST(daily_goal AS REAL) * focus_duration / 60.0;"
        );
        let _ = conn.execute(
            "INSERT INTO app_state (key, value) VALUES ('migration_time_metrics_v1', '1')",
            [],
        );
    }

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
    pub duration_target: f64,
    pub completed_minutes: i32,
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
    pub duration_target: f64,
    pub priority: String,
    pub deadline: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTask {
    pub id: i64,
    pub name: Option<String>,
    pub duration_target: Option<f64>,
    pub completed_minutes: Option<i32>,
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
    pub daily_goal: f64,
    pub auto_launch: bool,
    pub show_desktop_pet: bool,
    pub show_daily_goal: bool,
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

    // 今日报告数据
    pub today_completed_tasks: i32,
    pub today_incomplete_tasks: i32,
    pub today_task_breakdown: Vec<TaskReportItem>,
    pub today_hourly_data: Vec<HourlySegment>,
    pub daily_goal: f64,

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

// 时段统计（今日报告用）
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HourlySegment {
    pub label: String,    // "上午", "下午", "晚上", "深夜"
    pub start_hour: i32,  // 6, 12, 18, 0
    pub count: i32,
    pub minutes: i32,
}

// 任务报告项
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskReportItem {
    pub task_id: i64,
    pub task_name: String,
    pub session_count: i32,
    pub focus_minutes: i32,
    pub is_completed: bool,
}

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

// 猫咪状态
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatState {
    pub weight: f64,
    pub food_inventory: i32,
    pub last_fed_at: String,
    pub last_metabolism_at: String,
    pub food_earned_today: i32,
    pub food_earned_date: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        conn
    }

    #[test]
    fn soft_deleted_task_hidden_from_list_but_kept_for_stats_join() {
        let conn = setup();

        // 建一个任务，并记一条指向它的专注记录
        conn.execute(
            "INSERT INTO tasks (name, duration_target) VALUES ('写论文', 2.0)",
            [],
        )
        .unwrap();
        let task_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO pomodoro_records (task_id, duration, type) VALUES (?, 25, 'focus')",
            params![task_id],
        )
        .unwrap();

        // 软删除（delete_task 将使用的 SQL）
        conn.execute(
            "UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?",
            params![task_id],
        )
        .unwrap();

        // 任务列表语义（get_tasks）：已删除任务应被过滤掉
        let active: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE completed = 0 AND deleted_at IS NULL",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(active, 0);

        // 统计明细语义（query_task_breakdown）：仍能 join 到原任务名
        let name: String = conn
            .query_row(
                "SELECT COALESCE(t.name, '未关联任务')
                 FROM pomodoro_records pr
                 LEFT JOIN tasks t ON pr.task_id = t.id
                 WHERE pr.type = 'focus'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(name, "写论文");
    }
}
