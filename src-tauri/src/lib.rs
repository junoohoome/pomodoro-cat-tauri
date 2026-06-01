// 禁用控制台窗口（Windows）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![cfg_attr(target_os = "macos", allow(deprecated))]

mod db;
mod commands;

use db::*;
use rusqlite::params;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Listener};
use tauri_plugin_autostart::MacosLauncher;

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--auto-start"])))
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

            // 仅在开机自启时隐藏窗口（通过启动参数区分自启动和手动启动）
            let is_auto_start = std::env::args().any(|arg| arg == "--auto-start");
            if is_auto_start {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // === 创建菜单栏 ===
            #[cfg(target_os = "macos")]
            {
                // 创建全局 TrayIconState
                let tray_state = TrayIconState::new(app.handle());

                // 创建初始菜单栏图标
                if let Err(e) = tray_state.create_tray_icon(app.handle(), "") {
                    eprintln!("Failed to create initial tray icon: {}", e);
                }

                // 注册到 app state
                app.manage(tray_state);
            }

            // === 创建桌面宠物窗口（默认隐藏）===
            {
                use tauri::{WebviewUrl, WebviewWindowBuilder};

                let _pet_window = WebviewWindowBuilder::new(
                    app,
                    "pet",
                    WebviewUrl::App("pet.html".into()),
                )
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .inner_size(180.0, 230.0)
                .resizable(false)
                .shadow(false)
                .visible(false)
                .build()
                .expect("Failed to create pet window");

                if let Err(e) = commands::sync_pet_window_with_config(app.handle()) {
                    eprintln!("Failed to sync desktop pet visibility: {}", e);
                }
            }

            // === 宠物窗口事件监听 ===
            let app_handle = app.handle().clone();
            app.listen("pet-clicked", move |_| {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });

            let app_handle_drag = app.handle().clone();
            app.listen("pet-dragged", move |event: tauri::Event| {
                let payload_str = event.payload();
                let _ = app_handle_drag
                    .state::<DbConnection>()
                    .0
                    .lock()
                    .map_err(|e| e.to_string())
                    .and_then(|conn| {
                        conn.execute(
                            "INSERT OR REPLACE INTO app_state (key, value) VALUES ('pet_position', ?)",
                            params![payload_str],
                        ).map_err(|e| e.to_string())
                    });
            });

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
            commands::reset_user_config,
            // 记录相关
            commands::record_pomodoro,
            commands::get_stats,
            // 状态相关
            commands::get_state,
            commands::set_state,
            // 菜单栏相关
            commands::update_tray_title,
            // 数据管理
            commands::export_data,
            commands::import_data,
            // 桌面宠物
            commands::toggle_pet_window,
            // 猫咪喂养
            commands::get_cat_state,
            commands::feed_cat,
            commands::add_food,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
