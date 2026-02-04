import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { UserConfig, Stats, UserData } from "../types";

interface UserStore {
  // 用户配置
  config: UserConfig | null;
  isLoadingConfig: boolean;

  // 统计数据
  stats: Stats | null;
  isLoadingStats: boolean;

  // 用户数据（猫咪系统）
  userData: UserData | null;

  // 操作
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<UserConfig>) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchUserData: () => Promise<void>;
}

// 猫咪成长阶段配置
const CAT_STAGES = [
  { level: 1, name: "猫Baby", cansNeeded: 10 },
  { level: 2, name: "幼猫", cansNeeded: 30 },
  { level: 3, name: "成年猫", cansNeeded: 60 },
  { level: 4, name: "学者猫", cansNeeded: 100 },
  { level: 5, name: "博士猫", cansNeeded: 1000 },
];

// 计算猫咪等级（与小程序逻辑一致：从最高等级往下遍历，找到第一个满足条件的等级）
function calculateCatLevel(totalCans: number): { level: number; name: string } {
  let newLevel = 1;
  for (let i = CAT_STAGES.length - 1; i >= 0; i--) {
    const stage = CAT_STAGES[i];
    if (totalCans >= stage.cansNeeded) {
      newLevel = stage.level;
      break;
    }
  }
  return { level: newLevel, name: CAT_STAGES.find((s) => s.level === newLevel)!.name };
}

export const useUserStore = create<UserStore>((set, get) => ({
  config: null,
  isLoadingConfig: false,
  stats: null,
  isLoadingStats: false,
  userData: null,

  fetchConfig: async () => {
    set({ isLoadingConfig: true });
    try {
      const config = await invoke<UserConfig>("get_user_config");
      set({ config });
    } finally {
      set({ isLoadingConfig: false });
    }
  },

  updateConfig: async (updates) => {
    await invoke("update_user_config", {
      focusDuration: updates.focusDuration,
      breakDuration: updates.breakDuration,
      enableNotifications: updates.enableNotifications,
      enableSound: updates.enableSound,
      theme: updates.theme,
    });
    await get().fetchConfig();
  },

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      const stats = await invoke<Stats>("get_stats");
      set({ stats });

      // 根据统计数据计算用户数据
      const { level } = calculateCatLevel(stats.totalCount);
      set({
        userData: {
          level,
          totalCans: stats.totalCount,
          totalMinutes: stats.totalMinutes,
          streakDays: 0, // TODO: 计算连续天数
        },
      });
    } finally {
      set({ isLoadingStats: false });
    }
  },

  fetchUserData: async () => {
    // 用户数据从统计数据中计算
    await get().fetchStats();
  },
}));
