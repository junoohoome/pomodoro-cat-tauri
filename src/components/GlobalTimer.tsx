import { useEffect } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification as sendTauriNotification } from "@tauri-apps/plugin-notification";
import { emit } from "@tauri-apps/api/event";
import { playCompleteSound, playBreakEndSound } from "../lib/sound";

/**
 * 全局计时器组件
 * 负责处理计时器的核心逻辑，确保在页面切换时计时器不会停止
 * 使用时间戳方案，即使电脑睡眠唤醒后也能正确计算剩余时间
 * 同时全局监听 timer-complete 事件，确保任何页面都能触发声音和通知
 */
export default function GlobalTimer() {
  const { state, tick, type, prepareBreakMode, stop, start } = useTimerStore();

  useEffect(() => {
    // 只有在运行状态时才启动 interval
    if (state === "running") {
      const intervalId = setInterval(() => {
        tick();
      }, 1000);

      // 清理函数：组件卸载或状态改变时清除 interval
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [state, tick]);

  // 全局监听计时完成事件 — 无论当前在哪个页面都能响应
  useEffect(() => {
    const unlisten = listen<{ type: string }>("timer-complete", async (event) => {
      const completedType = event.payload.type;
      const config = useUserStore.getState().config;
      const { currentTask } = useTaskStore.getState();

      if (completedType === "focus") {
        // 记录番茄钟
        const focusMinutes = config?.focusDuration || 25;
        await invoke("record_pomodoro", {
          record: {
            taskId: currentTask?.id || null,
            duration: focusMinutes,
            type: "focus",
          },
        });

        // 更新任务进度
        if (currentTask) {
          await useTaskStore.getState().incrementTaskProgress(currentTask.id);
        }

        // 增加番茄钟计数
        useTimerStore.setState(s => ({ completedPomodorosInSession: s.completedPomodorosInSession + 1 }));

        // 刷新统计
        await useUserStore.getState().fetchStats();
        const todayCount = useUserStore.getState().stats?.todayCount || 0;
        const dailyGoal = config?.dailyGoal || 4;

        // 播放声音
        if (config?.enableSound !== false) {
          playCompleteSound();
        }

        // 发送通知
        if (config?.enableNotifications !== false) {
          const msg = todayCount >= dailyGoal
            ? '目标达成！今天太棒了！'
            : '太棒了！休息一下吧~';
          try { await sendTauriNotification({ title: '专注完成！', body: msg }); } catch { /* ignore */ }
          try { await emit("pet-notification", { title: '专注完成！', body: msg }); } catch { /* ignore */ }
        }

        // 进入休息模式
        prepareBreakMode();

        // 自动开始休息
        if (config?.autoStart) {
          const store = useTimerStore.getState();
          const isLongBreak = store.completedPomodorosInSession >= 4;
          const breakMins = isLongBreak ? store.storedLongBreakDuration : store.storedBreakDuration;
          start(store.storedFocusDuration, breakMins, store.storedLongBreakDuration, store.storedAutoStart);
        }
      } else {
        // 休息结束
        if (config?.enableSound !== false) {
          playBreakEndSound();
        }

        if (config?.enableNotifications !== false) {
          try { await sendTauriNotification({ title: '休息结束！', body: '准备开始新的专注吧~' }); } catch { /* ignore */ }
          try { await emit("pet-notification", { title: '休息结束！', body: '准备开始新的专注吧~' }); } catch { /* ignore */ }
        }

        stop();

        // 自动开始下一个专注
        if (config?.autoStart) {
          const store = useTimerStore.getState();
          start(store.storedFocusDuration, store.storedBreakDuration, store.storedLongBreakDuration, store.storedAutoStart);
        }
      }
    });

    return () => { unlisten.then(fn => fn()); };
  }, [prepareBreakMode, stop, start]);

  // 这个组件不渲染任何 UI
  return null;
}
