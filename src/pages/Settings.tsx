import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "../stores/userStore";
import { useTestModeStore } from "../stores/testModeStore";

const cardStyle: React.CSSProperties = {
  background: 'var(--card-gradient)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border-color)',
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
        background: enabled ? 'var(--primary-gradient)' : 'var(--toggle-off-bg)',
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
        background: 'var(--switch-knob-bg)',
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
        <span style={{ fontSize: '14px', color: 'var(--text-color)', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '12px', color: 'var(--subtle-color)', marginLeft: '8px' }}>{hint}</span>
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
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            background: 'var(--input-bg)',
            color: 'var(--text-color)',
          }}
        />
        <span style={{ fontSize: '14px', color: 'var(--muted-color)' }}>{unit}</span>
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
        <div style={{ fontSize: '14px', color: 'var(--text-color)', marginBottom: '4px' }}>{label}</div>
        {hint && <div style={{ fontSize: '12px', color: 'var(--subtle-color)' }}>{hint}</div>}
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>{title}</h3>
    </div>
  );
}

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig, toggleAutoLaunch, resetConfig } = useUserStore();
  const { isTestMode, setIsTestMode } = useTestModeStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span style={{ color: 'var(--subtle-color)' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-color)', marginBottom: '8px' }}>设置</h1>
        <p style={{ fontSize: '14px', color: 'var(--subtle-color)' }}>自定义你的番茄钟体验</p>
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
        <div style={{ marginBottom: '20px' }}>
          <ToggleRow label="显示每日目标" hint="在主页显示今日目标进度条" enabled={config.showDailyGoal}
            onChange={() => updateConfig({ showDailyGoal: !config.showDailyGoal })} />
        </div>
        {config.showDailyGoal && (
          <div style={{ marginBottom: 0 }}>
            <NumberInput label="每日番茄目标" hint="每天计划完成的番茄数" value={config.dailyGoal} min={1} max={30} unit="个"
              onChange={(v) => updateConfig({ dailyGoal: v })} />
          </div>
        )}
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
        background: 'var(--card-gradient)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🐱</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>桌面宠物</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted-color)', margin: 0 }}>在桌面上显示一只小猫咪，跟随番茄钟状态变化</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-color)', marginBottom: '4px' }}>显示桌面宠物</div>
            <div style={{ fontSize: '12px', color: 'var(--subtle-color)' }}>快捷键 Cmd+Shift+P 切换</div>
          </div>
          <button
            onClick={async () => {
              const newValue = !config.showDesktopPet;
              const previousValue = config.showDesktopPet;
              try {
                await updateConfig({ showDesktopPet: newValue });
                await invoke("toggle_pet_window", { show: newValue });
              } catch (e) {
                await updateConfig({ showDesktopPet: previousValue });
                alert(`桌面宠物切换失败：${String(e)}`);
              }
            }}
            style={{
              position: 'relative',
              width: '56px',
              height: '30px',
              borderRadius: '15px',
              background: config.showDesktopPet ? 'var(--primary-gradient)' : 'var(--toggle-off-bg)',
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
              background: 'var(--switch-knob-bg)',
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
                border: config.theme === theme.value ? '2px solid var(--primary-color)' : '1px solid var(--input-border)',
                background: config.theme === theme.value ? 'var(--active-bg)' : 'var(--card-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{theme.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color)' }}>{theme.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--subtle-color)' }}>{theme.desc}</span>
            </button>
          ))}
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

      {/* 恢复默认 */}
      <button
        onClick={async () => {
          if (confirm('确定要恢复所有设置为默认值吗？')) {
            await resetConfig();
            alert('已恢复默认设置');
          }
        }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          background: 'var(--card-gradient)',
          color: 'var(--primary-color)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: 'var(--card-shadow)',
          transition: 'all 0.3s ease',
          marginBottom: '16px',
        }}
      >
        恢复默认设置
      </button>

      {/* 测试模式（仅开发环境） */}
      {import.meta.env.DEV && (
        <div className="card" style={cardStyle}>
          <SectionHeader emoji="🧪" title="测试模式" />
          <p style={{ fontSize: '13px', color: 'var(--muted-color)', margin: '0 0 12px' }}>快速测试功能，使用1分钟代替正常时长</p>
          <ToggleRow label={isTestMode ? '测试模式已开启' : '测试模式已关闭'} hint="" enabled={isTestMode}
            onChange={() => setIsTestMode(!isTestMode)} />
        </div>
      )}
    </div>
  );
}
