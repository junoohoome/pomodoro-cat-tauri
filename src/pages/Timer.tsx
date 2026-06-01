import { useEffect } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification as sendTauriNotification } from "@tauri-apps/plugin-notification";
import { emit } from "@tauri-apps/api/event";
import { playCompleteSound, playBreakEndSound } from "../lib/sound";

const CAT_ICONS: Record<number, string> = {
  1: "🐱",
  2: "😿",
  3: "😸",
  4: "🙀",
  5: "😾",
};

export default function TimerPage() {
  const {
    state,
    remainingSeconds,
    totalSeconds,
    type,
    start,
    pause,
    resume,
    stop,
    prepareBreakMode,
    switchToFocus,
    setTestMode,
  } = useTimerStore();

  const { currentTask, fetchActiveTasks, incrementTaskProgress } = useTaskStore();
  const { config, fetchConfig, userData, stats, fetchStats } = useUserStore();
  const { isTestMode } = useTestModeStore();

  // 测试模式下的时长：1分钟专注，1分钟休息
  const TEST_FOCUS_DURATION = 1;
  const TEST_BREAK_DURATION = 1;

  useEffect(() => {
    fetchConfig();
    fetchActiveTasks();
    fetchStats();
  }, [fetchConfig, fetchActiveTasks, fetchStats]);

  // 同步测试模式到 timerStore
  useEffect(() => {
    setTestMode(isTestMode);
  }, [isTestMode, setTestMode]);

  useEffect(() => {
    if (state === "running" && remainingSeconds === 0) {
      handleComplete();
    }
  }, [remainingSeconds, state]);

  // 发送通知：桌面宠物可见时用宠物气泡，否则用系统通知
  const sendPetNotification = async (title: string, body: string) => {
    try {
      await emit("pet-notification", { title, body });
    } catch (e) {
      console.warn("pet-notification emit failed:", e);
    }
  };

  const sendSystemNotification = async (title: string, body: string) => {
    try {
      await sendTauriNotification({ title, body });
    } catch (error) {
      console.error('通知发送失败:', error);
      showBrowserNotification(title, body);
    }
  };

  const handleComplete = async () => {
    if (type === "focus") {
      const focusMinutes = config?.focusDuration || 25;
      await invoke("record_pomodoro", {
        record: {
          taskId: currentTask?.id || null,
          duration: focusMinutes,
          type: "focus",
        },
      });

      if (currentTask) {
        await incrementTaskProgress(currentTask.id);
      }

      // Increment pomodoro session counter for long break tracking
      useTimerStore.setState(s => ({ completedPomodorosInSession: s.completedPomodorosInSession + 1 }));

      // Check daily goal
      await fetchStats();
      const todayCount = useUserStore.getState().stats?.todayCount || 0;
      const dailyGoal = config?.dailyGoal || 8;

      // 播放声音
      if (config?.enableSound !== false) {
        playCompleteSound();
      }

      // 发送通知
      if (config?.enableNotifications !== false) {
        const msg = todayCount >= dailyGoal
          ? '目标达成！今天太棒了！'
          : '太棒了！休息一下吧~';
        sendSystemNotification('专注完成！', msg);
        sendPetNotification('专注完成！', msg);
      }

      prepareBreakMode();

      // Auto-start break if enabled
      if (config?.autoStart) {
        const { storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart, completedPomodorosInSession } = useTimerStore.getState();
        const isLongBreak = completedPomodorosInSession >= 4;
        const breakMins = isLongBreak ? storedLongBreakDuration : storedBreakDuration;
        start(storedFocusDuration, breakMins, storedLongBreakDuration, storedAutoStart);
      }
    } else {
      // 播放声音
      if (config?.enableSound !== false) {
        playBreakEndSound();
      }

      // 发送通知
      if (config?.enableNotifications !== false) {
        sendSystemNotification('休息结束！', '准备开始新的专注吧~');
        sendPetNotification('休息结束！', '准备开始新的专注吧~');
      }

      stop();

      // Auto-start next focus if enabled
      if (config?.autoStart) {
        const { storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart } = useTimerStore.getState();
        start(storedFocusDuration, storedBreakDuration, storedLongBreakDuration, storedAutoStart);
      }
    }
  };

  // 浏览器通知作为备选方案
  const showBrowserNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/logo.png' });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const catEmoji = userData ? CAT_ICONS[userData.level] || CAT_ICONS[1] : CAT_ICONS[1];

  const getPriorityBadgeClass = (priority: string) => {
    const classes = {
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return classes[priority as keyof typeof classes] || classes.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = { high: "高", medium: "中", low: "低" };
    return labels[priority as keyof typeof labels] || labels.medium;
  };

  // 根据测试模式选择时长
  const focusDuration = isTestMode ? TEST_FOCUS_DURATION : (config?.focusDuration || 25);
  const breakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.breakDuration || 5);
  const longBreakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.longBreakDuration || 15);
  const autoStart = config?.autoStart || false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* 右下角测试模式标记（仅开发环境） */}
      {import.meta.env.DEV && isTestMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(255, 107, 107, 0.9)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '15px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
          animation: 'pulse 2s infinite'
        }}>
          测试模式
        </div>
      )}

      {/* 猫咪展示 */}
      <div className="cat-display" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span className={`cat-emoji ${state === 'running' ? 'cat-breathing' : ''}`} style={{
          fontSize: '80px',
          lineHeight: '1',
          display: 'block',
          marginBottom: '8px',
          transition: 'transform 0.3s ease'
        }}>{catEmoji}</span>
      </div>

      {/* 圆形计时器 */}
      <div className="timer-container" style={{
        position: 'relative',
        width: '210px',
        height: '210px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* SVG 进度条 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '210px',
            height: '210px',
            transform: 'rotate(-90deg)',
            zIndex: 2,
          }}
          viewBox="0 0 210 210"
        >
          {/* 背景圆环 */}
          <circle
            cx="105"
            cy="105"
            r="100"
            fill="none"
            stroke="#FFECE0"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* 进度圆环 */}
          <circle
            cx="105"
            cy="105"
            r="100"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 100 * (1 - remainingSeconds / totalSeconds)}
            style={{
              transition: state === 'running' ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>

        {/* 计时器主体 */}
        <div style={{
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255, 107, 107, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div className="timer-inner" style={{ textAlign: 'center' }}>
            <span className="timer-time" style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#FF6B6B',
              lineHeight: '1',
              display: 'block',
              marginBottom: '8px',
              letterSpacing: '0.05em'
            }}>{formatTime(remainingSeconds)}</span>
            <span className="timer-label" style={{ fontSize: '14px', color: '#999' }}>
              {type === "focus" ? "专注" : "休息"}
            </span>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="control-buttons" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 10,
        alignItems: 'center'
      }}>
        {state === "idle" && type === "focus" && (
          <button
            onClick={() => start(focusDuration, breakDuration, longBreakDuration, autoStart)}
            className="btn btn-primary"
            style={{
              minWidth: '80px',
              height: '44px',
              padding: '0 16px',
              fontSize: '14px'
            }}
          >
            开始
          </button>
        )}
        {state === "idle" && type === "break" && (
          <>
            <button
              onClick={() => start(focusDuration, breakDuration, longBreakDuration, autoStart)}
              className="btn btn-primary"
              style={{
                minWidth: '80px',
                height: '44px',
                padding: '0 16px',
                fontSize: '14px'
              }}
            >
              开始
            </button>
            <button
              onClick={switchToFocus}
              className="btn btn-outline"
              style={{
                minWidth: '80px',
                height: '44px',
                padding: '0 16px',
                fontSize: '14px'
              }}
            >
              跳过
            </button>
          </>
        )}
        {state === "running" && (
          <>
            <button
              onClick={pause}
              className="btn btn-secondary"
              style={{ minWidth: '80px', height: '44px', padding: '0 16px', fontSize: '14px' }}
            >
              暂停
            </button>
            <button
              onClick={stop}
              className="btn btn-outline"
              style={{ minWidth: '70px', height: '44px', padding: '0 16px', fontSize: '14px' }}
            >
              放弃
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button
              onClick={resume}
              className="btn btn-secondary"
              style={{ minWidth: '80px', height: '44px', padding: '0 16px', fontSize: '14px' }}
            >
              继续
            </button>
            <button
              onClick={stop}
              className="btn btn-outline"
              style={{ minWidth: '70px', height: '44px', padding: '0 16px', fontSize: '14px' }}
            >
              放弃
            </button>
          </>
        )}
      </div>

      {/* 当前任务显示 */}
      {currentTask && (
        <div className="current-task-display" style={{
          width: '100%',
          marginTop: '16px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
          borderRadius: '9px',
          border: '1px solid #FFECE0',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div className="task-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <span className={`priority-badge ${getPriorityBadgeClass(currentTask.priority)}`}>
              {getPriorityLabel(currentTask.priority)}
            </span>
            <span className="task-divider" style={{ fontSize: '10px', color: '#E0E0E0', flexShrink: 0, margin: '0 1px' }}>·</span>
            <span className="task-progress" style={{ fontSize: '11px', color: '#FF6B6B', fontWeight: '600', flexShrink: 0 }}>
              {currentTask.completedPomodoros}/{currentTask.targetPomodoros} 番茄钟
            </span>
          </div>
          <span className="task-name" style={{
            fontSize: '14px',
            fontWeight: '400',
            color: '#999',
            lineHeight: '1.45',
            wordBreak: 'break-word'
          }}>{currentTask.name}</span>
        </div>
      )}

      {/* 每日目标进度 */}
      {config && config.showDailyGoal && stats && stats.todayCount < (config.dailyGoal || 8) && (
        <div style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--card-gradient)',
          borderRadius: '9px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--muted-color)', flexShrink: 0 }}>今日目标</span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (stats.todayCount / (config.dailyGoal || 8)) * 100)}%`,
              }}
            />
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--primary-color)',
            flexShrink: 0,
          }}>
            {stats.todayCount}/{config.dailyGoal || 8}
          </span>
        </div>
      )}
    </div>
  );
}
