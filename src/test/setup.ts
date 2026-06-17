import { afterEach, vi } from "vitest";

// 全局 mock @tauri-apps/api/core 的 invoke。
// vi.mock 必须放在 setupFile（本文件）里才可靠：hoisting 会把它提升到所有测试的 import 之前。
// 用 vi.hoisted 创建 mock 函数，让 vi.mock 工厂能引用到它。
const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

type InvokeHandler = (args: Record<string, unknown>) => unknown;

/**
 * 注册「命令名 → 返回值」映射。未命中的命令会抛错，避免静默返回 undefined 造成假绿。
 * handler 也可以是 vi.fn()，以便断言调用参数。
 */
export function mockInvoke(handlers: Record<string, InvokeHandler>) {
  invokeMock.mockImplementation(
    (cmd: string, args?: Record<string, unknown>) => {
      const handler = handlers[cmd];
      if (!handler) {
        throw new Error(`mockInvoke: 未注册的命令 "${cmd}"（避免假绿测试）`);
      }
      return handler(args ?? {});
    }
  );
}

export function resetInvokeMock() {
  invokeMock.mockReset();
}

afterEach(() => {
  resetInvokeMock();
});
