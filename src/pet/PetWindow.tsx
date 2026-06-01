import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import CatIdle from "./components/CatIdle";
import CatRunning from "./components/CatRunning";
import CatPaused from "./components/CatPaused";
import CatBreak from "./components/CatBreak";
import { pickBubble } from "../lib/bubbles";
import type { CatState } from "../types";
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
  const [showFeed, setShowFeed] = useState(false);
  const [catState, setCatState] = useState<CatState | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCatState = useCallback(async () => {
    try {
      const result = await invoke<CatState>("get_cat_state");
      setCatState(result);
      return result;
    } catch {
      return null;
    }
  }, []);

  const showSpeechBubble = useCallback((text: string, duration = 5000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSpeech(text);
    timerRef.current = setTimeout(() => setSpeech(null), duration);
  }, []);

  // Listen for timer events from main window
  useEffect(() => {
    const unlistenState = listen<{ state: PetState; targetEndTime: number | null }>("timer-state", (event) => {
      setState(event.payload.state);
      targetEndTimeRef.current = event.payload.targetEndTime;
      if (event.payload.targetEndTime) {
        const remaining = Math.max(0, Math.floor((event.payload.targetEndTime - Date.now()) / 1000));
        setRemaining(remaining);
      }
    });

    const unlistenTick = listen<{ remaining: number }>("timer-tick", (event) => {
      setRemaining(event.payload.remaining);
    });

    const unlistenNotification = listen<PetNotification>("pet-notification", (event) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setNotification(event.payload);
      setSpeech(null);
      timerRef.current = setTimeout(() => setNotification(null), 3000);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenTick.then((fn) => fn());
      unlistenNotification.then((fn) => fn());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Local countdown
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

  // Timed random bubble (every 15-30 minutes)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleBubble = () => {
      const delay = (15 + Math.random() * 15) * 60 * 1000; // 15-30 min
      timeout = setTimeout(async () => {
        const cs = await fetchCatState();
        if (cs) {
          showSpeechBubble(pickBubble("timer", cs.weight), 5000);
        }
        scheduleBubble(); // Schedule next one
      }, delay);
    };

    scheduleBubble();

    return () => {
      clearTimeout(timeout);
    };
  }, [fetchCatState, showSpeechBubble]);

  // Click cat → toggle feed overlay
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showFeed) {
      setShowFeed(false);
      return;
    }

    const cs = await fetchCatState();
    if (cs) {
      setShowFeed(true);
      if (feedTimerRef.current) clearTimeout(feedTimerRef.current);
      feedTimerRef.current = setTimeout(() => setShowFeed(false), 5000);
    }
  }, [showFeed, fetchCatState]);

  // Feed the cat
  const handleFeed = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await invoke<CatState>("feed_cat");
      setCatState(result);
      showSpeechBubble(pickBubble("state_change", result.weight, "feed_success"), 4000);
    } catch (err: unknown) {
      const msg = typeof err === "string" ? err : "喂食失败";
      if (msg.includes("没有罐头")) {
        showSpeechBubble(pickBubble("state_change", catState?.weight ?? 2, "no_food"), 4000);
      } else if (msg.includes("太胖")) {
        showSpeechBubble(pickBubble("state_change", catState?.weight ?? 10, "full_weight"), 4000);
      }
    }
    setShowFeed(false);
  }, [catState, showSpeechBubble]);

  // Close feed overlay on clicking overlay background
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFeed(false);
  }, []);

  // Drag (only when feed overlay is not shown)
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0 && !showFeed) {
      await getCurrentWindow().startDragging();
    }
  }, [showFeed]);

  const handleMouseUp = useCallback(async () => {
    try {
      const position = await getCurrentWindow().innerPosition();
      await emit("pet-dragged", { x: position.x, y: position.y });
    } catch {
      // Ignore
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
      {/* Speech bubble */}
      {speech && !notification && !showFeed && (
        <div className="pet-speech">{speech}</div>
      )}

      {/* Notification bubble */}
      {notification && (
        <div className="pet-bubble">
          <div className="pet-bubble-title">{notification.title}</div>
          <div className="pet-bubble-body">{notification.body}</div>
        </div>
      )}

      {/* Feed overlay */}
      {showFeed && catState && (
        <div className="pet-feed-overlay" onClick={handleOverlayClick}>
          <div className="pet-feed-weight">{catState.weight.toFixed(1)} kg</div>
          <div className="pet-feed-bar">
            <div
              className="pet-feed-bar-fill"
              style={{ width: `${((catState.weight - 1) / 9) * 100}%` }}
            />
          </div>
          <div className="pet-feed-info">
            <span>🥫 ×{catState.foodInventory}</span>
            <span>{catState.weight >= 10 ? "MAX" : (10 - catState.weight).toFixed(1) + " kg to max"}</span>
          </div>
          <button
            className={`pet-feed-btn ${catState.foodInventory > 0 && catState.weight < 10 ? "can-feed" : "disabled"}`}
            onClick={handleFeed}
            disabled={catState.foodInventory <= 0 || catState.weight >= 10}
          >
            {catState.weight >= 10
              ? "吃不下了..."
              : catState.foodInventory <= 0
                ? "没有罐头了"
                : "喂食 🥫"}
          </button>
        </div>
      )}

      {renderCat()}
      {showTimer && <span className="pet-timer">{formatTime(remaining)}</span>}
    </div>
  );
}
