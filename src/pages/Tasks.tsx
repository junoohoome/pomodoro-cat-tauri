import { useState, useEffect, useRef } from "react";
import { useTaskStore } from "../stores/taskStore";
import { useTimerStore } from "../stores/timerStore";

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
  const [targetPomodoros, setTargetPomodoros] = useState(3);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [deadline, setDeadline] = useState<string>(new Date().toISOString().split('T')[0]);

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editTargetPomodoros, setEditTargetPomodoros] = useState(1);
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
      targetPomodoros,
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
    setEditTargetPomodoros(task.targetPomodoros);
    setEditPriority(task.priority);
    setEditDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
  };

  const handleEditSave = async () => {
    if (!editName.trim() || !editingTaskId) return;
    await updateTask(editingTaskId, {
      name: editName,
      targetPomodoros: editTargetPomodoros,
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
  }, [editingTaskId, editName, editTargetPomodoros, editPriority, editDeadline]);

  const closeInlineEdit = () => {
    setEditingTaskId(null);
    setEditName("");
    setEditTargetPomodoros(1);
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
      setEditTargetPomodoros(task.targetPomodoros);
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
    setTargetPomodoros(3);
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
      marginLeft: '40px',
      margin: '0 0 0 40px',
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

  // ─── Pomodoro selector ───
  const PomodoroSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          tabIndex={0}
          onClick={() => onChange(n)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(n); }}
          style={{
            fontSize: '14px',
            color: value === n ? 'var(--accent-color)' : 'var(--text-tertiary)',
            fontWeight: value === n ? '600' : '400',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            background: value === n ? 'var(--accent-light)' : 'transparent',
            transition: 'all 0.15s ease',
          }}
        >
          🍅{n}
        </span>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ─── Top bar: Add button row ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '4px',
        marginTop: '-18px',
      }}>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '22px',
            fontWeight: '300',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
            padding: '0',
            lineHeight: '1',
            marginRight: '12px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          +
        </button>
      </div>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--accent-color)',
            margin: '0',
            letterSpacing: '-0.5px',
          }}>
            任务
          </h1>
          <span style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--accent-color)',
            letterSpacing: '-0.5px',
          }}>
            {activeTasks.length}
          </span>
        </div>
      </div>

      {/* ─── Completed summary bar ─── */}
      {completedTasks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 0 12px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {completedTasks.length}项已完成
          </span>
          <span
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              fontSize: '12px',
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
              padding: '10px 0',
              gap: '12px',
            }}>
              {/* Filled circle */}
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: `2px solid var(--accent-color)`,
                flexShrink: 0,
                marginTop: '2px',
                background: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                    lineHeight: '1.4',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <PomodoroSelector value={targetPomodoros} onChange={setTargetPomodoros} />
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--surface-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>暂无任务</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>点击右上角 + 添加新任务</span>
          </div>
        ) : (
          /* ─── Active tasks ─── */
          activeTasks.map((task, index) => {
            const isCurrent = currentTask?.id === task.id;
            const isEditing = editingTaskId === task.id;
            const pColor = priorityColor(task.priority);
            const hasDetails = task.targetPomodoros > 1 || (task.deadline && task.deadline !== 'null');

            return (
              <div key={task.id}>
                {isEditing ? (
                  /* ─── Inline edit mode ─── */
                  <div data-edit-area style={{
                    padding: '10px 0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* Checkbox */}
                      <div
                        onClick={() => handleSelectTask(task)}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isCurrent ? 'none' : `2px solid ${pColor}`,
                          background: isCurrent ? pColor : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: timerState !== 'idle' ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          marginTop: '2px',
                          transition: 'all 0.2s ease',
                          opacity: timerState !== 'idle' ? 0.5 : 1,
                        }}
                      >
                        {isCurrent && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
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
                            lineHeight: '1.4',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <PomodoroSelector value={editTargetPomodoros} onChange={setEditTargetPomodoros} />
                          <PrioritySelector value={editPriority} onChange={setEditPriority} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>📅</span>
                            <input
                              type="date"
                              value={editDeadline}
                              onChange={(e) => setEditDeadline(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              style={{
                                fontSize: '14px',
                                color: editDeadline ? 'var(--text-primary)' : 'var(--text-tertiary)',
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
                        {/* Delete button */}
                        <div
                          onClick={() => handleDeleteTask(task.id)}
                          style={{
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            color: 'var(--destructive-color)',
                            opacity: 0.7,
                            transition: 'opacity 0.15s ease',
                            fontSize: '12px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          删除任务
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
                      padding: '10px 0',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Circle checkbox */}
                    <div
                      onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isCurrent ? 'none' : `2px solid ${pColor}`,
                        background: isCurrent ? pColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: timerState !== 'idle' ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        marginTop: '2px',
                        transition: 'all 0.2s ease',
                        opacity: timerState !== 'idle' ? 0.5 : 1,
                      }}
                    >
                      {isCurrent && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Task content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.45',
                        fontWeight: '400',
                      }}>
                        {task.name}
                      </div>
                      {hasDetails && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          {task.targetPomodoros > 1 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              🍅 {task.completedPomodoros}/{task.targetPomodoros}
                            </span>
                          )}
                          {task.deadline && task.deadline !== 'null' && (
                            <span style={{ fontSize: '11px', color: deadlineColor(task.deadline) }}>
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
          <div style={{ marginTop: '8px' }}>
            {completedTasks.map((task, index) => (
              <div key={task.id}>
                <div
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '10px 0',
                    gap: '12px',
                    opacity: 0.5,
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--success-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
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
                      lineHeight: '1.45',
                    }}>
                      {task.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      {task.targetPomodoros > 1 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          🍅 {task.completedPomodoros}/{task.targetPomodoros}
                        </span>
                      )}
                      {task.deadline && task.deadline !== 'null' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
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
            minWidth: '120px',
          }}
        >
          {!contextMenu.task.completed && (
            <div
              onClick={() => { openInlineEdit(contextMenu.task); setContextMenu(null); }}
              style={{
                padding: '6px 12px',
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
              padding: '6px 12px',
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
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '300px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                {pendingAction?.type === 'edit' ? '编辑当前任务' : '删除当前任务'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', display: 'block' }}>
                {pendingAction?.type === 'edit'
                  ? '该任务正在专注中，编辑不会影响已完成的番茄钟。'
                  : '该任务正在专注中，删除将清除进度和关联数据。'}
              </span>
            </div>
            <div style={{ padding: '12px 20px 20px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmDialog(false)} style={{ flex: 1, height: '34px', fontSize: '13px' }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={confirmAction} style={{ flex: 1, height: '34px', fontSize: '13px' }}>
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
            padding: '10px 20px',
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
