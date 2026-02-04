import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";

// SVG 图标组件
const TimerIcon = ({ color = "#999", size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ListIcon = ({ color = "#999", size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const CatIcon = ({ color = "#999", size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
  </svg>
);

const ChartIcon = ({ color = "#999", size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%)' }}>
      {/* 左侧边栏 */}
      <aside style={{
        width: '200px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRight: '1px solid #FFECE0',
        boxShadow: '4px 0 12px rgba(255, 107, 107, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
        flexShrink: 0
      }}>
        {/* Logo/标题 */}
        <div style={{
          padding: '0 20px 20px',
          borderBottom: '1px solid #FFECE0',
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#FF6B6B',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <img
              src="/logo.png"
              alt="番茄专注猫"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain'
              }}
            />
            <span>番茄专注猫</span>
          </h1>
        </div>

        {/* 导航菜单 */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
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
                  gap: '12px',
                  padding: '12px 16px',
                  margin: '4px 0',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)' : 'transparent',
                  color: isActive ? '#FF6B6B' : '#666',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '15px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <item.icon color={isActive ? '#FF6B6B' : '#999'} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        maxHeight: '100vh'
      }}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
