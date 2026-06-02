# 任务时间估算设计

> 日期：2026-06-03
> 状态：已批准

## 背景

当前任务创建时，用户需要选择番茄钟数目（1-5 个）作为预估工作量。这与日常习惯不符 — 人们通常用"小时"来衡量任务时长，而不是"几个番茄钟"。

## 方案

**方案 B：只改 UI 层**，数据库和后端完全不变。用户在前端输入小时数，自动换算为番茄钟轮次后存入现有字段。

### 换算规则

```
1 轮次 = focusDuration(25min) + breakDuration(5min) = 30 分钟
targetPomodoros = Math.ceil(estimatedHours * 60 / 30)
```

## 改动范围

### 1. DurationSelector 组件（替代 PomodoroSelector）

**位置**：`src/pages/Tasks.tsx`

替换当前的 `🍅1 🍅2 🍅3 🍅4 🍅5` 选择器：

- **快捷按钮**：`30min` `1h` `2h` `4h` 四个预设（对应 1、2、4、8 轮次）
- **自由输入**：小输入框，只接受小时数（支持 0.5、1.5 等小数）
- 选中预设按钮时输入框同步；手动输入时预设取消高亮
- 默认值：`1.5h`（替代原来的 3 个番茄钟）
- 提交时前端自动换算 `targetPomodoros`，接口不变

### 2. TomatoIcon SVG 组件

**位置**：`src/pages/Tasks.tsx` 或单独文件

新增内联 SVG 番茄图标，风格与现有导航图标一致：
- `strokeWidth="1.5"`
- `strokeLinecap="round"`
- `strokeLinejoin="round"`

替代所有 🍅 emoji 出现的位置。

### 3. 任务列表进度展示

**位置**：`src/pages/Tasks.tsx`

```
当前:  🍅 2/5
改为:  <TomatoIcon/> 50min / 2h 30min
```

换算公式：
```
completedMinutes = completedPomodoros * focusDuration
totalMinutes = targetPomodoros * (focusDuration + breakDuration)
```

### 4. 计时器页进度展示

**位置**：`src/pages/Timer.tsx`

```
当前:  2/5 番茄钟  +  进度点 (●●○○○)
改为:  50min / 2h 30min  +  进度点 (●●○○○) 不变
```

进度点视觉不变，文字改为时间格式。

### 5. 任务编辑

任务编辑时也使用 DurationSelector，从 `targetPomodoros` 反算回小时数：
```
estimatedHours = targetPomodoros * (focusDuration + breakDuration) / 60
```

## 不改动的部分

- **数据库**：`target_pomodoros`、`completed_pomodoros` 字段不变
- **Rust 后端**：`commands.rs`、`db.rs` 不变
- **TypeScript 类型**：`Task`、`NewTask` 接口不变
- **taskStore**：`incrementTaskProgress` 逻辑不变
- **番茄进度点**：Timer.tsx 的视觉点不变
- **统计报表**：`Stats`、`TaskReportItem` 不变

## 影响的文件

| 文件 | 改动 |
|------|------|
| `src/pages/Tasks.tsx` | 替换 PomodoroSelector 为 DurationSelector；替换 🍅 为 TomatoIcon；进度文字改为时间格式 |
| `src/pages/Timer.tsx` | 任务进度文字从 `2/5 番茄钟` 改为 `50min / 2h 30min` |
