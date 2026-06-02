import { useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import GlobalTimer from "./components/GlobalTimer";
import { useUserStore } from "./stores/userStore";

// Clean SVG icons matching macOS style
const TimerIcon = ({ color = "currentColor", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ListIcon = ({ color = "currentColor", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const CatIcon = ({ color = "currentColor", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
  </svg>
);

const ChartIcon = ({ color = "currentColor", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const SettingsIcon = ({ color = "currentColor", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const navItems = [
  { path: "/timer", label: "主页", icon: TimerIcon },
  { path: "/tasks", label: "任务", icon: ListIcon },
  { path: "/cat", label: "猫咪", icon: CatIcon },
  { path: "/stats", label: "统计", icon: ChartIcon },
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, fetchConfig } = useUserStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const preferredTheme = config?.theme ?? "light";
      const resolvedTheme = preferredTheme === "auto"
        ? (mediaQuery.matches ? "dark" : "light")
        : preferredTheme;

      document.documentElement.dataset.theme = resolvedTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [config?.theme]);

  // 窗口不可见时暂停 CSS 动画，减少 CPU 开销
  useEffect(() => {
    const root = document.documentElement;
    const handler = () => {
      root.classList.toggle("animations-paused", document.hidden);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <>
      <GlobalTimer />

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--app-bg)' }}>
        {/* Sidebar */}
        <aside style={{
          width: '180px',
          background: 'var(--app-bg)',
          borderRight: '1px solid var(--border-color)',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          paddingTop: '38px',
          flexShrink: 0
        }}>
          {/* Logo - also serves as drag region */}
          <div data-tauri-drag-region style={{
            padding: '0 16px 16px',
            borderBottom: 'none',
            marginBottom: '8px',
            cursor: 'default',
            WebkitAppRegion: 'drag'
          } as React.CSSProperties}>
            <h1 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none'
            }}>
              <img
                src="/logo.png"
                alt="番茄专注猫"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain'
                }}
              />
              <span>番茄专注猫</span>
            </h1>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column' }}>
            <div>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/timer' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.path);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      margin: '1px 0',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      background: isActive ? 'var(--active-bg)' : 'transparent',
                      color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                      fontWeight: '500',
                      fontSize: '13px',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <item.icon color={isActive ? 'var(--accent-color)' : 'var(--text-tertiary)'} size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            <Link
              to="/settings"
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                margin: '1px 0',
                borderRadius: '6px',
                textDecoration: 'none',
                background: location.pathname === '/settings' ? 'var(--active-bg)' : 'transparent',
                color: location.pathname === '/settings' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: '500',
                fontSize: '13px',
                transition: 'background 0.15s ease',
                cursor: 'pointer'
              }}
            >
              <SettingsIcon color={location.pathname === '/settings' ? 'var(--accent-color)' : 'var(--text-tertiary)'} size={17} />
              <span>设置</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1,
          padding: '28px 32px',
          paddingTop: '38px',
          overflowY: 'auto',
          maxHeight: '100vh',
          background: 'var(--surface-bg)'
        }}>
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default App;
