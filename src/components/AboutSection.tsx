// src/components/AboutSection.tsx
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  REPO_URL,
  getLatestRelease,
  compareVersions,
  NoReleasesError,
} from "../lib/releases";
import ChangelogModal from "./ChangelogModal";

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "upToDate" }
  | { status: "available"; tag: string; url: string }
  | { status: "error"; message: string };

export default function AboutSection() {
  const [version, setVersion] = useState("…");
  const [check, setCheck] = useState<CheckState>({ status: "idle" });
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion("未知"));
  }, []);

  async function handleCheck() {
    setCheck({ status: "checking" });
    try {
      const latest = await getLatestRelease();
      if (compareVersions(version, latest.tag_name) < 0) {
        setCheck({ status: "available", tag: latest.tag_name, url: latest.html_url });
      } else {
        setCheck({ status: "upToDate" });
        setTimeout(() => setCheck({ status: "idle" }), 2000);
      }
    } catch (e) {
      const message =
        e instanceof NoReleasesError ? "尚未发布任何版本" : "检查失败，请稍后重试";
      setCheck({ status: "error", message });
    }
  }

  // 默认值对应 idle；非 idle 状态在下方分支覆写
  let statusText = `当前版本 ${version}`;
  let buttonLabel = "检查更新";
  let buttonAction: () => void = () => {
    void handleCheck();
  };
  let buttonDisabled = version === "…";

  if (check.status === "checking") {
    buttonLabel = "检查中…";
    buttonAction = () => {};
    buttonDisabled = true;
  } else if (check.status === "upToDate") {
    statusText = "已是最新版本 ✓";
  } else if (check.status === "available") {
    statusText = `发现新版本 ${check.tag}`;
    buttonLabel = "下载更新";
    buttonAction = () => {
      void openUrl(check.url);
    };
  } else if (check.status === "error") {
    statusText = `${check.message}，可前往 GitHub 查看`;
    buttonLabel = "重试";
  }

  return (
    <>
      <div
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "var(--text-secondary)",
          marginBottom: "6px",
          marginLeft: "2px",
        }}
      >
        关于
      </div>
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          marginBottom: "20px",
          overflow: "hidden",
        }}
      >
        {/* 版本 + 检查更新 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>版本</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{statusText}</div>
          </div>
          <button
            onClick={buttonAction}
            disabled={buttonDisabled}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "500",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: buttonDisabled ? "var(--surface-secondary)" : "var(--accent-color)",
              color: buttonDisabled ? "var(--text-tertiary)" : "#fff",
              cursor: buttonDisabled ? "default" : "pointer",
              flexShrink: 0,
            }}
          >
            {buttonLabel}
          </button>
        </div>

        {/* 更新日志 */}
        <button
          onClick={() => setShowChangelog(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "12px 16px",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "1px solid var(--border-subtle)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>更新日志</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>查看历史发布记录</div>
          </div>
          <span style={{ color: "var(--text-tertiary)", fontSize: "16px" }}>›</span>
        </button>

        {/* GitHub 仓库 */}
        <button
          onClick={() => {
            void openUrl(REPO_URL);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "12px 16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>GitHub 仓库</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>junoohoome/pomodoro-cat-tauri</div>
          </div>
          <span style={{ color: "var(--text-tertiary)", fontSize: "16px" }}>›</span>
        </button>
      </div>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </>
  );
}
