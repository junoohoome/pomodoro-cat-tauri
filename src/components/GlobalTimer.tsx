import { useEffect } from "react";
import { useTimerStore } from "../stores/timerStore";

/**
 * 全局计时器组件
 * 负责处理计时器的核心逻辑，确保在页面切换时计时器不会停止
 * 使用时间戳方案，即使电脑睡眠唤醒后也能正确计算剩余时间
 */
export default function GlobalTimer() {
  const { state, tick } = useTimerStore();

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

  // 这个组件不渲染任何 UI
  return null;
}