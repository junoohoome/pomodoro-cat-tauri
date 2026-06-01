import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { UserConfig, Stats, CatState } from "../types";

interface UserStore {
  // 用户配置
  config: UserConfig | null;
  isLoadingConfig: boolean;

  // 统计数据
  stats: Stats | null;
  isLoadingStats: boolean;

  // 猫咪状态
  catState: CatState | null;

  // 操作
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<UserConfig>) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchCatState: () => Promise<void>;
  feedCat: () => Promise<void>;
  exportData: (path: string) => Promise<void>;
  importData: (path: string) => Promise<void>;
  toggleAutoLaunch: (enabled: boolean) => Promise<void>;
  resetConfig: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  config: null,
  isLoadingConfig: false,
  stats: null,
  isLoadingStats: false,
  catState: null,

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
      longBreakDuration: updates.longBreakDuration,
      autoStart: updates.autoStart,
      dailyGoal: updates.dailyGoal,
      autoLaunch: updates.autoLaunch,
      showDesktopPet: updates.showDesktopPet,
      showDailyGoal: updates.showDailyGoal,
    });
    await get().fetchConfig();
  },

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      const stats = await invoke<Stats>("get_stats");
      set({ stats });
    } finally {
      set({ isLoadingStats: false });
    }
  },

  fetchCatState: async () => {
    try {
      const catState = await invoke<CatState>("get_cat_state");
      set({ catState });
    } catch (e) {
      console.error("fetchCatState failed:", e);
    }
  },

  feedCat: async () => {
    try {
      const catState = await invoke<CatState>("feed_cat");
      set({ catState });
    } catch (e) {
      console.error("feedCat failed:", e);
      throw e;
    }
  },

  exportData: async (path: string) => {
    await invoke("export_data", { path });
  },

  importData: async (path: string) => {
    await invoke("import_data", { path });
    await get().fetchConfig();
    await get().fetchStats();
    await get().fetchCatState();
  },

  toggleAutoLaunch: async (enabled: boolean) => {
    const prevConfig = get().config;
    if (prevConfig) {
      set({ config: { ...prevConfig, autoLaunch: enabled } });
    }
    try {
      await invoke("update_user_config", { autoLaunch: enabled });
      const { enable, disable } = await import("@tauri-apps/plugin-autostart");
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
    } catch {
      if (prevConfig) {
        set({ config: prevConfig });
      }
    }
  },

  resetConfig: async () => {
    const config = await invoke<UserConfig>("reset_user_config");
    set({ config });
  },
}));
