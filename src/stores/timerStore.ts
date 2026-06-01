import { create } from "zustand";
import { TrayIcon } from "@tauri-apps/api/tray";
import { emit } from "@tauri-apps/api/event";
import { TimerState, PomodoroType } from "../types";

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 更新菜单栏标题（使用 Tauri 2 原生 API，性能最优）
async function updateTrayTitle(state: TimerState, remainingSeconds: number, _type: PomodoroType) {
  try {
    let title = ""; // 默认为空（只显示 logo 图标）

    if (state === "running" || state === "paused") {
      // 只显示时间，不显示 emoji
      title = formatTime(remainingSeconds);
    }

    // 直接更新 tray icon 的 title，不需要重新创建
    const tray = await TrayIcon.getById("main-tray");
    await tray?.setTitle(title);
  } catch (e) {
    // macOS only - ignore errors on other platforms
    console.warn("Tray update failed:", e);
  }
}

// 向宠物窗口发送计时器状态
async function emitTimerState(state: TimerState, type: PomodoroType) {
  try {
    let petState: string = state;
    if (state === "running" && type === "break") {
      petState = "break";
    }
    await emit("timer-state", { state: petState });
  } catch {
    // Pet window may not exist
  }
}

async function emitTimerTick(remaining: number) {
  try {
    await emit("timer-tick", { remaining });
  } catch {
    // Pet window may not exist
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

  completedPomodorosInSession: number;
  storedFocusDuration: number;
  storedBreakDuration: number;
  storedLongBreakDuration: number;
  storedAutoStart: boolean;

  // 操作
  start: (focusDuration: number, breakDuration: number, longBreakDuration?: number, autoStart?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  switchToBreak: () => void;
  prepareBreakMode: () => void;
  switchToFocus: () => void;
  setTaskId: (taskId: number | undefined) => void;
  tick: () => void;
  setTestMode: (isTestMode: boolean) => void;
}

// 测试模式时长
const TEST_FOCUS = 1; // 分钟
const TEST_BREAK = 1; // 分钟

// 正常模式时长（默认值，实际使用时从配置读取）
const NORMAL_FOCUS = 25; // 分钟

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
  completedPomodorosInSession: 0,
  storedFocusDuration: 25,
  storedBreakDuration: 5,
  storedLongBreakDuration: 15,
  storedAutoStart: false,

  start: (focusDuration: number, breakDuration: number, longBreakDuration: number = 15, autoStart: boolean = false) => {
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
      storedFocusDuration: focusDuration,
      storedBreakDuration: breakDuration,
      storedLongBreakDuration: longBreakDuration,
      storedAutoStart: autoStart,
    });
    updateTrayTitle("running", newSeconds, type);
    emitTimerState("running", type);
    emitTimerTick(newSeconds);
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
    emitTimerState("paused", type);
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
    emitTimerState("running", type);
    emitTimerTick(pausedRemainingSeconds);
  },

  stop: () => {
    const { isTestMode, storedFocusDuration } = get();
    const initialSeconds = isTestMode ? TEST_FOCUS * 60 : storedFocusDuration * 60;
    set({
      state: "idle",
      remainingSeconds: initialSeconds,
      totalSeconds: initialSeconds,
      type: "focus",
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
      completedPomodorosInSession: 0,
    });
    updateTrayTitle("idle", initialSeconds, "focus");
    emitTimerState("idle", "focus");
  },

  switchToBreak: () => {
    const { isTestMode, storedBreakDuration, storedLongBreakDuration, completedPomodorosInSession } = get();
    const isLongBreak = completedPomodorosInSession >= 4;
    const breakMinutes = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
    const breakSeconds = isTestMode ? TEST_BREAK * 60 : breakMinutes * 60;

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
    emitTimerState("running", "break");
    emitTimerTick(breakSeconds);
  },

  prepareBreakMode: () => {
    const { isTestMode, storedBreakDuration, storedLongBreakDuration, completedPomodorosInSession } = get();
    const isLongBreak = completedPomodorosInSession >= 4;
    const breakMinutes = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
    const breakSeconds = isTestMode ? TEST_BREAK * 60 : breakMinutes * 60;

    set({
      state: "idle",
      type: "break",
      remainingSeconds: breakSeconds,
      totalSeconds: breakSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
    });
    updateTrayTitle("idle", breakSeconds, "break");
    emitTimerState("idle", "break");
  },

  switchToFocus: () => {
    const { isTestMode, storedFocusDuration, completedPomodorosInSession } = get();
    const shouldReset = completedPomodorosInSession >= 4;
    const focusSeconds = isTestMode ? TEST_FOCUS * 60 : storedFocusDuration * 60;

    set({
      state: "idle",
      type: "focus",
      remainingSeconds: focusSeconds,
      totalSeconds: focusSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
      ...(shouldReset ? { completedPomodorosInSession: 0 } : {}),
    });
    updateTrayTitle("idle", focusSeconds, "focus");
    emitTimerState("idle", "focus");
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
      emitTimerTick(remaining);
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
    emitTimerState("idle", "focus");
  },
}));
