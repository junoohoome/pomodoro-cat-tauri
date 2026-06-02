import { useState, useEffect, useRef } from "react";
import { useTaskStore } from "../stores/taskStore";
import { useTimerStore } from "../stores/timerStore";

const TomatoIcon = ({ color = "var(--accent-color)", size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c-1.5 0-2.5.8-3 2 .5-.3 1.2-.5 2-.5h2c.8 0 1.5.2 2 .5-.5-1.2-1.5-2-3-2z" fill="currentColor" />
    <circle cx="12" cy="13" r="9" />
    <path d="M9 5c-1.5-2-3-2.5-3.5-2s.5 3.5 2 5" />
    <path d="M15 5c1.5-2 3-2.5 3.5-2s-.5 3.5-2 5" />
  </svg>
);

const ROUND_MINUTES = 30; // focusDuration(25) + breakDuration(5)
const PRESETS = [
  { label: '30min', hours: 0.5 },
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: '4h', hours: 4 },
] as const;

const hoursToPomodoros = (hours: number): number => Math.ceil(hours * 60 / ROUND_MINUTES);
const pomodorosToHours = (pomodoros: number): number => pomodoros * ROUND_MINUTES / 60;

const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

export default function TasksPage() {
  const {
    activeTasks,
    completedTasks,
    fetchActiveTasks,
    fetchCompletedTasks,
    createTask,
    updateTask,
    deleteTask,
    currentTask,
    setCurrentTask,
  } = useTaskStore();

  const { state: timerState } = useTimerStore();

  const [showCompleted, setShowCompleted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'edit' | 'delete'; task: any } | null>(null);

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(1.5);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [deadline, setDeadline] = useState<string>(new Date().toISOString().split('T')[0]);

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState(0.5);
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">("medium");
  const [editDeadline, setEditDeadline] = useState<string>("");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: any } | null>(null);

  useEffect(() => {
    fetchActiveTasks();
    fetchCompletedTasks();
  }, [fetchActiveTasks, fetchCompletedTasks]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTaskId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleInlineCreate = async () => {
    if (!taskName.trim()) {
      setIsAdding(false);
      resetAddForm();
      return;
    }
    await createTask({
      name: taskName,
      targetPomodoros: hoursToPomodoros(estimatedHours),
      priority,
      deadline: deadline || null,
    });
    resetAddForm();
    setIsAdding(false);
    fetchActiveTasks();
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInlineCreate();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      resetAddForm();
    }
  };

  const handleSelectTask = (task: any) => {
    if (timerState !== 'idle') {
      setToastMessage('请先完成当前番茄钟或停止计时');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    if (currentTask?.id === task.id) {
      setCurrentTask(null);
    } else {
      setCurrentTask(task);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const openInlineEdit = (task: any) => {
    if (currentTask?.id === task.id) {
      setPendingAction({ type: 'edit', task });
      setShowConfirmDialog(true);
      return;
    }
    setEditingTaskId(task.id);
    setEditName(task.name);
    setEditEstimatedHours(pomodorosToHours(task.targetPomodoros));
    setEditPriority(task.priority);
    setEditDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
  };

  const handleEditSave = async () => {
    if (!editName.trim() || !editingTaskId) return;
    await updateTask(editingTaskId, {
      name: editName,
      targetPomodoros: hoursToPomodoros(editEstimatedHours),
      priority: editPriority,
      deadline: editDeadline || undefined,
    });
    closeInlineEdit();
    fetchActiveTasks();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSave();
    } else if (e.key === "Escape") {
      closeInlineEdit();
    }
  };

  // Click outside edit area to save
  useEffect(() => {
    if (!editingTaskId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const editArea = document.querySelector('[data-edit-area]');
      if (editArea && !editArea.contains(e.target as Node)) {
        handleEditSave();
      }
    };
    // Delay to avoid the click that opened the edit from immediately closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingTaskId, editName, editEstimatedHours, editPriority, editDeadline]);

  const closeInlineEdit = () => {
    setEditingTaskId(null);
    setEditName("");
    setEditEstimatedHours(0.5);
    setEditPriority("medium");
    setEditDeadline("");
  };

  const handleDeleteTask = async (id: number) => {
    const taskToDelete = [...activeTasks, ...completedTasks].find(t => t.id === id);
    if (currentTask?.id === id) {
      setPendingAction({ type: 'delete', task: taskToDelete });
      setShowConfirmDialog(true);
      return;
    }
    await deleteTask(id);
    closeInlineEdit();
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'edit') {
      const { task } = pendingAction;
      setEditingTaskId(task.id);
      setEditName(task.name);
      setEditEstimatedHours(pomodorosToHours(task.targetPomodoros));
      setEditPriority(task.priority);
      setEditDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
    } else {
      await deleteTask(pendingAction.task.id);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const resetAddForm = () => {
    setTaskName("");
    setEstimatedHours(1.5);
    setPriority("medium");
    setDeadline(new Date().toISOString().split('T')[0]);
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return '#FF3B30';
    if (p === 'medium') return '#FF9500';
    return '#34C759';
  };

  const formatDeadline = (d: string) => {
    if (!d || d === 'null') return null;
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '已过期';
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays <= 7) return `${diffDays}天后`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const deadlineColor = (d: string) => {
    if (!d || d === 'null') return 'var(--text-tertiary)';
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'var(--destructive-color)';
    if (diffDays <= 1) return 'var(--warning-color)';
    return 'var(--text-tertiary)';
  };

  // ─── Separator component ───
  const Separator = () => (
    <div style={{
      height: '1px',
      background: 'var(--border-color)',
      margin: '0 0 0 30px',
    }} />
  );

  // ─── Priority selector ───
  const PrioritySelector = ({ value, onChange }: { value: string; onChange: (v: any) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {([
        { value: 'high', label: '高', color: '#FF3B30' },
        { value: 'medium', label: '中', color: '#FF9500' },
        { value: 'low', label: '低', color: '#34C759' },
      ] as const).map((p) => (
        <div
          key={p.value}
          tabIndex={0}
          onClick={() => onChange(p.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(p.value); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            opacity: value === p.value ? 1 : 0.4,
            transition: 'opacity 0.15s ease',
          }}
        >
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: p.color,
          }} />
          <span style={{
            fontSize: '14px',
            color: value === p.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: value === p.value ? '500' : '400',
          }}>
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );

  // ─── Duration selector ───
  const DurationSelector = ({ hours, onChange }: { hours: number; onChange: (h: number) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {PRESETS.map((preset) => (
        <span
          key={preset.label}
          tabIndex={0}
          onClick={() => onChange(preset.hours)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(preset.hours); }}
          style={{
            fontSize: '13px',
            color: hours === preset.hours ? 'var(--accent-color)' : 'var(--text-tertiary)',
            fontWeight: hours === preset.hours ? '600' : '400',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: '4px',
            background: hours === preset.hours ? 'var(--accent-light)' : 'transparent',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {preset.label}
        </span>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
        <input
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={PRESETS.some(p => p.hours === hours) ? '' : hours}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0.5 && val <= 24) onChange(val);
          }}
          placeholder="h"
          style={{
            width: '42px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            background: 'var(--surface-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            outline: 'none',
            fontFamily: 'inherit',
            padding: '2px 6px',
            textAlign: 'center',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>h</span>
      </div>
    </div>
  );

  // ─── Circle checkbox (shared) ───
  const CircleCheckbox = ({
    color,
    filled,
    disabled,
    onClick,
  }: {
    color: string;
    filled: boolean;
    disabled?: boolean;
    onClick: (e: React.MouseEvent) => void;
  }) => (
    <div
      onClick={onClick}
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: filled ? 'none' : `2px solid ${color}`,
        background: filled ? color : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        marginTop: '1px',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {filled && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* ─── Header: Title + Add button ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--accent-color)',
            margin: '0',
            letterSpacing: '-0.5px',
          }}>
            任务
          </h1>
          {activeTasks.length > 0 && (
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-tertiary)',
            }}>
              {activeTasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-light-border)',
            color: 'var(--accent-color)',
            fontSize: '18px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            padding: '4px 12px',
            lineHeight: '1',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-color)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--accent-color)';
          }}
        >
          +
        </button>
      </div>

      {/* ─── Completed summary bar ─── */}
      {completedTasks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 8px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {completedTasks.length}项已完成
          </span>
          <span
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              fontSize: '13px',
              color: 'var(--accent-color)',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {showCompleted ? '隐藏' : '显示'}
          </span>
        </div>
      )}

      {/* ─── Task list ─── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ─── Inline add row ─── */}
        {isAdding && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '5px 0',
              gap: '10px',
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: `2px solid var(--accent-color)`,
                flexShrink: 0,
                marginTop: '1px',
                background: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="任务名称"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  onBlur={handleInlineCreate}
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    padding: '0',
                    WebkitUserSelect: 'text' as any,
                    userSelect: 'text' as any,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <DurationSelector hours={estimatedHours} onChange={setEstimatedHours} />
                  <PrioritySelector value={priority} onChange={setPriority} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>📅</span>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        fontSize: '14px',
                        color: deadline ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        padding: '0',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ─── Empty state ─── */}
        {activeTasks.length === 0 && !isAdding ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0 40px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--surface-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>暂无任务</span>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>点击右上角 + 添加新任务</span>
          </div>
        ) : (
          /* ─── Active tasks ─── */
          activeTasks.map((task) => {
            const isCurrent = currentTask?.id === task.id;
            const isEditing = editingTaskId === task.id;
            const pColor = priorityColor(task.priority);
            const hasDetails = task.targetPomodoros > 1 || (task.deadline && task.deadline !== 'null');

            return (
              <div key={task.id}>
                {isEditing ? (
                  /* ─── Inline edit mode ─── */
                  <div
                    data-edit-area
                    style={{
                      margin: '2px 0',
                      padding: '12px',
                      background: 'var(--surface-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <CircleCheckbox
                        color={pColor}
                        filled={isCurrent}
                        disabled={timerState !== 'idle'}
                        onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          style={{
                            width: '100%',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: 'var(--text-primary)',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            outline: 'none',
                            fontFamily: 'inherit',
                            padding: '6px 10px',
                            WebkitUserSelect: 'text' as any,
                            userSelect: 'text' as any,
                            transition: 'border-color 0.15s ease',
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', letterSpacing: '0.3px' }}>预估时长</span>
                            <DurationSelector hours={editEstimatedHours} onChange={setEditEstimatedHours} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', letterSpacing: '0.3px' }}>优先级</span>
                            <PrioritySelector value={editPriority} onChange={setEditPriority} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', letterSpacing: '0.3px' }}>截止日期</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>📅</span>
                              <input
                                type="date"
                                value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                style={{
                                  fontSize: '13px',
                                  color: editDeadline ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Action bar */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '14px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-subtle)',
                        }}>
                          <div
                            onClick={() => handleDeleteTask(task.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              color: 'var(--destructive-color)',
                              opacity: 0.6,
                              transition: 'opacity 0.15s ease',
                              fontSize: '13px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            删除
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); closeInlineEdit(); }}
                              style={{
                                padding: '4px 14px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
                            >
                              取消
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditSave(); }}
                              style={{
                                padding: '4px 14px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'var(--accent-color)',
                                color: 'white',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontWeight: '500',
                                transition: 'opacity 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── Normal task row ─── */
                  <div
                    onContextMenu={(e) => handleContextMenu(e, task)}
                    onClick={() => openInlineEdit(task)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '5px 0',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <CircleCheckbox
                      color={pColor}
                      filled={isCurrent}
                      disabled={timerState !== 'idle'}
                      onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}
                    />
                    {/* Task content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        fontWeight: '400',
                      }}>
                        {task.name}
                      </div>
                      {hasDetails && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                          {task.targetPomodoros > 1 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <TomatoIcon size={12} /> {formatMinutes(task.completedPomodoros * ROUND_MINUTES)} / {formatMinutes(task.targetPomodoros * ROUND_MINUTES)}
                            </span>
                          )}
                          {task.deadline && task.deadline !== 'null' && (
                            <span style={{ fontSize: '12px', color: deadlineColor(task.deadline) }}>
                              📅 {formatDeadline(task.deadline)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Separator />
              </div>
            );
          })
        )}

        {/* ─── Completed tasks (shown at bottom when toggled) ─── */}
        {showCompleted && completedTasks.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              已完成
            </div>
            {completedTasks.map((task) => (
              <div key={task.id}>
                <div
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '4px 0',
                    gap: '10px',
                    opacity: 0.5,
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--success-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--text-tertiary)',
                      textDecoration: 'line-through',
                      lineHeight: '1.5',
                    }}>
                      {task.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      {task.targetPomodoros > 1 && (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <TomatoIcon size={12} /> {formatMinutes(task.completedPomodoros * ROUND_MINUTES)}
                        </span>
                      )}
                      {task.deadline && task.deadline !== 'null' && (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          ✓ {new Date(task.deadline).getMonth() + 1}月{new Date(task.deadline).getDate()}日
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Context menu ─── */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px',
            zIndex: 2000,
            minWidth: '140px',
          }}
        >
          {!contextMenu.task.completed && (
            <div
              onClick={() => { openInlineEdit(contextMenu.task); setContextMenu(null); }}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              编辑
            </div>
          )}
          <div
            onClick={() => { handleDeleteTask(contextMenu.task.id); setContextMenu(null); }}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--destructive-color)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            删除
          </div>
        </div>
      )}

      {/* ─── Confirm dialog ─── */}
      {showConfirmDialog && (
        <div
          onClick={() => setShowConfirmDialog(false)}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                {pendingAction?.type === 'edit' ? '编辑当前任务' : '删除当前任务'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'block' }}>
                {pendingAction?.type === 'edit'
                  ? '该任务正在专注中，编辑不会影响已完成的番茄钟。'
                  : '该任务正在专注中，删除将清除进度和关联数据。'}
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmDialog(false)} style={{ flex: 1, height: '36px', fontSize: '13px' }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={confirmAction} style={{ flex: 1, height: '36px', fontSize: '13px' }}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {showToast && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text-primary)',
            color: 'var(--surface-bg)',
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: '500',
            zIndex: 2000,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
