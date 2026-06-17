import { useEffect, useState } from "react";
import { useUserStore } from "../stores/userStore";
import CodexCat from "../pet/components/CodexCat";
import { getWeightState } from "../lib/utils/catWeight";

// SVG Icons
const StarIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CanIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const ClockIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronDownIcon = ({ size = 12, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr.replace(" ", "T"));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}

export default function CatPage() {
  const { catState, fetchCatState, feedCat } = useUserStore();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchCatState();
  }, [fetchCatState]);

  if (!catState) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>加载中...</span>
      </div>
    );
  }

  const weightState = getWeightState(catState.weight);
  const weightPercent = ((catState.weight - 1) / 9) * 100;
  const canFeed = catState.foodInventory > 0 && catState.weight < 10.0;
  const isBest = catState.weight >= 4.0 && catState.weight < 6.0;

  const handleFeed = async () => {
    if (!canFeed) return;
    try {
      await feedCat();
    } catch {
      // Error handled in store
    }
  };

  return (
    <div>
      {/* Cat showcase */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '142px',
          height: '142px',
          margin: '0 auto 12px',
          background: 'var(--surface-secondary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isBest ? '2px solid #4CAF50' : '1px solid var(--border-color)',
          boxShadow: isBest ? '0 0 12px rgba(76,175,80,0.15)' : 'none',
        }}>
          <CodexCat mood="idle" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: weightState.color,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '15px',
            fontWeight: '600',
            color: weightState.color,
          }}>
            {weightState.label}
          </span>
          {isBest && <StarIcon size={14} color="#4CAF50" />}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          心情: {weightState.mood}
        </span>
      </div>

      {/* Weight progress */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>
            猫咪重量
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
            {catState.weight.toFixed(1)} kg
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: '6px' }}>
          <div className="progress-fill" style={{ width: `${weightPercent}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>1 kg</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>10 kg</span>
        </div>
      </div>

      {/* Feeding info */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            喂养信息
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CanIcon size={14} color="var(--text-tertiary)" /> 罐头库存
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
              {catState.foodInventory} 个
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              今日已获
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
              {catState.foodEarnedToday}/3
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClockIcon size={14} color="var(--text-tertiary)" /> 上次喂食
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              {formatTimeAgo(catState.lastFedAt)}
            </span>
          </div>
        </div>
        <button
          onClick={handleFeed}
          disabled={!canFeed}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: canFeed ? 'pointer' : 'not-allowed',
            background: canFeed ? 'var(--accent-color)' : 'var(--surface-secondary)',
            color: canFeed ? 'white' : 'var(--text-tertiary)',
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {catState.weight >= 10.0
            ? "吃不下了喵..."
            : catState.foodInventory <= 0
              ? "没有罐头了喵..."
              : (<><CanIcon size={15} color="white" /> 喂食 ×1</>)}
        </button>
      </div>

      {/* Feeding guide (collapsible) */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}
        >
          <span>喂养指南</span>
          <span style={{ transform: showGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
            <ChevronDownIcon size={14} color="var(--text-tertiary)" />
          </span>
        </button>
        {showGuide && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6' }}>•</span>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                完成一次专注 → 获得 1 个罐头
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6' }}>•</span>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                点击桌面猫咪或此页按钮喂食
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6' }}>•</span>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                猫咪每天消耗约 0.3kg，需要持续喂养
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <StarIcon size={12} color="#4CAF50" />
              </span>
              <span style={{ flex: 1, fontSize: '12px', color: '#4CAF50', lineHeight: '1.6', fontWeight: '500' }}>
                保持在 4-6kg 是最佳状态
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
