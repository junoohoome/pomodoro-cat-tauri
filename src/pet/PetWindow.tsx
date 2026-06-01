import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import CatIdle from "./components/CatIdle";
import CatRunning from "./components/CatRunning";
import CatPaused from "./components/CatPaused";
import CatBreak from "./components/CatBreak";
import "./styles.css";

type PetState = "idle" | "running" | "paused" | "break";

interface PetNotification {
  title: string;
  body: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function PetWindow() {
  const [state, setState] = useState<PetState>("idle");
  const [remaining, setRemaining] = useState(0);
  const [notification, setNotification] = useState<PetNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for timer events from main window
  useEffect(() => {
    const unlistenState = listen<{ state: PetState; targetEndTime: number | null }>("timer-state", (event) => {
      setState(event.payload.state);
      targetEndTimeRef.current = event.payload.targetEndTime;
      // 收到状态变更时立即同步一次剩余时间
      if (event.payload.targetEndTime) {
        const remaining = Math.max(0, Math.floor((event.payload.targetEndTime - Date.now()) / 1000));
        setRemaining(remaining);
      }
    });

    const unlistenTick = listen<{ remaining: number }>("timer-tick", (event) => {
      setRemaining(event.payload.remaining);
    });

    const unlistenNotification = listen<PetNotification>("pet-notification", (event) => {
      // 清除上一个定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setNotification(event.payload);
      // 3秒后自动消失
      timerRef.current = setTimeout(() => setNotification(null), 3000);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenTick.then((fn) => fn());
      unlistenNotification.then((fn) => fn());
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 本地倒计时：宠物窗口自行计算剩余时间，不依赖主窗口 tick
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (state === "running" && targetEndTimeRef.current) {
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((targetEndTimeRef.current! - Date.now()) / 1000));
        setRemaining(remaining);
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [state]);

  // Click cat → focus main window
  const handleClick = useCallback(async () => {
    await emit("pet-clicked");
  }, []);

  // Drag: start dragging on mousedown, save position on mouseup
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0) {
      await getCurrentWindow().startDragging();
    }
  }, []);

  const handleMouseUp = useCallback(async () => {
    try {
      const position = await getCurrentWindow().innerPosition();
      await emit("pet-dragged", { x: position.x, y: position.y });
    } catch {
      // Ignore errors if window position can't be read
    }
  }, []);

  // Render correct cat component
  const renderCat = () => {
    switch (state) {
      case "running":
        return <CatRunning />;
      case "paused":
        return <CatPaused />;
      case "break":
        return <CatBreak />;
      default:
        return <CatIdle />;
    }
  };

  const showTimer = state !== "idle";

  return (
    <div
      className="pet-container"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {/* 气泡通知 - 猫咪头顶 */}
      {notification && (
        <div className="pet-bubble">
          <div className="pet-bubble-title">{notification.title}</div>
          <div className="pet-bubble-body">{notification.body}</div>
        </div>
      )}
      {renderCat()}
      {showTimer && <span className="pet-timer">{formatTime(remaining)}</span>}
    </div>
  );
}
