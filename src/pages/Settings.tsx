import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.12)',
  border: '1px solid #FFECE0',
};

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: '56px',
        height: '30px',
        borderRadius: '15px',
        background: enabled ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: enabled ? '29px' : '3px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }} />
    </button>
  );
}

function NumberInput({ label, hint, value, min, max, unit, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; unit: string;
  onChange: (val: number) => void;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          style={{
            width: '80px',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            background: '#F8F8F8',
            color: '#2C2C2C',
          }}
        />
        <span style={{ fontSize: '14px', color: '#666' }}>{unit}</span>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, enabled, onChange }: {
  label: string; hint: string; enabled: boolean; onChange: () => void;
}) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>{label}</div>
        {hint && <div style={{ fontSize: '12px', color: '#999' }}>{hint}</div>}
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>{title}</h3>
    </div>
  );
}

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig, exportData, importData, toggleAutoLaunch } = useUserStore();
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#2C2C2C', marginBottom: '8px' }}>设置</h1>
        <p style={{ fontSize: '14px', color: '#999' }}>自定义你的番茄钟体验</p>
      </div>

      {/* 计时器 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="⏱" title="计时器" />
        <NumberInput label="专注时长" hint="每个番茄钟的专注时间" value={config.focusDuration} min={1} max={120} unit="分钟"
          onChange={(v) => updateConfig({ focusDuration: v })} />
        <NumberInput label="休息时长" hint="番茄钟之间的短休息" value={config.breakDuration} min={1} max={30} unit="分钟"
          onChange={(v) => updateConfig({ breakDuration: v })} />
        <NumberInput label="长休息时长" hint="每 4 个番茄后的长休息" value={config.longBreakDuration} min={1} max={60} unit="分钟"
          onChange={(v) => updateConfig({ longBreakDuration: v })} />
        <div style={{ marginBottom: 0 }}>
          <ToggleRow label="自动开始" hint="休息结束后自动开始下一个番茄钟" enabled={config.autoStart}
            onChange={() => updateConfig({ autoStart: !config.autoStart })} />
        </div>
      </div>

      {/* 每日目标 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="🎯" title="每日目标" />
        <NumberInput label="每日番茄目标" hint="每天计划完成的番茄数" value={config.dailyGoal} min={1} max={30} unit="个"
          onChange={(v) => updateConfig({ dailyGoal: v })} />
      </div>

      {/* 通知与提醒 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="🔔" title="通知与提醒" />
        <ToggleRow label="启用通知" hint="计时结束时发送系统通知" enabled={config.enableNotifications}
          onChange={() => updateConfig({ enableNotifications: !config.enableNotifications })} />
        <div style={{ marginBottom: 0 }}>
          <ToggleRow label="启用声音" hint="计时结束时播放提示音" enabled={config.enableSound}
            onChange={() => updateConfig({ enableSound: !config.enableSound })} />
        </div>
      </div>

      {/* 桌面宠物 */}
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
            <span style={{ fontSize: '20px' }}>🐱</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: 0 }}>桌面宠物</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>在桌面上显示一只小猫咪，跟随番茄钟状态变化</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#2C2C2C', marginBottom: '4px' }}>显示桌面宠物</div>
            <div style={{ fontSize: '12px', color: '#999' }}>快捷键 Cmd+Shift+P 切换</div>
          </div>
          <button
            onClick={async () => {
              const newValue = !config.showDesktopPet;
              await updateConfig({ showDesktopPet: newValue });
              await invoke("toggle_pet_window", { show: newValue });
            }}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: config.showDesktopPet ? 'linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%)' : '#E0E0E0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: config.showDesktopPet ? '29px' : '3px',
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

      {/* 外观主题 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="🎨" title="外观主题" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { value: 'light', icon: '☀️', label: '浅色', desc: '明亮清爽' },
            { value: 'dark', icon: '🌙', label: '深色', desc: '护眼舒适' },
            { value: 'auto', icon: '🔄', label: '跟随系统', desc: '自动切换' },
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
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{theme.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2C' }}>{theme.label}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 数据管理 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="💾" title="数据管理" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={async () => {
              const path = await save({
                defaultPath: `pomodoro-cat-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [{ name: 'JSON', extensions: ['json'] }],
              });
              if (path) {
                try {
                  await exportData(path);
                  alert('数据导出成功！');
                } catch (e) {
                  alert('导出失败：' + e);
                }
              }
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)',
              color: '#4CAF50', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
            }}
          >
            导出数据
          </button>
          <button
            onClick={async () => {
              const path = await open({
                filters: [{ name: 'JSON', extensions: ['json'] }],
                multiple: false,
              });
              if (path) {
                if (!confirm('导入将覆盖现有数据，是否继续？')) return;
                try {
                  await importData(path as string);
                  alert('数据导入成功！');
                  window.location.reload();
                } catch (e) {
                  alert('导入失败：' + e);
                }
              }
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              background: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)',
              color: '#2196F3', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
            }}
          >
            导入数据
          </button>
          <button
            onClick={handleClearData}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)',
              color: '#FF6B6B', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
            }}
          >
            清除所有番茄记录
          </button>
        </div>
      </div>

      {/* 系统 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="🖥" title="系统" />
        <div style={{ marginBottom: 0 }}>
          <ToggleRow label="开机启动" hint="登录系统时自动启动并最小化到托盘" enabled={config.autoLaunch}
            onChange={() => toggleAutoLaunch(!config.autoLaunch)} />
        </div>
      </div>

      {/* 关于 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="ℹ️" title="关于" />
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
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#FF6B6B', margin: 0 }}>
            感谢使用番茄专注猫，祝你专注高效每一天！ 🍅
          </p>
        </div>
      </div>

      {/* 测试模式 */}
      <div className="card" style={cardStyle}>
        <SectionHeader emoji="🧪" title="测试模式" />
        <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px' }}>快速测试功能，使用1分钟代替正常时长</p>
        <ToggleRow label={isTestMode ? '测试模式已开启' : '测试模式已关闭'} hint="" enabled={isTestMode}
          onChange={() => setIsTestMode(!isTestMode)} />
      </div>
    </div>
  );
}
