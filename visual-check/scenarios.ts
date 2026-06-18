import { baseFixture, defaultCatState, defaultStats, type InvokeFixture } from "./fixtures";

export interface Scenario {
  label: string; // 人类可读名
  slug: string; // 截图文件名用
  route: string; // 路由 path（如 "/tasks"）
  intent: string; // 边界意图（写进 manifest 供 Claude 分析参考）
  fixture: InvokeFixture; // override baseFixture（同命付认场景值优先）
}

// 任务工厂（构造边界任务数据）
const task = (id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  name: `任务 ${id}`,
  durationTarget: 2,
  completedMinutes: 0,
  completed: false,
  priority: "medium",
  deadline: null,
  createdAt: "2026-06-01 09:00:00",
  updatedAt: "2026-06-01 09:00:00",
  deletedAt: null,
  ...overrides,
});

// 超长任务名（测溢出）
const LONG_NAME =
  "这是一个非常非常非常非常非常长的任务名字用来测试UI在极端长度下是否会溢出或折行正确";

// 20 条任务（测长列表 + 各种优先级/截止）
const heavyTasks = Array.from({ length: 20 }, (_, i) =>
  task(i + 1, {
    name: `${LONG_NAME} #${i + 1}`,
    priority: (["high", "medium", "low"] as const)[i % 3],
    deadline: i % 2 === 0 ? "2026-06-30" : null,
    completedMinutes: i * 10,
  })
);

// 密集日报数据（测图表/满统计）
const fullDailyData = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-06-${12 + i}`,
  count: 2 + i,
  minutes: (2 + i) * 25,
}));

export const scenarios: Scenario[] = [
  {
    label: "Timer 空",
    slug: "timer-empty",
    route: "/",
    intent: "无当前任务、零统计——测空状态排版",
    fixture: {},
  },
  {
    label: "Timer 超长任务名",
    slug: "timer-long-task",
    route: "/",
    intent: "当前任务名超长——测 timer 页任务名是否溢出",
    fixture: { get_tasks: [task(1, { name: LONG_NAME })] },
  },
  {
    label: "Tasks 空",
    slug: "tasks-empty",
    route: "/tasks",
    intent: "无任务——测任务页空状态",
    fixture: {},
  },
  {
    label: "Tasks 20条重载",
    slug: "tasks-heavy",
    route: "/tasks",
    intent: "20条超长名任务 + 各种优先级/截止——测长列表与截断",
    fixture: { get_tasks: heavyTasks },
  },
  {
    label: "Cat 标准",
    slug: "cat-standard",
    route: "/cat",
    intent: "5kg 标准体重——基准",
    fixture: {},
  },
  {
    label: "Cat 极重",
    slug: "cat-heavy",
    route: "/cat",
    intent: "9.5kg 圆滚滚——测体重条/文案在极端上限",
    fixture: { get_cat_state: { ...defaultCatState, weight: 9.5 } },
  },
  {
    label: "Cat 极轻",
    slug: "cat-light",
    route: "/cat",
    intent: "1.5kg 骨感——测体重条在极端下限",
    fixture: { get_cat_state: { ...defaultCatState, weight: 1.5 } },
  },
  {
    label: "Stats 空",
    slug: "stats-empty",
    route: "/stats",
    intent: "无记录——测空图表/空报表",
    fixture: {},
  },
  {
    label: "Stats 满",
    slug: "stats-full",
    route: "/stats",
    intent: "密集数据 + 多任务明细——测图表与报表在满载下排版",
    fixture: {
      get_stats: {
        ...defaultStats,
        todayCount: 4,
        todayMinutes: 100,
        weekCount: 20,
        weekMinutes: 500,
        totalCount: 100,
        totalMinutes: 2500,
        dailyData: fullDailyData,
        dailyGoal: 4,
        weekStreakDays: 5,
        weekDailyData: fullDailyData,
        monthCount: 80,
        monthMinutes: 2000,
        monthStreakDays: 20,
        monthDailyData: fullDailyData,
      },
    },
  },
  {
    label: "Settings 默认",
    slug: "settings-default",
    route: "/settings",
    intent: "默认配置——测设置页布局",
    fixture: {},
  },
];
