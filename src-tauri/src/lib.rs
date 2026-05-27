// 禁用控制台窗口（Windows）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![cfg_attr(target_os = "macos", allow(deprecated))]

mod db;
mod commands;

use db::*;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

// TrayIconState 全局状态管理
#[derive(Clone)]
pub struct TrayIconState(pub Arc<AppHandle>);

#[cfg(target_os = "macos")]
impl TrayIconState {
    pub fn new(app: &tauri::AppHandle) -> Self {
        Self(Arc::new(app.clone()))
    }

    /// 更新菜单栏显示（移除旧的，创建新的）
    pub fn update_tray(&self, title: &str) {
        let app = self.0.clone();

        // 移除所有旧的 tray icons
        let _ = app.remove_tray_by_id("main-tray");

        // 创建新的 tray icon（带新标题）
        if let Err(e) = self.create_tray_icon(&app, title) {
            eprintln!("Failed to create tray icon: {}", e);
        }
    }

    #[cfg(target_os = "macos")]
    fn create_tray_icon(&self, app: &tauri::AppHandle, title: &str) -> Result<(), String> {
        use tauri::tray::{TrayIconBuilder, TrayIconEvent};
        use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

        // 使用应用默认图标作为菜单栏图标
        let tray_icon = app.default_window_icon()
            .ok_or("Failed to get default window icon")?
            .clone();

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

        // 创建tray icon - Tauri 2的API
        let _tray = TrayIconBuilder::with_id("main-tray")
            .icon(tray_icon)
            .menu(&menu)
            .menu_on_left_click(false)
            .title(title)
            .build(app)
            .map_err(|e| format!("Failed to create tray icon: {}", e))?;

        // 重新绑定事件监听器
        let app_handle = app.clone();
        let app_handle_menu = app_handle.clone();
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
                    let window = app_handle_menu.get_webview_window("main").unwrap();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                "hide" => {
                    let window = app_handle_menu.get_webview_window("main").unwrap();
                    let _ = window.hide();
                }
                "quit" => {
                    app_handle_menu.exit(0);
                }
                _ => {}
            }
        });

        Ok(())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // 初始化数据库
            let db_path = get_db_path(app.handle());

            // 创建父目录
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).expect("Failed to create database directory");
            }

            let conn = rusqlite::Connection::open(&db_path)
                .expect("Failed to open database");

            // 创建表
            init_db(&conn).expect("Failed to initialize database");

            // 将连接存入全局状态
            app.manage(DbConnection(Mutex::new(conn)));

            // === 创建菜单栏 ===
            #[cfg(target_os = "macos")]
            {
                // 创建全局 TrayIconState
                let tray_state = TrayIconState::new(app.handle());

                // 创建初始菜单栏图标
                if let Err(e) = tray_state.create_tray_icon(app.handle(), "🐱") {
                    eprintln!("Failed to create initial tray icon: {}", e);
                }

                // 注册到 app state
                app.manage(tray_state);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 任务相关
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            // 配置相关
            commands::get_user_config,
            commands::update_user_config,
            // 记录相关
            commands::record_pomodoro,
            commands::get_stats,
            commands::clear_pomodoro_records,
            // 状态相关
            commands::get_state,
            commands::set_state,
            // 菜单栏相关
            commands::update_tray_title,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
