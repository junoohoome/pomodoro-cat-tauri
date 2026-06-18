# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是**专注猫** (Focus Cat) - 一个从微信小程序转换而来的跨平台桌面番茄钟应用，技术栈：
- **前端**: React 19 + TypeScript + Tailwind CSS v4
- **后端**: Tauri 2 + Rust
- **数据库**: SQLite (via rusqlite)
- **状态管理**: Zustand
- **路由**: React Router

应用通过虚拟猫咪成长的机制来游戏化生产力，用户完成番茄钟后猫咪会升级。

## 常用命令

### 开发
```bash
npm run dev          # 启动 Vite 开发服务器 (端口 1420)
npm run tauri dev    # 启动 Tauri 开发模式 (同时运行前端和 Rust)
npm run build        # TypeScript 检查 + Vite 生产构建
npm run tauri build  # 构建生产版 Tauri 应用包
npm run preview      # 预览生产版 Vite 构建
npm run visual-check   # 截图视觉检查：驱动 5 页边界场景截图到 .visual-check/，再叫 Claude 分析
```

### PATH 设置 (Tauri 必需)
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

### 图标生成
```bash
cd src-tauri && npx @tauri-apps/cli icon ../public/logo.png
```

### Rust 相关
```bash
cd src-tauri
cargo build          # 编译 Rust 代码
cargo test           # 运行 Rust 测试
cargo clippy         # 代码检查
cargo clean          # 清理构建产物（排查问题时有用）
```

## 架构

### 项目结构
```
focus-cat/
├── src/                      # React 前端
│   ├── pages/               # 页面组件 (Timer, Tasks, Cat, Stats, Settings)
│   ├── stores/              # Zustand 状态管理
│   ├── lib/                 # 工具 (数据库 schema, 工具函数)
│   ├── types/               # TypeScript 类型定义
│   ├── App.tsx              # 主布局（左侧边栏导航）
│   └── main.tsx             # React Router 配置
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs         # 入口文件 (调用 lib.rs)
│   │   ├── lib.rs          # Tauri 应用设置、macOS 菜单栏图标、命令注册
│   │   ├── db.rs           # 数据库 schema + 连接管理
│   │   └── commands.rs     # Tauri 命令（业务逻辑）
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
└── package.json
```

### 前后端通信

**Tauri 命令模式**: 所有数据操作通过 `src-tauri/src/commands.rs` 中定义的 Tauri 命令：

| 领域 | 命令 |
|------|------|
| 任务 | `get_tasks`, `create_task`, `update_task`, `delete_task` |
| 配置 | `get_user_config`, `update_user_config` |
| 记录 | `record_pomodoro`, `get_stats`, `clear_pomodoro_records` |
| 状态 | `get_state`, `set_state` |
| 菜单栏 (macOS) | `update_tray_title` |

**注册方式**: 命令在 `src-tauri/src/lib.rs` 中通过 `tauri::generate_handler![]` 宏注册。

**调用方式**: 前端 stores 通过 `@tauri-apps/api/core` 的 `invoke()` 执行 Rust 命令。

### 数据流
1. 前端 stores (`stores/`) 通过 `invoke()` 调用 Tauri 命令
2. Rust 命令在 `commands.rs` 中获取全局 `DbConnection` 的锁
3. 数据库操作通过 `rusqlite` 使用原生 SQL
4. 结果通过 `#[serde(rename_all = "camelCase")]` 序列化为 JS 兼容格式
5. 前端 Zustand stores 更新状态，组件重新渲染

### 状态管理 (Zustand Stores)

| Store | 用途 |
|-------|------|
| `timerStore` | 计时器状态 (idle/running/paused)、剩余时间、测试模式开关 |
| `taskStore` | 进行中/已完成任务、分页、CRUD 操作、手动完成(completeTask) |
| `userStore` | 用户配置、统计数据、猫咪等级计算 |
| `testModeStore` | 测试模式开关 (开发用，1分钟 vs 25分钟) |

### 数据库 Schema

**表结构** (定义在 `src-tauri/src/db.rs`):
- `tasks`: 用户任务，包含时长目标(duration_target/小时)、已完成分钟数(completed_minutes)、优先级、截止日期
- `user_config`: 单行配置表 (专注/休息时长、通知、主题)
- `pomodoro_records`: 专注会话历史记录
- `app_state`: 键值存储，用于应用持久化

**数据库位置**: 通过 `app.path().app_data_dir()` 获取的应用数据目录

**TypeScript 镜像**: `src/lib/db/schema.ts` 包含 Drizzle ORM 定义用于类型推断（实际查询中未使用）。

### 路由
React Router 嵌套路由，`<App />` 作为侧边栏布局：
- `/` 或 `/timer` - 主计时器页面
- `/tasks` - 任务管理
- `/cat` - 猫咪/养成页面
- `/stats` - 统计图表
- `/settings` - 用户设置

### macOS 菜单栏图标

**实现** (`src-tauri/src/lib.rs`):
- 菜单栏图标使用 emoji 标题 (🐱)
- 左键点击切换窗口显示/隐藏
- 菜单项: 显示窗口、隐藏窗口、退出
- 使用 `macOSPrivateApi: true` 配置

**标题更新**: 
- **空闲状态**: 显示 🐱 猫咪logo
- **运行状态**: 显示计时时间 (🍅 24:00 或 ☕ 04:00)
- **暂停状态**: 显示暂停图标 + 时间 (⏸️ 24:00)
- **实现方式**: 使用 `Arc<AppHandle>` 维护全局状态，通过移除并重新创建 tray icon 来更新标题

### 猫咪养成系统

