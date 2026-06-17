import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke, resetInvokeMock } from "./setup";
import { invoke } from "@tauri-apps/api/core";

describe("mockInvoke helper", () => {
  beforeEach(() => {
    resetInvokeMock();
  });

  it("已注册命令返回 handler 结果", async () => {
    mockInvoke({
      get_user_config: () => ({ id: 1, focusDuration: 30 }),
    });
    const result = await invoke<{ focusDuration: number }>("get_user_config");
    expect(result.focusDuration).toBe(30);
  });

  it("未注册命令抛错（防假绿）", () => {
    mockInvoke({});
    expect(() => invoke("does_not_exist")).toThrow(
      /未注册的命令 "does_not_exist"/
    );
  });

  it("handler 可以是 vi.fn 以便断言调用", async () => {
    const spy = vi.fn(() => null);
    mockInvoke({ toggle_pet_window: spy });
    await invoke("toggle_pet_window", { show: false });
    expect(spy).toHaveBeenCalledWith({ show: false });
  });
});
