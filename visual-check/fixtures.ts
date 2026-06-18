// 视觉检查用的 fixture：命令名 → 可序列化返回值。
// 关键约束：必须是纯数据（Record<string, unknown>），因为 Playwright addInitScript
// 会把 fixture 序列化后传进页面 realm，不能传函数。
export type InvokeFixture = Record<string, unknown>;

// 默认用户配置（镜像 src-tauri/src/db.rs 的 UserConfig）
export const defaultUserConfig = {
  id: 1,
  focusDuration: 25,
  breakDuration: 5,
  enableNotifications: false,
  enableSound: true,
  theme: "light",
  updatedAt: "2026-01-01 00:00:00",
  longBreakDuration: 15,
  autoStart: false,
  dailyGoal: 4,
  autoLaunch: false,
  showDesktopPet: false,
  showDailyGoal: true,
};

// 默认猫咪状态（标准体重 5kg）
export const defaultCatState = {
  weight: 5.0,
  foodInventory: 3,
  lastFedAt: "2026-06-18 10:00:00",
  lastMetabolismAt: "2026-06-18 10:00:00",
  foodEarnedToday: 1,
  foodEarnedDate: "2026-06-18",
};

// 默认统计（全零/空数组，覆盖 Stats 的所有字段，避免页面取 undefined 崩溃）
export const defaultStats = {
  todayCount: 0,
  todayMinutes: 0,
  weekCount: 0,
  weekMinutes: 0,
  totalCount: 0,
  totalMinutes: 0,
  dailyData: [],
  todayCompletedTasks: 0,
  todayIncompleteTasks: 0,
  todayTaskBreakdown: [],
  todayHourlyData: [],
  dailyGoal: 4,
  weekStartDate: "2026-06-12",
  weekEndDate: "2026-06-18",
  weekStreakDays: 0,
  weekCompletedTasks: 0,
  weekIncompleteTasks: 0,
  weekTaskBreakdown: [],
  weekDailyData: [],
  monthStartDate: "2026-06-01",
  monthEndDate: "2026-06-30",
  monthCount: 0,
  monthMinutes: 0,
  monthStreakDays: 0,
  monthCompletedTasks: 0,
  monthIncompleteTasks: 0,
  monthTaskBreakdown: [],
  monthDailyData: [],
};

// base fixture：覆盖所有页面 mount 期调用的命令。
// 场景在 scenarios.ts 里 override 特定命令制造边界。
export const baseFixture: InvokeFixture = {
  get_user_config: defaultUserConfig,
  get_tasks: [],
  get_stats: defaultStats,
  get_cat_state: defaultCatState,
};