**体重系统** (定义在 `pages/Cat.tsx`):
- 猫咪体重范围 1-10kg，通过喂食罐头增加体重
- 每天自然消耗约 0.3kg，需要持续喂养
- 最佳状态: 4-6kg (标准)
- 完成一次专注 → 获得 1 个罐头

**体重状态**:
| 范围 | 状态 | 心情 |
|------|------|------|
| < 2kg | 骨感 | 不开心 |
| 2-4kg | 苗条 | 平静 |
| 4-6kg | 标准 | 最开心 |
| 6-8kg | 微胖 | 满足 |
| 8-9.5kg | 胖胖 | 犯困 |
| ≥ 9.5kg | 圆滚滚 | 懒洋洋 |

### 测试模式

开发用的快速测试功能：
- **专注时长**: 1 分钟 (正常 25 分钟)
- **休息时长**: 1 分钟 (正常 5 分钟)
- **记录时长**: 记录实际经过时间（1分钟）
- **切换限制**: 仅在计时器空闲状态时可切换
- **数据重置**: 使用 `clear_pomodoro_records` 命令清除测试数据

### 时间驱动指标体系

**核心原则**: 时间为主指标，专注次数为辅助。记录实际经过时间而非配置时长。

**任务进度**:
- `duration_target` (f64, 小时) — 任务预估时长
- `completed_minutes` (i32, 分钟) — 已完成分钟数
- 自动完成条件: `completedMinutes >= Math.round(durationTarget * 60)`
- 手动完成: `taskStore.completeTask(id)` + 右键菜单"标记完成"

**每日目标**: `daily_goal` (f64, 小时)，默认 2h

**浮点显示**: 所有分钟→小时转换必须 `parseFloat((minutes/60).toFixed(1))`，避免 `0.333333333h`

**放弃记录**: 放弃专注时，已专注 ≥1 分钟的部分也记录到任务进度（不给罐头、不触发自动休息）

**数据迁移**: `db.rs` 中 `migration_time_metrics_v1` 标志，旧 pomodoro 数据 × focusDuration / 60 转为小时

### 类型安全

- Rust 结构体使用 `#[serde(rename_all = "camelCase")]` 匹配 JS 命名约定
- `src/types/index.ts` 中的 TypeScript 类型镜像 Rust 结构体
- Tauri 命令通过泛型 `invoke<T>()` 实现强类型

## 重要注意事项

- **端口 1420**: Vite 开发服务器使用严格端口 1420 - 被占用时会失败
- **中文界面**: 应用界面为中文 (番茄专注猫)
- **内联样式**: 组件使用内联样式（无 CSS modules 或 styled-components）
- **无测试**: 项目当前没有测试配置
- **测试模式统计**: 测试模式下记录番茄钟时，记录实际经过时间（1分钟）

## 开发工作流

### 添加新的 Tauri 命令
1. 在 `src-tauri/src/commands.rs` 中添加带 `#[tauri::command]` 的命令函数
2. 在 `src-tauri/src/lib.rs` 的 `invoke_handler![]` 宏中注册
3. 前端 store 通过 `@tauri-apps/api/core` 的 `invoke()` 调用

### 修改数据库
1. 更新 `src-tauri/src/db.rs` 中的表 schema (`init_db` 函数)
2. 更新 `src-tauri/src/db.rs` 中的 Rust 结构体
3. 更新 `src-tauri/src/commands.rs` 中的 SQL 查询
4. 更新 `src/types/index.ts` 中的 TypeScript 类型

### 构建生产版本
```bash
# 清理构建以确保图标更新
cargo clean  # 在 src-tauri 目录

# 构建应用包
npm run tauri build

# 输出位置: src-tauri/target/release/bundle/
# macOS: bundle/macos/FocusCat.app
# Windows: bundle/msi/
# Linux: bundle/deb/ 或 bundle/appimage/
```

### macOS 图标缓存问题
构建后应用图标未更新时的解决方法：
```bash
# 重启 Dock
killall Dock

# 重建 LaunchServices 数据库
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
```

## 视觉检查 (Visual Check)

`npm run visual-check` 用 Playwright 对 5 个页面在边界数据下逐场景截图（输出到 `.visual-check/latest/`，gitignored）。视觉分析不自动化——跑完后请 Claude `Read` 截图 + `manifest.md`，产出布局问题清单（溢出/重叠/裁剪/对比度）。

- 首次使用需 `npx playwright install chromium`
- 边界场景在 `visual-check/scenarios.ts` 维护（场景清单驱动）
- 跑前确保 :1420 未被占用
- 通过 `addInitScript` 注入 `window.__TAURI_INTERNALS__.invoke` mock + `__TAURI_EVENT_PLUGIN_INTERNALS__` 桩，返回 `visual-check/fixtures.ts` 的边界数据
- 注意：本环境里 Claude `Read` 截图走 CDN 上传（不内联），CDN 激进去重会喂旧/错图，分析不可靠；要可靠分析请把截图直接贴进对话，或改用脚本内调视觉 API（base64）

## 自动修复 (CI Auto-fix)

`.github/workflows/test.yml` 里的 `autofix` job：PR 上 `npm test` 或 `cargo test` 失败时，自动触发 [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) 尝试【最小修复】并提交回 PR 分支；修不了会在 PR 留评论。人审 PR 合并为唯一闸门（不合并不强制）。

**激活前提（缺一不可）：**
1. push 到 origin（CI 工作流必须在 GitHub 上才会跑）。
2. repo **Settings → Secrets and variables → Actions → New repository secret**：`ANTHROPIC_API_KEY`。

**约束：** prompt 限定最小改动、不改测试断言、`--max-turns 30` 兜底；只在 `pull_request` 失败时触发（push 到 main 不自动修）。每次失败触发一次 Claude 运行（API 费用）。
