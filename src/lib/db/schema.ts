import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 任务表
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  targetPomodoros: integer("target_pomodoros").notNull().default(1),
  completedPomodoros: integer("completed_pomodoros").notNull().default(0),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  priority: text("priority", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
  deadline: text("deadline"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// 用户配置表
export const userConfig = sqliteTable("user_config", {
  id: integer("id").primaryKey().default(1),
  focusDuration: integer("focus_duration").notNull().default(25),
  breakDuration: integer("break_duration").notNull().default(5),
  enableNotifications: integer("enable_notifications", { mode: "boolean" }).notNull().default(true),
  enableSound: integer("enable_sound", { mode: "boolean" }).notNull().default(true),
  theme: text("theme", { enum: ["light", "dark", "auto"] }).notNull().default("light"),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// 番茄钟记录表
export const pomodoroRecords = sqliteTable("pomodoro_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  duration: integer("duration").notNull(),
  type: text("type", { enum: ["focus", "break"] }).notNull().default("focus"),
  recordedAt: text("recorded_at").notNull().default(new Date().toISOString()),
});

// 应用状态表（键值存储）
export const appState = sqliteTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// 类型导出
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type UserConfig = typeof userConfig.$inferSelect;
export type NewUserConfig = typeof userConfig.$inferInsert;
export type PomodoroRecord = typeof pomodoroRecords.$inferSelect;
export type NewPomodoroRecord = typeof pomodoroRecords.$inferInsert;
export type AppState = typeof appState.$inferSelect;
export type NewAppState = typeof appState.$inferInsert;
