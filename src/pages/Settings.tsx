import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig } = useUserStore();
  const { isTestMode, setIsTestMode } = useTestModeStore();

  const handleClearData = async () => {
    if (confirm("确定要清除所有番茄钟记录吗？此操作不可恢复。")) {
      await invoke("clear_pomodoro_records");
      window.location.reload();
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span style={{ color: '#999' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#2C2C2C',
          marginBottom: '8px'
        }}>设置</h1>
        <p style={{ fontSize: '14px', color: '#999' }}>自定义你的番茄钟体验</p>
      </div>

      {/* 测试模式 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧪</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>测试模式</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>快速测试功能，使用1分钟代替正常时长</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: '#2C2C2C' }}>{isTestMode ? '测试模式已开启' : '测试模式已关闭'}</span>
          <button
            onClick={() => setIsTestMode(!isTestMode)}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: isTestMode ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: isTestMode ? '29px' : '3px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}></span>
          </button>
        </div>
        {isTestMode && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FFECE0' }}>
            <button
              onClick={handleClearData}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: '#FF6B6B',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
            >
              清除测试数据
            </button>
          </div>
        )}
      </div>

      {/* 计时器设置 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⏱</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>计时器设置</h3>
          </div>
        </div>

        {/* 专注时长 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: '500' }}>专注时长</span>
            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>每个番茄钟的专注时间</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="1"
              max="120"
              value={config.focusDuration}
              onChange={(e) => updateConfig({ focusDuration: parseInt(e.target.value) || 25 })}
              style={{
                width: '80px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                background: '#F8F8F8',
                color: '#2C2C2C'
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>分钟</span>
          </div>
        </div>

        {/* 休息时长 */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: '500' }}>休息时长</span>
            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>每个番茄钟后的休息时间</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="1"
              max="30"
              value={config.breakDuration}
              onChange={(e) => updateConfig({ breakDuration: parseInt(e.target.value) || 5 })}
              style={{
                width: '80px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                background: '#F8F8F8',
                color: '#2C2C2C'
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>分钟</span>
          </div>
        </div>
      </div>

      {/* 通知与提醒 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>通知与提醒</h3>
          </div>
        </div>

        {/* 启用通知 */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>启用通知</div>
            <div style={{ fontSize: '12px', color: '#999' }}>计时结束时发送系统通知</div>
          </div>
          <button
            onClick={() => updateConfig({ enableNotifications: !config.enableNotifications })}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: config.enableNotifications ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: config.enableNotifications ? '29px' : '3px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}></span>
          </button>
        </div>

        {/* 启用声音 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>启用声音</div>
            <div style={{ fontSize: '12px', color: '#999' }}>计时结束时播放提示音</div>
          </div>
          <button
            onClick={() => updateConfig({ enableSound: !config.enableSound })}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: config.enableSound ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: config.enableSound ? '29px' : '3px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}></span>
          </button>
        </div>
      </div>

      {/* 主题设置 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎨</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>外观主题</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { value: 'light', icon: 'sun', label: '浅色', desc: '明亮清爽' },
            { value: 'dark', icon: 'moon', label: '深色', desc: '护眼舒适' },
            { value: 'auto', icon: 'auto', label: '跟随系统', desc: '自动切换' },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateConfig({ theme: theme.value as any })}
              style={{
                padding: '16px 12px',
                borderRadius: '10px',
                border: config.theme === theme.value ? '2px solid #FF6B6B' : '1px solid #E0E0E0',
                background: config.theme === theme.value ? 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '28px' }}>{theme.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2C' }}>{theme.label}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
        border: '1px solid #FFECE0'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>关于</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8F8F8', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>应用名称</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2C2C2C' }}>番茄专注猫</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8F8F8', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>版本</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2C2C2C' }}>1.0.0</span>
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)',
          border: '1px solid #FFD9C7',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#FF6B6B', margin: 0 }}>
            感谢使用番茄专注猫，祝你专注高效每一天！ 🍅
          </p>
        </div>
      </div>
    </div>
  );
}
