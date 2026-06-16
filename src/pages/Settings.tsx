import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "../stores/userStore";
import AboutSection from "../components/AboutSection";


function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: '44px',
        height: '26px',
        borderRadius: '13px',
        background: enabled ? 'var(--toggle-on-bg)' : 'var(--toggle-off-bg)',
        transition: 'background 0.2s ease',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: enabled ? '22px' : '2px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'var(--switch-knob-bg)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
        transition: 'left 0.2s ease',
      }} />
    </button>
  );
}

function NumberInput({ label, hint, value, min, max, unit, step, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; unit: string; step?: number;
  onChange: (val: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '400' }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step || 1}
          value={value}
          onChange={(e) => {
            let val = parseFloat(e.target.value) || min;
            if (step) val = Math.round(val / step) * step;
            onChange(Math.min(max, Math.max(min, val)));
          }}
          style={{
            width: '64px',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid var(--input-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{unit}</span>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, enabled, onChange, last }: {
  label: string; hint: string; enabled: boolean; onChange: () => void; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{hint}</div>}
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig, toggleAutoLaunch, resetConfig } = useUserStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* Timer */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>计时器</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <NumberInput label="专注时长" hint="每个番茄钟的专注时间" value={config.focusDuration} min={1} max={120} unit="分钟"
          onChange={(v) => updateConfig({ focusDuration: v })} />
        <NumberInput label="休息时长" hint="番茄钟之间的短休息" value={config.breakDuration} min={1} max={30} unit="分钟"
          onChange={(v) => updateConfig({ breakDuration: v })} />
        <NumberInput label="长休息时长" hint="每 4 个番茄后的长休息" value={config.longBreakDuration} min={1} max={60} unit="分钟"
          onChange={(v) => updateConfig({ longBreakDuration: v })} />
        <ToggleRow label="自动开始" hint="休息结束后自动开始下一个番茄钟" enabled={config.autoStart}
          onChange={() => updateConfig({ autoStart: !config.autoStart })} last />
      </div>

      {/* Daily goal */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>每日目标</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <ToggleRow label="显示每日目标" hint="在主页显示今日目标进度条" enabled={config.showDailyGoal}
          onChange={() => updateConfig({ showDailyGoal: !config.showDailyGoal })} last={!config.showDailyGoal} />
        {config.showDailyGoal && (
          <NumberInput label="每日专注目标" hint="每天计划完成的专注次数" value={config.dailyGoal} min={1} max={12} step={1} unit="次"
            onChange={(v) => updateConfig({ dailyGoal: v })} />
        )}
        {config.showDailyGoal && (
          <div style={{ borderBottom: 'none' }} />
        )}
      </div>

      {/* Notifications */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>通知与提醒</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <ToggleRow label="启用通知" hint="计时结束时发送系统通知" enabled={config.enableNotifications}
          onChange={() => updateConfig({ enableNotifications: !config.enableNotifications })} />
        <ToggleRow label="启用声音" hint="计时结束时播放提示音" enabled={config.enableSound}
          onChange={() => updateConfig({ enableSound: !config.enableSound })} last />
      </div>

      {/* Desktop pet */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>桌面宠物</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>显示桌面宠物</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>在桌面上显示小猫咪，跟随番茄钟状态变化</div>
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
              width: '44px',
              height: '26px',
              borderRadius: '13px',
              background: config.showDesktopPet ? 'var(--toggle-on-bg)' : 'var(--toggle-off-bg)',
              transition: 'background 0.2s ease',
              cursor: 'pointer',
              border: 'none',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '2px',
              left: config.showDesktopPet ? '22px' : '2px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--switch-knob-bg)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>
      </div>

      {/* Theme */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>外观主题</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        padding: '16px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { value: 'light', label: '浅色', desc: '明亮清爽' },
            { value: 'dark', label: '深色', desc: '护眼舒适' },
            { value: 'auto', label: '跟随系统', desc: '自动切换' },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateConfig({ theme: theme.value as any })}
              style={{
                padding: '12px 8px',
                borderRadius: 'var(--radius-md)',
                border: config.theme === theme.value ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                background: config.theme === theme.value ? 'var(--accent-light)' : 'var(--card-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: '500', color: config.theme === theme.value ? 'var(--accent-color)' : 'var(--text-primary)' }}>{theme.label}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>快捷键</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        {[
          { keys: 'Space', action: '开始 / 暂停' },
          { keys: 'Esc', action: '放弃当前番茄钟' },
        ].map((shortcut, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: i === 0 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{shortcut.action}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '3px 8px', fontSize: '11px', fontWeight: '500',
              background: 'var(--surface-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '4px', color: 'var(--text-secondary)',
              minWidth: '48px', textAlign: 'center',
            }}>{shortcut.keys}</span>
          </div>
        ))}
      </div>

      {/* System */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '2px' }}>系统</div>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <ToggleRow label="开机启动" hint="登录系统时自动启动并最小化到托盘" enabled={config.autoLaunch}
          onChange={() => toggleAutoLaunch(!config.autoLaunch)} last />
      </div>

      {/* About */}
      <AboutSection />

      {/* Reset */}
      <button
        onClick={async () => {
          if (confirm('确定要恢复所有设置为默认值吗？')) {
            await resetConfig();
            alert('已恢复默认设置');
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          boxShadow: 'none',
          transition: 'all 0.15s ease',
          marginBottom: '16px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        恢复默认设置
      </button>

    </div>
  );
}
