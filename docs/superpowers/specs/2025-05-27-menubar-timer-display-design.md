# 菜单栏时间显示功能修复设计

## 概述

修复番茄专注猫应用的macOS菜单栏时间显示功能，使其能够在计时过程中显示剩余时间，空闲时显示猫咪logo图标。

## 问题分析

### 当前状态
- **问题**: `update_tray_title` 函数为空实现，无法更新菜单栏标题
- **表现**: 菜单栏始终显示emoji 🐱，无法看到计时进度
- **影响**: 用户无法通过菜单栏了解计时状态

### 根本原因
```rust
// src-tauri/src/commands.rs:409
pub fn update_tray_title(app: AppHandle, title: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // 使用 Tauri 的事件系统发送更新消息
        // 由于直接获取 tray icon 比较困难，我们暂时返回成功
        // 实际的菜单栏标题更新可以在 Tauri 支持更好的 API 时实现
    }
    Ok(())  // ← 问题：空实现
}
```

### 技术限制
- TrayIcon 创建后没有保存引用，无法后续更新
- 缺少状态管理机制来维持 TrayIcon 实例

## 解决方案设计

### 用户需求
经过用户确认的显示规范：

| 状态 | 显示内容 | 说明 |
|------|----------|------|
| **空闲** | 🐱 猫咪logo图标 | 使用 32x32.png 图标文件 |
| **运行** | 🍅 24:00 | Emoji + 剩余时间 |
| **暂停** | ⏸️ 24:00 | 暂停图标 + 剩余时间 |
| **完成** | 🐱 猫咪logo图标 | 恢复空闲状态 |

### 技术架构

```
┌─────────────────┐
│   timerStore    │
│  (前端状态管理)  │
└────────┬────────┘
         │ invoke("update_tray_title", title)
         ▼
┌─────────────────┐
│  Rust Commands  │
│update_tray_title│
│  (commands.rs)  │
└────────┬────────┘
         │ TrayIconState.set_title()
         ▼
┌─────────────────┐
│  TrayIconState  │
│  (全局状态)     │
│ Arc<Mutex<Tray>> │
└────────┬────────┘
         │ tray.set_title()
         ▼
┌─────────────────┐
│ macOS Menu Bar  │
│   🐱 或 🍅 24:00│
└─────────────────┘
```

### 核心组件设计

#### 1. TrayIconState 结构

**职责**: 管理 TrayIcon 实例，提供更新接口

```rust
use std::sync::{Arc, Mutex};
use tauri::tray::TrayIcon;

#[derive(Clone)]
pub struct TrayIconState(pub Arc<Mutex<Option<TrayIcon>>>);

#[cfg(target_os = "macos")]
impl TrayIconState {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
    
    /// 设置菜单栏标题（文字模式）
    pub fn set_title(&self, title: &str) {
        if let Some(tray) = self.0.lock().unwrap().as_ref() {
            let _ = tray.set_title(title);
        }
    }
    
    /// 恢复图标模式（空标题）
    pub fn restore_icon(&self) {
        if let Some(tray) = self.0.lock().unwrap().as_ref() {
            let _ = tray.set_title("");
        }
    }
}
```

#### 2. 命令实现

**文件**: `src-tauri/src/commands.rs`

```rust
/// 更新菜单栏标题（显示计时时间）
#[tauri::command]
pub fn update_tray_title(state: State<TrayIconState>, title: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if title.is_empty() {
            state.restore_icon(); // 显示图标
        } else {
            state.set_title(&title); // 显示文字
        }
    }
    Ok(())
}
```

#### 3. 应用集成

**文件**: `src-tauri/src/lib.rs`

**关键修改点**:
1. 创建 TrayIconState 实例
2. 保存 TrayIcon 引用到状态中
3. 注册状态到 app.manage()
4. 传递状态给命令处理函数

### 前端调用逻辑

**现有代码保持不变**:

```typescript
// src/stores/timerStore.ts
async function updateTrayTitle(state, remainingSeconds, type) {
  try {
    let title = ""; // 默认显示图标

    if (state === "running") {
      const timeStr = formatTime(remainingSeconds);
      const emoji = type === "focus" ? "🍅" : "☕";
      title = `${emoji} ${timeStr}`;
    } else if (state === "paused") {
      const timeStr = formatTime(remainingSeconds);
      title = `⏸️ ${timeStr}`;
    }
    // state === "idle" 时 title 为空字符串，显示图标

    await invoke("update_tray_title", { title });
  } catch (e) {
    // macOS only - ignore errors on other platforms
  }
}
```

