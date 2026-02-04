import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Task, NewTask } from "../types";

interface TaskStore {
  // 状态
  activeTasks: Task[];
  completedTasks: Task[];
  currentTask: Task | null;
  activePage: number;
  completedPage: number;
  hasMoreActive: boolean;
  hasMoreCompleted: boolean;
  isLoading: boolean;

  // 操作
  fetchActiveTasks: (page?: number) => Promise<void>;
  fetchCompletedTasks: (page?: number) => Promise<void>;
  createTask: (task: Omit<NewTask, "deadline"> & { deadline?: string | null }) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  setCurrentTask: (task: Task | null) => void;
  incrementTaskProgress: (taskId: number) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  activeTasks: [],
  completedTasks: [],
  currentTask: null,
  activePage: 1,
  completedPage: 1,
  hasMoreActive: true,
  hasMoreCompleted: true,
  isLoading: false,

  fetchActiveTasks: async (page = 1) => {
    set({ isLoading: true });
    try {
      const tasks = await invoke<Task[]>("get_tasks", {
        completed: false,
        page,
        pageSize: 20,
      });
      set({
        activeTasks: page === 1 ? tasks : [...get().activeTasks, ...tasks],
        activePage: page,
        hasMoreActive: tasks.length === 20,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCompletedTasks: async (page = 1) => {
    set({ isLoading: true });
    try {
      const tasks = await invoke<Task[]>("get_tasks", {
        completed: true,
        page,
        pageSize: 20,
      });
      set({
        completedTasks: page === 1 ? tasks : [...get().completedTasks, ...tasks],
        completedPage: page,
        hasMoreCompleted: tasks.length === 20,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (task) => {
    const newTask = await invoke<Task>("create_task", {
      task: {
        name: task.name,
        targetPomodoros: task.targetPomodoros,
        priority: task.priority,
        deadline: task.deadline || undefined,
      },
    });
    set({ activeTasks: [newTask, ...get().activeTasks] });
    return newTask;
  },

  updateTask: async (id, updates) => {
    await invoke("update_task", {
      updates: {
        id,
        name: updates.name,
        targetPomodoros: updates.targetPomodoros,
        completedPomodoros: updates.completedPomodoros,
        completed: updates.completed,
        priority: updates.priority,
        deadline: updates.deadline !== undefined ? updates.deadline : null,
      },
    });

    // 更新本地状态
    const updateInList = (tasks: Task[]) =>
      tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );

    set({
      activeTasks: updateInList(get().activeTasks),
      completedTasks: updateInList(get().completedTasks),
      currentTask:
        get().currentTask?.id === id
          ? { ...get().currentTask!, ...updates, updatedAt: new Date().toISOString() } as Task
          : get().currentTask,
    });
  },

  deleteTask: async (id) => {
    await invoke("delete_task", { id });
    set({
      activeTasks: get().activeTasks.filter((t) => t.id !== id),
      completedTasks: get().completedTasks.filter((t) => t.id !== id),
      currentTask: get().currentTask?.id === id ? null : get().currentTask,
    });
  },

  setCurrentTask: (task) => {
    set({ currentTask: task });
  },

  incrementTaskProgress: async (taskId) => {
    const task = [...get().activeTasks, ...get().completedTasks].find(
      (t) => t.id === taskId
    );
    if (!task) return;

    const newProgress = task.completedPomodoros + 1;
    const completed = newProgress >= task.targetPomodoros;

    await get().updateTask(taskId, {
      completedPomodoros: newProgress,
      completed,
    });
  },
}));
