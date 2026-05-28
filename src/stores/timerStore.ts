import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { TimerState, PomodoroType } from "../types";

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 更新菜单栏标题
async function updateTrayTitle(state: TimerState, remainingSeconds: number, _type: PomodoroType) {
  try {
    let title = ""; // 默认为空（只显示 logo 图标）

    if (state === "running" || state === "paused") {
      // 只显示时间，不显示 emoji
      title = formatTime(remainingSeconds);
    }

    await invoke("update_tray_title", { title });
  } catch (e) {
    // macOS only - ignore errors on other platforms
    console.warn('Tray update failed:', e);
  }
}

interface TimerStore {
  // 状态
  state: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  type: PomodoroType;
  taskId: number | undefined;

  // 测试模式
  isTestMode: boolean;

  // 时间戳（用于处理睡眠唤醒）
  startTime: number | null;
  targetEndTime: number | null;
  pausedRemainingSeconds: number | null;

  // 操作
  start: (focusDuration: number, breakDuration: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  switchToBreak: () => void;
  setTaskId: (taskId: number | undefined) => void;
  tick: () => void;
  setTestMode: (isTestMode: boolean) => void;
}

// 测试模式时长
const TEST_FOCUS = 1; // 分钟
const TEST_BREAK = 1; // 分钟

// 正常模式时长
const NORMAL_FOCUS = 25; // 分钟
const NORMAL_BREAK = 5; // 分钟

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: "idle",
  remainingSeconds: NORMAL_FOCUS * 60,
  totalSeconds: NORMAL_FOCUS * 60,
  type: "focus",
  taskId: undefined,
  isTestMode: false,
  startTime: null,
  targetEndTime: null,
  pausedRemainingSeconds: null,

  start: (focusDuration: number, breakDuration: number) => {
    const { type } = get();
    const duration = type === "focus" ? focusDuration : breakDuration;
    const newSeconds = duration * 60;

    const now = Date.now();
    const targetEndTime = now + (newSeconds * 1000);

    set({
      state: "running",
      remainingSeconds: newSeconds,
      totalSeconds: newSeconds,
      startTime: now,
      targetEndTime: targetEndTime,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("running", newSeconds, type);
  },

  pause: () => {
    const { remainingSeconds, type } = get();
    set({
      state: "paused",
      pausedRemainingSeconds: remainingSeconds,
      startTime: null,
      targetEndTime: null,
    });
    updateTrayTitle("paused", remainingSeconds, type);
  },

  resume: () => {
    const { pausedRemainingSeconds, type } = get();
    if (pausedRemainingSeconds === null) return;

    const now = Date.now();
    const targetEndTime = now + (pausedRemainingSeconds * 1000);

    set({
      state: "running",
      remainingSeconds: pausedRemainingSeconds,
      startTime: now,
      targetEndTime: targetEndTime,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("running", pausedRemainingSeconds, type);
  },

  stop: () => {
    const { isTestMode } = get();
    const initialSeconds = isTestMode ? TEST_FOCUS * 60 : NORMAL_FOCUS * 60;
    set({
      state: "idle",
      remainingSeconds: initialSeconds,
      totalSeconds: initialSeconds,
      type: "focus",
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("idle", initialSeconds, "focus");
  },

  switchToBreak: () => {
    const { isTestMode } = get();
    const breakSeconds = isTestMode ? TEST_BREAK * 60 : NORMAL_BREAK * 60;

    const now = Date.now();
    const targetEndTime = now + (breakSeconds * 1000);

    set({
      state: "running",
      type: "break",
      remainingSeconds: breakSeconds,
      totalSeconds: breakSeconds,
      startTime: now,
      targetEndTime: targetEndTime,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("running", breakSeconds, "break");
  },

  setTaskId: (taskId: number | undefined) => {
    set({ taskId });
  },

  tick: () => {
    const { targetEndTime, state, type } = get();
    if (state === "running" && targetEndTime !== null) {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      set({ remainingSeconds: remaining });
      // 每秒更新菜单栏
      updateTrayTitle("running", remaining, type);
    }
  },

  setTestMode: (isTestMode: boolean) => {
    const { state } = get();
    // 只有在空闲状态下才能切换测试模式
    if (state !== "idle") return;

    const initialSeconds = isTestMode ? TEST_FOCUS * 60 : NORMAL_FOCUS * 60;
    set({
      isTestMode,
      remainingSeconds: initialSeconds,
      totalSeconds: initialSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("idle", initialSeconds, "focus");
  },
}));