**逻辑说明**:
- **空闲状态**: `title = ""` → 显示猫咪logo图标
- **运行状态**: `title = "🍅 24:00"` → 显示计时文字
- **暂停状态**: `title = "⏸️ 24:00"` → 显示暂停信息

## 实现细节

### 文件修改清单

| 文件 | 修改类型 | 重要性 |
|------|----------|--------|
| `src-tauri/src/lib.rs` | 新增 TrayIconState 实现 | 🔴 高 |
| `src-tauri/src/commands.rs` | 实现 update_tray_title 逻辑 | 🔴 高 |
| `src-tauri/src/main.rs` | 添加必要的 use 语句 | 🟡 中 |

### 图标资源使用

**空闲状态图标**: `src-tauri/icons/32x32.png`
- 尺寸: 32x32 像素
- 格式: PNG (RGBA)
- 适合: macOS 菜单栏显示

## 测试计划

### 功能测试场景

1. **应用启动测试**
   - ✅ 启动应用，菜单栏显示猫咪logo图标
   - ✅ 无控制台错误信息

2. **计时开始测试**
   - ✅ 点击"开始专注"，菜单栏显示 "🍅 25:00"
   - ✅ 倒计时每秒更新: "🍅 24:59" → "🍅 24:58"

3. **暂停功能测试**
   - ✅ 点击"暂停"，菜单栏显示 "⏸️ 24:xx"
   - ✅ 时间数字保持准确

4. **恢复功能测试**
   - ✅ 点击"继续"，恢复倒计时显示
   - ✅ 无显示异常

5. **完成测试**
   - ✅ 计时完成，菜单栏恢复猫咪logo图标
   - ✅ 状态转换流畅

6. **放弃功能测试**
   - ✅ 点击"放弃"，立即恢复猫咪logo图标
   - ✅ 状态正确重置

### 边缘情况测试

- 应用最小化时的菜单栏更新
- 长时间运行（25分钟完整周期）的稳定性
- 快速状态切换的响应性
- 内存泄漏检测

### 性能考虑

- **更新频率**: 每秒一次，符合现有 timerStore 逻辑
- **资源消耗**: TrayIcon.set_title() 是轻量操作
- **线程安全**: 使用 Arc<Mutex<>> 确保并发安全

## 兼容性

### 平台支持
- **macOS**: ✅ 主要支持平台
- **Windows/Linux**: ⚠️ 使用 `#[cfg(target_os = "macos")]` 条件编译

### 向后兼容
- 现有 API 接口不变
- 前端调用代码无需修改
- 其他平台功能不受影响

## 风险和限制

### 技术风险
1. **TrayIcon API 限制**: Tauri 2 的 TrayIcon 可能有API变更
2. **图标显示**: macOS 对菜单栏图标有特殊要求（template模式）

### 缓解措施
1. 使用官方 Tauri 2 API，避免私有方法
2. 错误处理：即使更新失败也不影响主功能
3. 保留现有 emoji 作为后备方案

## 实施计划

### 开发阶段
1. 修改 `TrayIconState` 结构体
2. 实现 `update_tray_title` 命令
3. 测试基本功能

### 测试阶段
1. 手动功能测试
2. 边缘情况验证
3. 性能监控

### 发布阶段
1. 合并到主分支
2. 构建生产版本
3. 用户反馈收集

## 成功标准

- ✅ 菜单栏能正确显示猫咪logo图标（空闲状态）
- ✅ 计时时能显示 "🍅 24:00" 格式文字
- ✅ 暂停时能显示 "⏸️ 24:00" 格式文字
- ✅ 每秒更新流畅无延迟
- ✅ 状态切换无显示异常
- ✅ 无内存泄漏或性能问题

## 备选方案

如果主要方案遇到技术限制，备选方案：

### 方案 B: 事件系统
```rust
app.emit("update-tray", title)?;
```
- 前端监听事件并更新
- 增加复杂度但更灵活

### 方案 C: 重新设计图标
- 创建专用的菜单栏图标
- 考虑 macOS template 模式
- 更符合系统设计规范