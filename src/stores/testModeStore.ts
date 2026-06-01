import { create } from "zustand";

const STORAGE_KEY = "testMode";

interface TestModeStore {
  isTestMode: boolean;
  setIsTestMode: (enabled: boolean) => void;
}

export const useTestModeStore = create<TestModeStore>((set) => ({
  isTestMode: localStorage.getItem(STORAGE_KEY) === "true",
  setIsTestMode: (enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    set({ isTestMode: enabled });
  },
}));
