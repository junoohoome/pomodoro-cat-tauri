import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// 数据库文件路径
const DB_PATH = "pomodoro-cat.db";

// 创建数据库连接
export function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

// 导出 schema
export * from "./schema";

// 导出类型
export type Db = ReturnType<typeof createDb>;
