import { useEffect } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";
import CodexCat from "../pet/components/CodexCat";

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
    switchToFocus,
    setTestMode,
  } = useTimerStore();

  const { currentTask, fetchActiveTasks } = useTaskStore();
  const { config, fetchConfig, stats, fetchStats } = useUserStore();
  const { isTestMode } = useTestModeStore();

  const TEST_FOCUS_DURATION = 1;
  const TEST_BREAK_DURATION = 1;

  useEffect(() => {
    fetchConfig();
    fetchActiveTasks();
    fetchStats();
  }, [fetchConfig, fetchActiveTasks, fetchStats]);

  useEffect(() => {
    setTestMode(isTestMode);
  }, [isTestMode, setTestMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const catMood = state === "running" ? "running" : state === "paused" ? "paused" : state === "break" ? "break" : "idle";

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

  const focusDuration = isTestMode ? TEST_FOCUS_DURATION : (config?.focusDuration || 25);
  const breakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.breakDuration || 5);
  const longBreakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.longBreakDuration || 15);
  const autoStart = config?.autoStart || false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Test mode badge (dev only) */}
      {import.meta.env.DEV && isTestMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--surface-bg)',
          color: 'var(--text-secondary)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          fontWeight: '500',
          zIndex: 100,
          border: '1px solid var(--border-color)',
        }}>
          测试模式
        </div>
      )}

      {/* Cat display */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <CodexCat mood={catMood} />
      </div>

      {/* Circular timer */}
      <div style={{
        position: 'relative',
        width: '200px',
        height: '200px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* SVG progress ring */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200px',
            height: '200px',
            transform: 'rotate(-90deg)',
            zIndex: 2,
          }}
          viewBox="0 0 200 200"
        >
          {/* Background ring */}
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Progress ring */}
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke="var(--accent-color)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 94}
            strokeDashoffset={2 * Math.PI * 94 * (1 - remainingSeconds / totalSeconds)}
            style={{
              transition: state === 'running' ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>

        {/* Timer body */}
        <div style={{
          width: '188px',
          height: '188px',
          background: 'var(--card-bg)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '44px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1',
              display: 'block',
              marginBottom: '6px',
              letterSpacing: '0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>{formatTime(remainingSeconds)}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>
              {type === "focus" ? "专注" : "休息"}
            </span>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
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
              height: '36px',
              padding: '0 20px',
              fontSize: '13px'
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
                height: '36px',
                padding: '0 20px',
                fontSize: '13px'
              }}
            >
              开始
            </button>
            <button
              onClick={switchToFocus}
              className="btn btn-outline"
              style={{
                minWidth: '70px',
                height: '36px',
                padding: '0 16px',
                fontSize: '13px'
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
              style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}
            >
              暂停
            </button>
            <button
              onClick={stop}
              className="btn btn-outline"
              style={{ minWidth: '70px', height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              放弃
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button
              onClick={resume}
              className="btn btn-primary"
              style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}
            >
              继续
            </button>
            <button
              onClick={stop}
              className="btn btn-outline"
              style={{ minWidth: '70px', height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              放弃
            </button>
          </>
        )}
      </div>

      {/* Current task */}
      {currentTask && (
        <div style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span className={`priority-badge ${getPriorityBadgeClass(currentTask.priority)}`}>
              {getPriorityLabel(currentTask.priority)}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--border-color)', flexShrink: 0 }}>·</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', flexShrink: 0 }}>
              {currentTask.completedPomodoros}/{currentTask.targetPomodoros} 番茄钟
            </span>
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: '400',
            color: 'var(--text-secondary)',
            lineHeight: '1.45',
            wordBreak: 'break-word'
          }}>{currentTask.name}</span>
        </div>
      )}

      {/* Daily goal progress */}
      {config && config.showDailyGoal && stats && stats.todayCount < (config.dailyGoal || 4) && (
        <div style={{
          width: '100%',
          marginTop: '12px',
          padding: '10px 16px',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>今日目标</span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (stats.todayCount / (config.dailyGoal || 4)) * 100)}%`,
              }}
            />
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {stats.todayCount}/{config.dailyGoal || 4}
          </span>
        </div>
      )}
    </div>
  );
}
