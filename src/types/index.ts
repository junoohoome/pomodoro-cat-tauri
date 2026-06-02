// 任务优先级
export type TaskPriority = "high" | "medium" | "low";

// 任务状态
export type TaskStatus = "active" | "completed";

// 计时器状态
export type TimerState = "idle" | "running" | "paused" | "break";

// 番茄钟类型
export type PomodoroType = "focus" | "break";

// 任务实体
export interface Task {
  id: number;
  name: string;
  durationTarget: number;
  completedMinutes: number;
  completed: boolean;
  priority: TaskPriority;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

// 新建任务
export interface NewTask {
  name: string;
  durationTarget: number;
  priority: TaskPriority;
  deadline?: string | null;
}

// 用户配置
export interface UserConfig {
  id: number;
  focusDuration: number;      // 专注时长（分钟）
  breakDuration: number;      // 休息时长（分钟）
  enableNotifications: boolean;
  enableSound: boolean;
  theme: "light" | "dark" | "auto";
  updatedAt: string;
  longBreakDuration: number;
  autoStart: boolean;
  dailyGoal: number;
  autoLaunch: boolean;
  showDesktopPet: boolean;
  showDailyGoal: boolean;
}

// 番茄钟记录
export interface PomodoroRecord {
  id: number;
  taskId?: number;
  duration: number;           // 专注分钟数
  type: PomodoroType;
  recordedAt: string;
}

// 猫咪状态
export interface CatState {
  weight: number;
  foodInventory: number;
  lastFedAt: string;
  lastMetabolismAt: string;
}

// 重量状态标签
export interface WeightState {
  label: string;
  icon: string;
  mood: string;
  color: string;
}

// 统计数据
export interface Stats {
  todayCount: number;
  todayMinutes: number;
  weekCount: number;
  weekMinutes: number;
  totalCount: number;
  totalMinutes: number;
  dailyData: DailyStats[];

  // 今日报告数据
  todayCompletedTasks: number;
  todayIncompleteTasks: number;
  todayTaskBreakdown: TaskReportItem[];
  todayHourlyData: HourlySegment[];
  dailyGoal: number;

  // 周报数据
  weekStartDate: string;
  weekEndDate: string;
  weekStreakDays: number;
  weekCompletedTasks: number;
  weekIncompleteTasks: number;
  weekTaskBreakdown: TaskReportItem[];
  weekDailyData: DailyStats[];

  // 月报数据
  monthStartDate: string;
  monthEndDate: string;
  monthCount: number;
  monthMinutes: number;
  monthStreakDays: number;
  monthCompletedTasks: number;
  monthIncompleteTasks: number;
  monthTaskBreakdown: TaskReportItem[];
  monthDailyData: DailyStats[];
}

// 每日统计
export interface DailyStats {
  date: string;               // YYYY-MM-DD
  count: number;
  minutes: number;
}

// 时段统计（今日报告用）
export interface HourlySegment {
  label: string;              // "上午", "下午", "晚上", "深夜"
  startHour: number;
  count: number;
  minutes: number;
}

// 任务报告项
export interface TaskReportItem {
  taskId: number;
  taskName: string;
  sessionCount: number;
  focusMinutes: number;
  isCompleted: boolean;
}

// 计时器状态
export interface TimerData {
  state: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  type: PomodoroType;
  taskId?: number;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
