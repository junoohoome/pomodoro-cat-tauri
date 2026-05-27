import { useState, useEffect } from "react";
import { useTaskStore } from "../stores/taskStore";

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

  const [showCompleted, setShowCompleted] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'edit' | 'delete', task: any } | null>(null);
  const [taskName, setTaskName] = useState("");
  const [targetPomodoros, setTargetPomodoros] = useState(1);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [deadline, setDeadline] = useState<string>("");

  useEffect(() => {
    fetchActiveTasks();
  }, [fetchActiveTasks]);

  const handleCreateTask = async () => {
    if (!taskName.trim()) return;
    await createTask({
      name: taskName,
      targetPomodoros,
      priority,
      deadline: deadline || null,
    });
    resetTaskForm();
    setShowTaskModal(false);
  };

  const handleUpdateTask = async () => {
    if (!taskName.trim() || !editingTask) return;
    await updateTask(editingTask.id, {
      name: taskName,
      targetPomodoros,
      priority,
      deadline: deadline || undefined,
    });
    resetTaskForm();
    setShowTaskModal(false);
  };

  const openEditModal = (task: any) => {
    // 检查是否是当前任务
    if (currentTask?.id === task.id) {
      setPendingAction({ type: 'edit', task });
      setShowConfirmDialog(true);
    } else {
      setEditingTask(task);
      setTaskName(task.name);
      setTargetPomodoros(task.targetPomodoros);
      setPriority(task.priority);
      setDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
      setShowTaskModal(true);
    }
  };

  const confirmEdit = () => {
    if (!pendingAction) return;
    const { task } = pendingAction;
    setEditingTask(task);
    setTaskName(task.name);
    setTargetPomodoros(task.targetPomodoros);
    setPriority(task.priority);
    setDeadline(task.deadline && task.deadline !== 'null' ? task.deadline.split('T')[0] : '');
    setShowTaskModal(true);
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const handleDeleteTask = async (id: number) => {
    const taskToDelete = [...activeTasks, ...completedTasks].find(t => t.id === id);

    // 检查是否是当前任务
    if (currentTask?.id === id) {
      setPendingAction({ type: 'delete', task: taskToDelete });
      setShowConfirmDialog(true);
    } else {
      await deleteTask(id);
    }
  };

  const confirmDelete = async () => {
    if (!pendingAction) return;
    await deleteTask(pendingAction.task.id);
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    resetTaskForm();
    setShowTaskModal(true);
  };

  const resetTaskForm = () => {
    setTaskName("");
    setTargetPomodoros(1);
    setPriority("medium");
    setDeadline("");
    setEditingTask(null);
  };

  const closeTaskModal = () => {
    resetTaskForm();
    setShowTaskModal(false);
  };

  const handleSelectTask = (task: any) => {
    setCurrentTask(task);
  };

  const tasks = showCompleted ? completedTasks : activeTasks;

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

  return (
    <div>
      {/* Tab切换 */}
      <div className="tab-container" style={{ display: 'flex', padding: '8px 0', background: 'transparent' }}>
        <div
          className={`tab-item ${!showCompleted ? 'active' : ''}`}
          onClick={() => { setShowCompleted(false); fetchActiveTasks(); }}
          style={{
            position: 'relative',
            padding: '10px 12px',
            marginRight: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="tab-text" style={{ fontSize: '14px', fontWeight: !showCompleted ? '600' : '500', color: !showCompleted ? '#2C2C2C' : '#999' }}>
            进行中
          </span>
          {activeTasks.length > 0 && (
            <span className="tab-count" style={{ fontSize: '11px', color: !showCompleted ? '#FF6B6B' : '#999', background: !showCompleted ? '#FFE5E5' : '#f0f0f0', padding: '2px 6px', borderRadius: '6px' }}>
              {activeTasks.length}
            </span>
          )}
        </div>
        <div
          className={`tab-item ${showCompleted ? 'active' : ''}`}
          onClick={() => { setShowCompleted(true); fetchCompletedTasks(); }}
          style={{
            position: 'relative',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="tab-text" style={{ fontSize: '14px', fontWeight: showCompleted ? '600' : '500', color: showCompleted ? '#2C2C2C' : '#999' }}>
            已完成
          </span>
          {completedTasks.length > 0 && (
            <span className="tab-count" style={{ fontSize: '11px', color: showCompleted ? '#FF6B6B' : '#999', background: showCompleted ? '#FFE5E5' : '#f0f0f0', padding: '2px 6px', borderRadius: '6px' }}>
              {completedTasks.length}
            </span>
          )}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="task-list" style={{ padding: '8px 16px 10px 16px' }}>
        {tasks.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0 20px 0' }}>
            <span className="empty-emoji" style={{ fontSize: '80px', marginBottom: '16px' }}>
              {showCompleted ? "✨" : "📝"}
            </span>
            <span className="empty-text" style={{ fontSize: '16px', color: '#2C2C2C', marginBottom: '8px' }}>
              {showCompleted ? "还没有已完成的任务" : "还没有任务"}
            </span>
            {!showCompleted && (
              <span className="empty-hint" style={{ fontSize: '12px', color: '#999' }}>
                点击右下角按钮创建新任务
              </span>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                marginBottom: '8px',
                overflow: 'visible',
                position: 'relative',
                transition: 'all 0.3s ease',
                border: currentTask?.id === task.id && !showCompleted ? '2px solid #FF6B6B' : 'none',
                boxShadow: currentTask?.id === task.id && !showCompleted ? '0 2px 8px rgba(255, 107, 107, 0.25)' : '0 1px 4px rgba(0, 0, 0, 0.04)'
              }}
              onClick={() => !showCompleted && handleSelectTask(task)}
              onMouseEnter={(e) => {
                const actions = e.currentTarget.querySelector('.task-actions');
                if (actions) (actions as HTMLElement).style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const actions = e.currentTarget.querySelector('.task-actions');
                if (actions) (actions as HTMLElement).style.opacity = '0';
              }}
            >
              <div className="task-main" style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#FFFFFF',
                padding: '10px',
                gap: '3px',
                width: '100%'
              }}>
                <div className="task-header" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className={`task-name ${task.completedPomodoros >= task.targetPomodoros ? 'completed' : ''}`} style={{
                    fontSize: '14px',
                    fontWeight: '400',
                    color: task.completedPomodoros >= task.targetPomodoros ? '#999' : '#2C2C2C',
                    lineHeight: '1.5',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {task.name}
                  </span>
                  {task.completed && <span className="completed-badge" style={{ fontSize: '16px', color: '#51CF66', fontWeight: '700', flexShrink: 0 }}>✓</span>}
                </div>
                <div className="task-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {currentTask?.id === task.id && !showCompleted && (
                    <span className="current-badge" style={{
                      fontSize: '10px',
                      color: '#FF6B6B',
                      background: 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>当前</span>
                  )}
                  <span className={`priority-badge ${getPriorityBadgeClass(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  <span className="task-divider" style={{ fontSize: '10px', color: '#E0E0E0', flexShrink: 0 }}>·</span>
                  <span className="task-progress" style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>
                    {task.completedPomodoros}/{task.targetPomodoros} 番茄钟
                  </span>
                </div>
              </div>
              <div
                className="task-actions"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.3s',
                  pointerEvents: 'auto'
                }}
              >
                {!showCompleted && (
                  <button
                    className="edit-btn"
                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      padding: '4px 8px',
                      background: 'transparent',
                      border: '1px solid #E0E0E0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F5F5F5';
                      e.currentTarget.style.borderColor = '#FF6B6B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#E0E0E0';
                    }}
                  >
                    编辑
                  </button>
                )}
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                  style={{
                    fontSize: '11px',
                    color: '#FF6B6B',
                    padding: '4px 8px',
                    background: 'transparent',
                    border: '1px solid #E0E0E0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFF0F0';
                    e.currentTarget.style.borderColor = '#FF6B6B';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#E0E0E0';
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加任务按钮 */}
      {!showCompleted && (
        <div
          className="fab"
          onClick={openCreateModal}
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '100px',
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
            zIndex: 100,
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        >
          <span className="fab-icon" style={{ fontSize: '30px', color: 'white', lineHeight: '60px', textAlign: 'center', display: 'block' }}>+</span>
        </div>
      )}

      {/* 添加/编辑任务弹窗 */}
      {showTaskModal && (
        <div
          className="modal-mask"
          onClick={closeTaskModal}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              background: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              margin: '20px 0'
            }}
          >
            <div className="modal-header" style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C' }}>
                {editingTask ? '编辑任务' : '新建任务'}
              </span>
              <span className="modal-close" onClick={closeTaskModal} style={{ fontSize: '20px', color: '#999', cursor: 'pointer', padding: '4px' }}>✕</span>
            </div>

            <div className="modal-body" style={{
              padding: '16px',
              overflowY: 'auto',
              flex: 1,
              maxHeight: 'calc(85vh - 120px)'
            }}>
              <div className="form-item" style={{ marginBottom: '16px' }}>
                <span className="form-label" style={{ fontSize: '14px', color: '#333', marginBottom: '8px', display: 'block' }}>任务名称</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入任务名称"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#F5F5F5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    border: '1px solid #E0E0E0',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-item" style={{ marginBottom: '16px' }}>
                <span className="form-label" style={{ fontSize: '14px', color: '#333', marginBottom: '8px', display: 'block' }}>番茄钟数</span>
                <div className="pomodoro-selector" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`pomodoro-btn ${targetPomodoros === num ? 'active' : ''}`}
                      onClick={() => setTargetPomodoros(num)}
                      style={{
                        flex: 1,
                        height: '48px',
                        background: targetPomodoros === num ? '#FF6B6B' : '#FFFFFF',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: targetPomodoros === num ? '600' : '400',
                        color: targetPomodoros === num ? '#FFFFFF' : '#333',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid #E0E0E0'
                      }}
                    >
                      {num}
                    </div>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="999"
                    placeholder="自定义"
                    value={![1, 2, 3].includes(targetPomodoros) ? targetPomodoros : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0 && val <= 999) {
                        setTargetPomodoros(val);
                      }
                    }}
                    style={{
                      flex: 1,
                      height: '48px',
                      padding: '0 12px',
                      background: ![1, 2, 3].includes(targetPomodoros) ? '#FF6B6B' : '#F5F5F5',
                      borderRadius: '8px',
                      border: '1px solid #E0E0E0',
                      fontSize: '14px',
                      color: ![1, 2, 3].includes(targetPomodoros) ? '#FFFFFF' : '#333',
                      outline: 'none',
                      boxSizing: 'border-box',
                      textAlign: 'center'
                    }}
                  />
                </div>
              </div>

              <div className="form-item" style={{ marginBottom: '16px' }}>
                <span className="form-label" style={{ fontSize: '14px', color: '#333', marginBottom: '8px', display: 'block' }}>优先级</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'high', label: '高' },
                    { value: 'medium', label: '中' },
                    { value: 'low', label: '低' }
                  ].map((p) => (
                    <div
                      key={p.value}
                      onClick={() => setPriority(p.value as "high" | "medium" | "low")}
                      style={{
                        flex: 1,
                        height: '48px',
                        background: priority === p.value ? '#FF6B6B' : '#FFFFFF',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: priority === p.value ? '600' : '400',
                        color: priority === p.value ? '#FFFFFF' : '#333',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid #E0E0E0'
                      }}
                    >
                      {p.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-item" style={{ marginBottom: '8px' }}>
                <span className="form-label" style={{ fontSize: '14px', color: '#333', marginBottom: '8px', display: 'block' }}>截止日期 (可选)</span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#FAFAFA',
                    borderRadius: '12px',
                    fontSize: '15px',
                    border: '2px solid #EEEEEE',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#EEEEEE'}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 16px 16px' }}>
              <button
                className="btn btn-primary"
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                style={{
                  width: '100%',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: '#FF6B6B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FF5252'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B6B'}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div
          className="confirm-dialog-mask"
          onClick={() => setShowConfirmDialog(false)}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
        >
          <div
            className="confirm-dialog-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              background: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="confirm-dialog-header" style={{ padding: '20px', textAlign: 'center' }}>
              <span className="confirm-icon" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>
                ⚠️
              </span>
              <span className="confirm-title" style={{ fontSize: '18px', fontWeight: '600', color: '#2C2C2C', display: 'block', marginBottom: '8px' }}>
                {pendingAction?.type === 'edit' ? '编辑当前任务' : '删除当前任务'}
              </span>
              <span className="confirm-message" style={{ fontSize: '14px', color: '#666', lineHeight: '1.5', display: 'block' }}>
                {pendingAction?.type === 'edit'
                  ? '当前任务正在进行中，编辑任务信息不会影响已完成的番茄钟进度。'
                  : '当前任务正在进行中，删除任务将清除当前进度和关联数据。'}
              </span>
            </div>

            <div className="confirm-dialog-actions" style={{ padding: '16px 20px 20px', display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  flex: 1,
                  height: '44px',
                  fontSize: '16px',
                  fontWeight: '500',
                  background: '#F5F5F5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#EEEEEE'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F5F5F5'}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={pendingAction?.type === 'edit' ? confirmEdit : confirmDelete}
                style={{
                  flex: 1,
                  height: '44px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: '#FF6B6B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FF5252'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B6B'}
              >
                确认{pendingAction?.type === 'edit' ? '编辑' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
