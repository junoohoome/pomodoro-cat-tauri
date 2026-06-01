import { useEffect } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification as sendTauriNotification } from "@tauri-apps/plugin-notification";
import { emit } from "@tauri-apps/api/event";
import { playCompleteSound, playBreakEndSound } from "../lib/sound";

let isCompleting = false;

/** 计时完成处理 — 独立函数，不依赖 React 组件生命周期 */
async function handleComplete(completedType: string) {
  try {
    const config = useUserStore.getState().config;
    const { currentTask } = useTaskStore.getState();

    if (completedType === "focus") {
      // 记录番茄钟
      const focusMinutes = config?.focusDuration || 25;
      try {
        await invoke("record_pomodoro", {
          record: {
            taskId: currentTask?.id || null,
            duration: focusMinutes,
            type: "focus",
          },
        });
      } catch (e) {
        console.error("record_pomodoro failed:", e);
      }

      // 添加罐头到库存
      try {
        await invoke("add_food");
      } catch (e) {
        console.error("add_food failed:", e);
      }

      // 更新任务进度
      if (currentTask) {
        try {
          const newProgress = currentTask.completedPomodoros + 1;
          const taskCompleted = newProgress >= currentTask.targetPomodoros;
          await useTaskStore.getState().incrementTaskProgress(currentTask.id);
          if (taskCompleted) {
            useTaskStore.getState().setCurrentTask(null);
            useTimerStore.getState().setTaskId(undefined);
          }
        } catch (e) {
          console.error("task update failed:", e);
        }
      }

      // 增加番茄钟计数
      useTimerStore.setState(s => ({ completedPomodorosInSession: s.completedPomodorosInSession + 1 }));

      // 刷新统计
      try { await useUserStore.getState().fetchStats(); } catch { /* ignore */ }
      try { await useUserStore.getState().fetchCatState(); } catch { /* ignore */ }
      const todayCount = useUserStore.getState().stats?.todayCount || 0;
      const dailyGoal = config?.dailyGoal || 4;

      // 播放声音
      if (config?.enableSound !== false) {
        playCompleteSound();
      }

      // 发送通知
      const msg = todayCount >= dailyGoal ? '目标达成！今天太棒了！' : '太棒了！休息一下吧~';
      try { await emit("pet-notification", { title: '专注完成！获得 1 个罐头 🥫', body: msg }); } catch { /* ignore */ }
      if (config?.enableNotifications !== false) {
        try { await sendTauriNotification({ title: '专注完成！获得 1 个罐头 🥫', body: msg }); } catch { /* ignore */ }
      }
    } else {
      // 休息结束
      if (config?.enableSound !== false) {
        playBreakEndSound();
      }

      try { await emit("pet-notification", { title: '休息结束！', body: '准备开始新的专注吧~' }); } catch { /* ignore */ }
      if (config?.enableNotifications !== false) {
        try { await sendTauriNotification({ title: '休息结束！', body: '准备开始新的专注吧~' }); } catch { /* ignore */ }
      }
    }
  } catch (e) {
    console.error("handleComplete error:", e);
  } finally {
    // 状态切换必须执行，否则计时器卡在 00:00
    const store = useTimerStore.getState();
    const config = useUserStore.getState().config;
    if (completedType === "focus") {
      store.prepareBreakMode();
      if (config?.autoStart) {
        const isLongBreak = store.completedPomodorosInSession >= 4;
        const breakMins = isLongBreak ? store.storedLongBreakDuration : store.storedBreakDuration;
        store.start(store.storedFocusDuration, breakMins, store.storedLongBreakDuration, store.storedAutoStart);
      }
    } else {
      store.stop();
      if (config?.autoStart) {
        store.start(store.storedFocusDuration, store.storedBreakDuration, store.storedLongBreakDuration, store.storedAutoStart);
      }
    }
    isCompleting = false;
  }
}

/**
 * 全局计时器组件
 * 挂载在 App 顶层，始终存活。
 */
export default function GlobalTimer() {
  const { state, tick } = useTimerStore();

  // 每秒 tick
  useEffect(() => {
    if (state === "running") {
      const intervalId = setInterval(() => {
        tick();
      }, 1000);
      return () => { clearInterval(intervalId); };
    }
  }, [state, tick]);

  // 监听 remainingSeconds 归零 → 触发完成逻辑
  useEffect(() => {
    const unsubscribe = useTimerStore.subscribe((state, prevState) => {
      if (
        prevState.remainingSeconds > 0 &&
        state.remainingSeconds === 0 &&
        prevState.state === "running" &&
        !isCompleting
      ) {
        isCompleting = true;
        handleComplete(prevState.type);
      }
    });
    return unsubscribe;
  }, []);

  // 如果 currentTask 已完成（番茄钟已满），自动清除
  useEffect(() => {
    const unsubscribe = useTaskStore.subscribe((state) => {
      if (state.currentTask?.completed) {
        useTaskStore.getState().setCurrentTask(null);
        useTimerStore.getState().setTaskId(undefined);
      }
    });
    return unsubscribe;
  }, []);

  return null;
}
