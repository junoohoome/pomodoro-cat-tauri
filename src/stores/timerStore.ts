import { create } from "zustand";
import { emit } from "@tauri-apps/api/event";
import { TimerState, PomodoroType } from "../types";

// 菜单栏标题更新已移除（不再显示计时）

// 向宠物窗口发送计时器状态（包含 targetEndTime，宠物窗口可自行倒计时）
async function emitTimerState(state: TimerState, type: PomodoroType, targetEndTime: number | null = null) {
  try {
    let petState: string = state;
    if (state === "running" && type === "break") {
      petState = "break";
    }
    await emit("timer-state", { state: petState, targetEndTime });
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
  prepareBreakMode: () => void;
  switchToFocus: () => void;
  setTaskId: (taskId: number | undefined) => void;
  tick: () => void;
}

// 正常模式时长（默认值，实际使用时从配置读取）
const NORMAL_FOCUS = 25; // 分钟 // 分钟

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: "idle",
  remainingSeconds: NORMAL_FOCUS * 60,
  totalSeconds: NORMAL_FOCUS * 60,
  type: "focus",
  taskId: undefined,
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

    emitTimerState("running", type, targetEndTime);
    emitTimerTick(newSeconds);

    // 宠物气泡提示
    const msg = type === "focus" ? "专注开始！加油~" : "休息开始，放松一下~";
    try { emit("pet-notification", { title: msg, body: "" }); } catch { /* ignore */ }
  },

  pause: () => {
    const { remainingSeconds, type } = get();
    set({
      state: "paused",
      pausedRemainingSeconds: remainingSeconds,
      startTime: null,
      targetEndTime: null,
    });

    emitTimerState("paused", type, null);
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

    emitTimerState("running", type, targetEndTime);
    emitTimerTick(pausedRemainingSeconds);
  },

  stop: () => {
    const { storedFocusDuration } = get();
    const initialSeconds = storedFocusDuration * 60;
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

    emitTimerState("idle", "focus", null);
  },

  prepareBreakMode: () => {
    const { storedBreakDuration, storedLongBreakDuration, completedPomodorosInSession } = get();
    const isLongBreak = completedPomodorosInSession >= 4;
    const breakMinutes = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
    const breakSeconds = breakMinutes * 60;

    set({
      state: "idle",
      type: "break",
      remainingSeconds: breakSeconds,
      totalSeconds: breakSeconds,
      startTime: null,
      targetEndTime: null,
      pausedRemainingSeconds: null,
    });

    emitTimerState("idle", "break", null);
  },

  switchToFocus: () => {
    const { storedFocusDuration, completedPomodorosInSession } = get();
    const shouldReset = completedPomodorosInSession >= 4;
    const focusSeconds = storedFocusDuration * 60;

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

    emitTimerState("idle", "focus", null);
  },

  setTaskId: (taskId: number | undefined) => {
    set({ taskId });
  },

  tick: () => {
    const { targetEndTime, state } = get();
    if (state === "running" && targetEndTime !== null) {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      set({ remainingSeconds: remaining });
      emitTimerTick(remaining);
    }
  },
}));
