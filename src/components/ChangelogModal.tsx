// src/components/ChangelogModal.tsx
import { useEffect, useState } from "react";
import { getReleases, type Release } from "../lib/releases";

interface Props {
  onClose: () => void;
}

export default function ChangelogModal({ onClose }: Props) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReleases(10);
        if (!cancelled) setReleases(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("zh-CN");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "80vh",
          background: "var(--card-bg)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
            更新日志
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              color: "var(--text-tertiary)",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* body */}
        <div style={{ overflowY: "auto", padding: "8px 16px 16px" }}>
          {loading && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              加载中…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginBottom: "12px" }}>{error}</div>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                style={{
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: "500",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && releases.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              暂无更新日志
            </div>
          )}

          {!loading &&
            !error &&
            releases.map((r) => (
              <div key={r.tag_name} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {r.name || r.tag_name}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                    {formatDate(r.published_at)}
                  </span>
                </div>
                {r.body && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.body}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
