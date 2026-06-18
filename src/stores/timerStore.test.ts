import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimerStore } from "./timerStore";
import { emit } from "@tauri-apps/api/event";

// Mock @tauri-apps/api/event
vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(),
}));

const mockedEmit = vi.mocked(emit);

// Helper to get initial state
const getInitialState = () => ({
  state: "idle" as const,
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  type: "focus" as const,
  taskId: undefined,
  startTime: null,
  targetEndTime: null,
  pausedRemainingSeconds: null,
  completedPomodorosInSession: 0,
  storedFocusDuration: 25,
  storedBreakDuration: 5,
  storedLongBreakDuration: 15,
  storedAutoStart: false,
});

describe("timerStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useTimerStore.setState(getInitialState());
    vi.clearAllMocks();
  });

  describe("start", () => {
    it("starts focus timer with correct duration and emits events", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      useTimerStore.setState({ type: "focus" });
      const store = useTimerStore.getState();

      store.start(25, 5, 15, false);

      const state = useTimerStore.getState();
      expect(state.state).toBe("running");
      expect(state.remainingSeconds).toBe(25 * 60);
      expect(state.totalSeconds).toBe(25 * 60);
      expect(state.startTime).toBe(1767268800000); // 2026-01-01T12:00:00Z
      expect(state.targetEndTime).toBe(1767270300000); // +25 minutes
      expect(state.pausedRemainingSeconds).toBeNull();
      expect(state.completedPomodorosInSession).toBe(0);

      // Verify events emitted
      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "running",
        targetEndTime: 1767270300000,
      });
      expect(mockedEmit).toHaveBeenCalledWith("timer-tick", {
        remaining: 25 * 60,
      });
      expect(mockedEmit).toHaveBeenCalledWith("pet-notification", {
        title: "专注开始！加油~",
        body: "",
      });

      vi.useRealTimers();
    });

    it("starts break timer with breakDuration when type is 'break'", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      useTimerStore.setState({ type: "break" });
      const store = useTimerStore.getState();

      store.start(25, 5, 15, false);

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(5 * 60); // Uses breakDuration, not focusDuration
      expect(state.totalSeconds).toBe(5 * 60);
      expect(state.targetEndTime).toBe(1767269100000); // +5 minutes

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "break",
        targetEndTime: 1767269100000,
      });

      vi.useRealTimers();
    });

    it("stores provided durations for later use", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(30, 10, 20, true);

      const state = useTimerStore.getState();
      expect(state.storedFocusDuration).toBe(30);
      expect(state.storedBreakDuration).toBe(10);
      expect(state.storedLongBreakDuration).toBe(20);
      expect(state.storedAutoStart).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("pause", () => {
    it("pauses running timer and captures remaining time", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);
      vi.setSystemTime(new Date("2026-01-01T12:10:00Z")); // 10 minutes elapsed
      store.tick(); // Update remaining

      store.pause();

      const state = useTimerStore.getState();
      expect(state.state).toBe("paused");
      expect(state.pausedRemainingSeconds).toBe(15 * 60); // 15 minutes remaining
      expect(state.startTime).toBeNull();
      expect(state.targetEndTime).toBeNull();

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "paused",
        targetEndTime: null,
      });

      vi.useRealTimers();
    });
  });

  describe("resume", () => {
    it("resumes from paused state with correct targetEndTime", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);
      vi.setSystemTime(new Date("2026-01-01T12:10:00Z"));
      store.tick();
      store.pause();

      vi.setSystemTime(new Date("2026-01-01T12:15:00Z")); // 5 more minutes pass
      store.resume();

      const state = useTimerStore.getState();
      expect(state.state).toBe("running");
      expect(state.remainingSeconds).toBe(15 * 60); // Still 15 minutes remaining
      expect(state.pausedRemainingSeconds).toBeNull();
      expect(state.targetEndTime).toBe(1767270600000); // 12:15:00 + 15 minutes
      expect(state.startTime).toBe(1767269700000); // 12:15:00

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "running",
        targetEndTime: 1767270600000,
      });

      vi.useRealTimers();
    });

    it("does nothing when not paused (pausedRemainingSeconds is null)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.resume(); // No-op when not paused

      const state = useTimerStore.getState();
      expect(state.state).toBe("idle");
      expect(state.remainingSeconds).toBe(25 * 60);

      vi.useRealTimers();
    });
  });

  describe("stop", () => {
    it("resets to idle state and clears session counter", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);
      useTimerStore.setState({ completedPomodorosInSession: 3 });

      store.stop();

      const state = useTimerStore.getState();
      expect(state.state).toBe("idle");
      expect(state.type).toBe("focus");
      expect(state.remainingSeconds).toBe(25 * 60);
      expect(state.totalSeconds).toBe(25 * 60);
      expect(state.startTime).toBeNull();
      expect(state.targetEndTime).toBeNull();
      expect(state.pausedRemainingSeconds).toBeNull();
      expect(state.completedPomodorosInSession).toBe(0); // Always reset to 0

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "idle",
        targetEndTime: null,
      });

      vi.useRealTimers();
    });
  });

  describe("tick", () => {
    it("decrements remainingSeconds when running", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);

      vi.setSystemTime(new Date("2026-01-01T12:01:00Z")); // 1 minute elapsed
      store.tick();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(24 * 60); // 24 minutes remaining

      expect(mockedEmit).toHaveBeenCalledWith("timer-tick", {
        remaining: 24 * 60,
      });

      vi.useRealTimers();
    });

    it("clamps remainingSeconds to 0 when past targetEndTime", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);

      vi.setSystemTime(new Date("2026-01-01T12:30:00Z")); // 30 minutes elapsed (5 past end)
      store.tick();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(0); // Clamped to 0

      vi.useRealTimers();
    });

    it("does nothing when not running", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);
      store.pause();

      vi.setSystemTime(new Date("2026-01-01T12:01:00Z"));
      store.tick();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(25 * 60); // Unchanged

      vi.useRealTimers();
    });

    it("does nothing when idle", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.tick(); // No-op when idle

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(25 * 60); // Unchanged

      vi.useRealTimers();
    });
  });

  describe("switchToBreak", () => {
    it("switches to short break when completedPomodorosInSession < 4", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      useTimerStore.setState({
        storedBreakDuration: 5,
        storedLongBreakDuration: 15,
        completedPomodorosInSession: 3,
      });

      const store = useTimerStore.getState();
      store.switchToBreak();

      const state = useTimerStore.getState();
      expect(state.state).toBe("running");
      expect(state.type).toBe("break");
      expect(state.remainingSeconds).toBe(5 * 60); // Short break
      expect(state.totalSeconds).toBe(5 * 60);
      expect(state.targetEndTime).toBe(1767269100000); // +5 minutes

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "break",
        targetEndTime: 1767269100000,
      });
      expect(mockedEmit).toHaveBeenCalledWith("timer-tick", {
        remaining: 5 * 60,
      });

      vi.useRealTimers();
    });

    it("switches to long break when completedPomodorosInSession >= 4", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      useTimerStore.setState({
        storedBreakDuration: 5,
        storedLongBreakDuration: 15,
        completedPomodorosInSession: 4,
      });

      const store = useTimerStore.getState();
      store.switchToBreak();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(15 * 60); // Long break
      expect(state.totalSeconds).toBe(15 * 60);
      expect(state.targetEndTime).toBe(1767269700000); // +15 minutes

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "break",
        targetEndTime: 1767269700000,
      });
      expect(mockedEmit).toHaveBeenCalledWith("timer-tick", {
        remaining: 15 * 60,
      });

      vi.useRealTimers();
    });
  });

  describe("prepareBreakMode", () => {
    it("prepares break mode idle state with short break", () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        storedBreakDuration: 5,
        storedLongBreakDuration: 15,
        completedPomodorosInSession: 3,
      });

      const store = useTimerStore.getState();
      store.prepareBreakMode();

      const state = useTimerStore.getState();
      expect(state.state).toBe("idle");
      expect(state.type).toBe("break");
      expect(state.remainingSeconds).toBe(5 * 60); // Short break
      expect(state.totalSeconds).toBe(5 * 60);
      expect(state.startTime).toBeNull();
      expect(state.targetEndTime).toBeNull();

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "idle",
        targetEndTime: null,
      });

      vi.useRealTimers();
    });

    it("prepares break mode idle state with long break when >= 4 pomodoros", () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        storedBreakDuration: 5,
        storedLongBreakDuration: 15,
        completedPomodorosInSession: 4,
      });

      const store = useTimerStore.getState();
      store.prepareBreakMode();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(15 * 60); // Long break
      expect(state.totalSeconds).toBe(15 * 60);

      vi.useRealTimers();
    });

    it("subsequent start() uses breakDuration because type is 'break'", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      useTimerStore.setState({
        storedBreakDuration: 5,
        storedLongBreakDuration: 15,
        completedPomodorosInSession: 4,
      });

      const store = useTimerStore.getState();
      store.prepareBreakMode(); // Sets type to 'break'

      // Now start() - GlobalTimer calls this after prepareBreakMode
      store.start(25, 15, 15, false); // Note: breakDuration param is 15 (long break)

      const state = useTimerStore.getState();
      expect(state.type).toBe("break");
      expect(state.remainingSeconds).toBe(15 * 60); // Uses breakDuration param (15)
      expect(state.totalSeconds).toBe(15 * 60);

      vi.useRealTimers();
    });
  });

  describe("switchToFocus", () => {
    it("switches to focus idle state without resetting counter when < 4", () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        storedFocusDuration: 25,
        completedPomodorosInSession: 3,
      });

      const store = useTimerStore.getState();
      store.switchToFocus();

      const state = useTimerStore.getState();
      expect(state.state).toBe("idle");
      expect(state.type).toBe("focus");
      expect(state.remainingSeconds).toBe(25 * 60);
      expect(state.totalSeconds).toBe(25 * 60);
      expect(state.startTime).toBeNull();
      expect(state.targetEndTime).toBeNull();
      expect(state.completedPomodorosInSession).toBe(3); // NOT reset

      expect(mockedEmit).toHaveBeenCalledWith("timer-state", {
        state: "idle",
        targetEndTime: null,
      });

      vi.useRealTimers();
    });

    it("switches to focus idle state and resets counter when >= 4", () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        storedFocusDuration: 25,
        completedPomodorosInSession: 4,
      });

      const store = useTimerStore.getState();
      store.switchToFocus();

      const state = useTimerStore.getState();
      expect(state.completedPomodorosInSession).toBe(0); // Reset to 0

      vi.useRealTimers();
    });
  });

  describe("setTaskId", () => {
    it("sets the task ID", () => {
      const store = useTimerStore.getState();
      store.setTaskId(123);

      expect(useTimerStore.getState().taskId).toBe(123);
    });

    it("clears the task ID when undefined", () => {
      useTimerStore.setState({ taskId: 123 });

      const store = useTimerStore.getState();
      store.setTaskId(undefined);

      expect(useTimerStore.getState().taskId).toBeUndefined();
    });
  });

  describe("INCONSISTENCY: completedPomodorosInSession reset logic", () => {
    it.skip("ISSUE: stop() always resets counter to 0, but switchToFocus() only resets when >= 4", () => {
      // This test documents the inconsistency:
      // - stop() unconditionally sets completedPomodorosInSession = 0
      // - switchToFocus() only resets when completedPomodorosInSession >= 4
      // This creates different behavior depending on which function is called

      vi.useFakeTimers();

      useTimerStore.setState({ completedPomodorosInSession: 3 });

      // stop() always resets
      useTimerStore.getState().stop();
      expect(useTimerStore.getState().completedPomodorosInSession).toBe(0);

      // Set up again
      useTimerStore.setState({ completedPomodorosInSession: 3 });

      // switchToFocus() does NOT reset when < 4
      useTimerStore.getState().switchToFocus();
      expect(useTimerStore.getState().completedPomodorosInSession).toBe(3);

      vi.useRealTimers();
    });
  });

  describe("INCONSISTENCY: tick doesn't update state when reaching zero", () => {
    it.skip("ISSUE: tick() clamps remainingSeconds to 0 but state stays 'running'", () => {
      // This test documents a design issue:
      // - tick() sets remainingSeconds to 0 when past targetEndTime
      // - But state remains "running", doesn't auto-switch to "idle"
      // - Completion detection relies on component subscribing to remainingSeconds
      // - This creates coupling between store and component

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const store = useTimerStore.getState();
      store.start(25, 5, 15, false);

      vi.setSystemTime(new Date("2026-01-01T12:30:00Z")); // 5 minutes past end
      store.tick();

      const state = useTimerStore.getState();
      expect(state.remainingSeconds).toBe(0);
      expect(state.state).toBe("running"); // Still running!

      vi.useRealTimers();
    });
  });

  describe("DEAD CODE?: switchToBreak and switchToFocus usage", () => {
    it.skip("TODO: switchToBreak appears to be dead code", () => {
      // grep analysis shows switchToBreak is only:
      // 1. Defined in timerStore.ts
      // 2. Exported in timerStore.ts interface
      // 3. NOT called anywhere in the codebase
      // GlobalTimer uses prepareBreakMode() instead, which sets idle state
      // Then GlobalTimer calls start() separately

      // This test would fail if called, proving it's not used
      const store = useTimerStore.getState();
      store.switchToBreak();

      // If this were called, it would transition to running state immediately
      // But GlobalTimer uses prepareBreakMode (idle) + start (running) pattern
    });

    it.skip("TODO: switchToFocus is only called from Timer.tsx button", () => {
      // grep analysis shows switchToFocus is only:
      // 1. Defined in timerStore.ts
      // 2. Exported in timerStore.ts interface
      // 3. Called from Timer.tsx button onClick handler
      // 4. NOT called from GlobalTimer completion flow

      // GlobalTimer calls stop() after break completion, not switchToFocus()
      // So switchToFocus is manual user action only
    });
  });
});
