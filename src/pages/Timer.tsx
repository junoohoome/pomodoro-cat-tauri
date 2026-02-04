import { useEffect, useRef } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";
import { invoke } from "@tauri-apps/api/core";

const CAT_ICONS: Record<number, string> = {
  1: "🐱",
  2: "😺",
  3: "😸",
  4: "😻",
  5: "🐈",
};

const CAT_STAGES = [
  { level: 1, name: "猫Baby" },
  { level: 2, name: "幼猫" },
  { level: 3, name: "成年猫" },
  { level: 4, name: "学者猫" },
  { level: 5, name: "博士猫" },
];

export default function TimerPage() {
  const {
    state,
    remainingSeconds,
    type,
    start,
    pause,
    resume,
    stop,
    tick,
    setTestMode,
  } = useTimerStore();

  const { currentTask, fetchActiveTasks, incrementTaskProgress } = useTaskStore();
  const { config, fetchConfig, userData } = useUserStore();
  const { isTestMode } = useTestModeStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 测试模式下的时长：1分钟专注，1分钟休息
  const TEST_FOCUS_DURATION = 1;
  const TEST_BREAK_DURATION = 1;

  useEffect(() => {
    fetchConfig();
    fetchActiveTasks();
  }, [fetchConfig, fetchActiveTasks]);

  // 同步测试模式到 timerStore
  useEffect(() => {
    setTestMode(isTestMode);
  }, [isTestMode, setTestMode]);

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, tick]);

  useEffect(() => {
    if (state === "running" && remainingSeconds === 0) {
      handleComplete();
    }
  }, [remainingSeconds, state]);

  const handleComplete = async () => {
    if (type === "focus") {
      // 记录番茄钟时，使用配置的专注时长（忽略测试模式）
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

      // 专注完成后，停止计时器回到空闲状态（与小程序一致）
      // 用户需要手动开始下一次计时
      stop();
    } else {
      stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const catEmoji = userData ? CAT_ICONS[userData.level] || CAT_ICONS[1] : CAT_ICONS[1];
  const catStageName = userData ? CAT_STAGES.find(s => s.level === userData.level)?.name || CAT_STAGES[0].name : CAT_STAGES[0].name;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* 右下角测试模式标记 */}
      {isTestMode && (
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
        <span className="cat-stage" style={{ fontSize: '14px', color: '#999' }}>{catStageName}</span>
      </div>

      {/* 圆形计时器 */}
      <div className="timer-container" style={{
        position: 'relative',
        width: '210px',
        height: '210px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(255, 107, 107, 0.2)'
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

      {/* 控制按钮 */}
      <div className="control-buttons" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 10,
        alignItems: 'center'
      }}>
        {state === "idle" && (
          <button
            onClick={() => start(focusDuration, breakDuration)}
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

      {/* 当前任务占位符 */}
      {!currentTask && (
        <div className="current-task-placeholder" style={{
          width: '100%',
          marginTop: '16px',
          textAlign: 'center',
          padding: '8px'
        }}>
          <span className="placeholder-text" style={{ fontSize: '12px', color: '#999' }}>
            长按任务列表中的任务以选择
          </span>
        </div>
      )}
    </div>
  );
}
