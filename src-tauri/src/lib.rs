// 禁用控制台窗口（Windows）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![cfg_attr(target_os = "macos", allow(deprecated))]

mod db;
mod commands;

use db::*;
use std::sync::Mutex;
use tauri::Manager;

// TrayIconState 全局状态定义
#[cfg(target_os = "macos")]
use tauri::tray::TrayIcon;

#[derive(Clone)]
pub struct TrayIconState;

#[cfg(target_os = "macos")]
impl TrayIconState {
    pub fn get() -> Option<TrayIcon> {
        None // 占位，实际通过其他方式获取
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
                use tauri::tray::{TrayIconBuilder, TrayIconEvent};
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

                // 显示窗口菜单项
                let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)
                    .expect("Failed to create show menu item");

                // 隐藏窗口菜单项
                let hide_item = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)
                    .expect("Failed to create hide menu item");

                // 分隔线
                let sep1 = PredefinedMenuItem::separator(app).expect("Failed to create separator");

                // 退出菜单项
                let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
                    .expect("Failed to create quit menu item");

                // 创建菜单
                let menu = Menu::with_items(app, &[&show_item, &hide_item, &sep1, &quit_item])
                    .expect("Failed to create menu");

                // 创建菜单栏图标
                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .menu_on_left_click(false)
                    .title("🐱")
                    .build(app)
                    .expect("Failed to create tray icon");

                // 监听菜单栏点击事件
                let app_handle = app.handle().clone();
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
                                // 左键点击：切换窗口显示/隐藏
                                let window = app_handle.get_webview_window("main").unwrap();
                                if window.is_visible().unwrap() {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        TrayIconEvent::DoubleClick { .. } => {}
                        TrayIconEvent::Enter { .. } => {}
                        TrayIconEvent::Leave { .. } => {}
                        _ => {}
                    }
                });

                // 监听菜单点击事件
                let app_handle_menu = app.handle().clone();
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
