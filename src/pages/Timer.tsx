import { useEffect, useState } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";
import CodexCat from "../pet/components/CodexCat";

// Breakpoint: main content area < 620px (window < 800px with 180px sidebar)
const COMPACT_BREAKPOINT = 800;

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

  const { activeTasks, currentTask, fetchActiveTasks, setCurrentTask } = useTaskStore();
  const { config, fetchConfig, stats, fetchStats } = useUserStore();
  const { isTestMode } = useTestModeStore();

  const [isCompact, setIsCompact] = useState(() => window.innerWidth < COMPACT_BREAKPOINT);

  const TEST_FOCUS_DURATION = 1;
  const TEST_BREAK_DURATION = 1;

  const ROUND_MINUTES = 30; // focusDuration(25) + breakDuration(5)

  const formatMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  useEffect(() => {
    fetchConfig();
    fetchActiveTasks();
    fetchStats();
  }, [fetchConfig, fetchActiveTasks, fetchStats]);

  useEffect(() => {
    setTestMode(isTestMode);
  }, [isTestMode, setTestMode]);

  // Responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const focusDuration = isTestMode ? TEST_FOCUS_DURATION : (config?.focusDuration || 25);
  const breakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.breakDuration || 5);
  const longBreakDuration = isTestMode ? TEST_BREAK_DURATION : (config?.longBreakDuration || 15);
  const autoStart = config?.autoStart || false;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (state === "idle") {
          start(focusDuration, breakDuration, longBreakDuration, autoStart);
        } else if (state === "running") {
          pause();
        } else if (state === "paused") {
          resume();
        }
      } else if (e.code === "Escape") {
        e.preventDefault();
        if (state === "running" || state === "paused") {
          stop();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const catMood = state === "running" && type === "break" ? "break" : state === "running" ? "running" : state === "paused" ? "paused" : "idle";

  const getPriorityBadgeClass = (priority: string) => {
    const classes = { high: "priority-high", medium: "priority-medium", low: "priority-low" };
    return classes[priority as keyof typeof classes] || classes.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = { high: "高", medium: "中", low: "低" };
    return labels[priority as keyof typeof labels] || labels.medium;
  };

  const getPriorityDotColor = (priority: string) => {
    const colors = { high: "#FF3B30", medium: "#FF9500", low: "#34C759" };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const circumference = 2 * Math.PI * 136;
  const progressOffset = circumference * (1 - progress);
  const otherTasks = activeTasks.filter(t => !t.completed && t.id !== currentTask?.id);

  // Timer size: 280px for bento, 200px for compact
  const timerSize = isCompact ? 200 : 280;
  const timerBodySize = isCompact ? 188 : 266;
  const catSize = isCompact ? 60 : 80;
  const timerFontSize = isCompact ? '44px' : '42px';

  // ─── Shared sub-components ───

  const renderProgressRing = () => (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${timerSize}px`,
        height: `${timerSize}px`,
        transform: 'rotate(-90deg)',
        zIndex: 2,
      }}
      viewBox={`0 0 ${timerSize} ${timerSize}`}
    >
      <circle
        cx={timerSize / 2}
        cy={timerSize / 2}
        r={timerSize / 2 - 4}
        fill="none"
        stroke={type === "break" ? "var(--success-color)" : "var(--accent-color)"}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={progressOffset}
        opacity="0.12"
        filter="blur(4px)"
      />
      <circle
        cx={timerSize / 2}
        cy={timerSize / 2}
        r={timerSize / 2 - 4}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx={timerSize / 2}
        cy={timerSize / 2}
        r={timerSize / 2 - 4}
        fill="none"
        stroke={type === "break" ? "var(--success-color)" : "var(--accent-color)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={progressOffset}
        style={{
          transition: state === 'running' ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease',
        }}
      />
    </svg>
  );

  const showCatInTimer = !config?.showDesktopPet;

  const renderTimerBody = () => (
    <div style={{
      width: `${timerBodySize}px`,
      height: `${timerBodySize}px`,
      background: 'var(--card-bg)',
      borderRadius: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-color)',
      position: 'relative',
      zIndex: 1,
      gap: '4px',
    }}>
      {showCatInTimer && (
        <div style={{ width: `${catSize}px`, height: `${catSize}px` }}>
          <CodexCat mood={catMood} size={catSize} />
        </div>
      )}
      <span style={{
        fontSize: showCatInTimer ? timerFontSize : (isCompact ? '52px' : '56px'),
        fontWeight: '600',
        color: 'var(--text-primary)',
        lineHeight: '1',
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{formatTime(remainingSeconds)}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>
        {state === "running" && type === "focus" ? "专注中..." :
         state === "running" && type === "break" ? "休息中..." :
         state === "paused" ? "已暂停" :
         type === "focus" ? "专注" : "休息"}
      </span>
    </div>
  );

  const renderControls = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginTop: isCompact ? '16px' : '20px',
      position: 'relative',
      zIndex: 10,
      alignItems: 'center'
    }}>
      {state === "idle" && type === "focus" && (
        <button
          onClick={() => start(focusDuration, breakDuration, longBreakDuration, autoStart)}
          className="btn btn-primary"
          style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}
        >
          开始
        </button>
      )}
      {state === "idle" && type === "break" && (
        <>
          <button
            onClick={() => start(focusDuration, breakDuration, longBreakDuration, autoStart)}
            className="btn btn-primary"
            style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}
          >
            开始
          </button>
          <button
            onClick={switchToFocus}
            className="btn btn-outline"
            style={{ minWidth: '70px', height: '36px', padding: '0 16px', fontSize: '13px' }}
          >
            跳过
          </button>
        </>
      )}
      {state === "running" && (
        <>
          <button onClick={pause} className="btn btn-secondary"
            style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}>
            暂停
          </button>
          <button onClick={stop} className="btn btn-outline"
            style={{ minWidth: '70px', height: '36px', padding: '0 16px', fontSize: '13px' }}>
            放弃
          </button>
        </>
      )}
      {state === "paused" && (
        <>
          <button onClick={resume} className="btn btn-primary"
            style={{ minWidth: '80px', height: '36px', padding: '0 20px', fontSize: '13px' }}>
            继续
          </button>
          <button onClick={stop} className="btn btn-outline"
            style={{ minWidth: '70px', height: '36px', padding: '0 16px', fontSize: '13px' }}>
            放弃
          </button>
        </>
      )}
    </div>
  );

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid var(--border-color)',
  };

  const renderTodayStats = () => stats && (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>今日概览</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '22px', fontWeight: '600', color: 'var(--accent-color)',
            fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
          }}>{stats.todayCount}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>已完成番茄</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
          }}>
            {stats.todayMinutes}
            <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-tertiary)' }}>min</span>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>专注时长</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '22px', fontWeight: '600', color: 'var(--success-color)',
            fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
          }}>{stats.weekStreakDays}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>连续天数</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums', lineHeight: '1.2',
          }}>{stats.totalCount}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>累计番茄</span>
        </div>
      </div>
    </div>
  );

  const renderCurrentTask = () => currentTask && (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>当前任务</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span className={`priority-badge ${getPriorityBadgeClass(currentTask.priority)}`}>
          {getPriorityLabel(currentTask.priority)}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500' }}>
          {formatMinutes(currentTask.completedPomodoros * ROUND_MINUTES)} / {formatMinutes(currentTask.targetPomodoros * ROUND_MINUTES)}
        </span>
      </div>
      <span style={{
        fontSize: '13px', fontWeight: '400', color: 'var(--text-secondary)',
        lineHeight: '1.45', wordBreak: 'break-word',
      }}>{currentTask.name}</span>
      <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
        {Array.from({ length: currentTask.targetPomodoros }, (_, i) => (
          <div key={i} style={{
            width: '18px', height: '18px', borderRadius: '50%',
            border: i < currentTask.completedPomodoros
              ? 'none'
              : i === currentTask.completedPomodoros
                ? '1.5px solid var(--accent-color)'
                : '1.5px solid var(--border-color)',
            background: i < currentTask.completedPomodoros ? 'var(--accent-color)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {i < currentTask.completedPomodoros && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyGoal = () => config && config.showDailyGoal && stats && (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>今日目标</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>进度</span>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="progress-fill" style={{
            width: `${Math.min(100, (stats.todayCount / (config.dailyGoal || 4)) * 100)}%`,
          }} />
        </div>
        <span style={{
          fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)',
          flexShrink: 0, fontVariantNumeric: 'tabular-nums',
        }}>
          {stats.todayCount}/{config.dailyGoal || 4}
        </span>
      </div>
    </div>
  );

  const renderOtherTasks = () => otherTasks.length > 0 && (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>其他任务</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {otherTasks.slice(0, 5).map(task => (
          <div
            key={task.id}
            onClick={() => {
              if (state !== 'running' && state !== 'paused') {
                setCurrentTask(task);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 8px', borderRadius: 'var(--radius-sm)',
              cursor: state === 'idle' ? 'pointer' : 'default',
              transition: 'background 0.15s ease',
              opacity: state === 'running' || state === 'paused' ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (state === 'idle') {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--active-bg)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: getPriorityDotColor(task.priority),
            }} />
            <span style={{
              fontSize: '13px', color: 'var(--text-primary)', flex: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{task.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {formatMinutes(task.completedPomodoros * ROUND_MINUTES)} / {formatMinutes(task.targetPomodoros * ROUND_MINUTES)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Compact layout (single column, original style) ───
  if (isCompact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {import.meta.env.DEV && isTestMode && (
          <div style={{
            position: 'fixed', bottom: '20px', right: '20px',
            background: 'var(--surface-bg)', color: 'var(--text-secondary)',
            padding: '6px 12px', borderRadius: 'var(--radius-sm)',
            fontSize: '12px', fontWeight: '500', zIndex: 100,
            border: '1px solid var(--border-color)',
          }}>
            测试模式
          </div>
        )}

        {/* Timer */}
        <div style={{
          position: 'relative', width: `${timerSize}px`, height: `${timerSize}px`,
          marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {renderProgressRing()}
          {renderTimerBody()}
        </div>

        {renderControls()}



        {/* Compact: cards stacked below timer */}
        <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {renderCurrentTask()}
          {renderDailyGoal()}
        </div>
      </div>
    );
  }

  // ─── Bento layout (two-column) ───
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      height: '100%',
      maxHeight: 'calc(100vh - 76px)',
      maxWidth: '880px',
      margin: '0 auto',
      gap: '24px',
    }}>
      {import.meta.env.DEV && isTestMode && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          background: 'var(--surface-bg)', color: 'var(--text-secondary)',
          padding: '6px 12px', borderRadius: 'var(--radius-sm)',
          fontSize: '12px', fontWeight: '500', zIndex: 100,
          border: '1px solid var(--border-color)',
        }}>
          测试模式
        </div>
      )}

      {/* LEFT: Timer area */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minWidth: 0,
      }}>
        <div style={{
          position: 'relative', width: `${timerSize}px`, height: `${timerSize}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {renderProgressRing()}
          {renderTimerBody()}
        </div>

        {renderControls()}


      </div>

      {/* RIGHT: Info cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        overflowY: 'auto', maxHeight: 'calc(100vh - 76px)', paddingRight: '2px',
        justifyContent: 'center',
      }}>
        {renderTodayStats()}
        {renderCurrentTask()}
        {renderDailyGoal()}
        {renderOtherTasks()}
      </div>
    </div>
  );
}
