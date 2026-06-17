import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke } from "../test/setup";
import { useUserStore } from "./userStore";
import type { UserConfig } from "../types";

// resetConfig 内部 dynamic import 了 autostart 插件，需单独 mock
vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: vi.fn(),
  disable: vi.fn(),
}));
import { enable, disable } from "@tauri-apps/plugin-autostart";
const mockedEnable = vi.mocked(enable);
const mockedDisable = vi.mocked(disable);

const baseConfig: UserConfig = {
  id: 1,
  focusDuration: 25,
  breakDuration: 5,
  enableNotifications: false,
  enableSound: true,
  theme: "light",
  updatedAt: "2026-01-01 00:00:00",
  longBreakDuration: 15,
  autoStart: false,
  dailyGoal: 4,
  autoLaunch: false,
  showDesktopPet: false,
  showDailyGoal: true,
};

describe("userStore.resetConfig", () => {
  beforeEach(() => {
    mockedEnable.mockReset();
    mockedDisable.mockReset();
  });

  it("宠物窗/开机启动从开启→关闭默认值时，触发隐藏/注销副作用", async () => {
    // 旧配置：两者都开
    useUserStore.setState({
      config: { ...baseConfig, showDesktopPet: true, autoLaunch: true },
    });

    const togglePetWindow = vi.fn(() => null);
    mockInvoke({
      // 恢复默认返回：两者都关（默认值）
      reset_user_config: () => ({ ...baseConfig }),
      toggle_pet_window: togglePetWindow,
    });

    await useUserStore.getState().resetConfig();

    expect(togglePetWindow).toHaveBeenCalledWith({ show: false });
    expect(mockedDisable).toHaveBeenCalled();
    expect(mockedEnable).not.toHaveBeenCalled();
  });

  it("新旧配置一致时不触发副作用", async () => {
    // 新旧都是默认（都关），无差异
    useUserStore.setState({ config: { ...baseConfig } });

    const togglePetWindow = vi.fn(() => null);
    mockInvoke({
      reset_user_config: () => ({ ...baseConfig }),
      toggle_pet_window: togglePetWindow,
    });

    await useUserStore.getState().resetConfig();

    expect(togglePetWindow).not.toHaveBeenCalled();
    expect(mockedDisable).not.toHaveBeenCalled();
  });
});
