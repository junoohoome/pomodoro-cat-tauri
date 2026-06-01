import { useEffect } from "react";
import { useUserStore } from "../stores/userStore";

const CAT_ICONS: Record<number, string> = {
  1: "🐱",
  2: "😿",
  3: "😸",
  4: "🙀",
  5: "😾",
};

const CAT_STAGES = [
  { level: 1, name: "猫Baby", cansNeeded: 10, desc: "刚出生的小猫，睁着大眼睛" },
  { level: 2, name: "幼猫", cansNeeded: 30, desc: "活泼好动，开始探索世界" },
  { level: 3, name: "成年猫", cansNeeded: 60, desc: "优雅成熟，专注沉稳" },
  { level: 4, name: "学者猫", cansNeeded: 100, desc: "勤奋学习，积累知识" },
  { level: 5, name: "博士猫", cansNeeded: 1000, desc: "学业有成，满腹经纶" },
];

export default function CatPage() {
  const { userData, stats, fetchUserData } = useUserStore();

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (!userData || !stats) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>加载中...</span>
      </div>
    );
  }

  const currentCat = CAT_STAGES.find((s) => s.level === userData.level) || CAT_STAGES[0];
  const nextCat = CAT_STAGES.find((s) => s.level === userData.level + 1);

  let progressPercent = 100;
  if (nextCat) {
    const currentLevel = userData.level;
    const prevLevelThreshold = currentLevel === 1 ? 0 : CAT_STAGES.find((s) => s.level === currentLevel - 1)!.cansNeeded;
    const nextLevelThreshold = nextCat.cansNeeded;
    const range = nextLevelThreshold - prevLevelThreshold;
    const currentInRange = userData.totalCans - prevLevelThreshold;

    if (range > 0) {
      progressPercent = (currentInRange / range) * 100;
    }
    progressPercent = Math.min(Math.max(progressPercent, 0), 100);
  }

  return (
    <div>
      {/* Cat showcase */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '140px',
          height: '140px',
          margin: '0 auto 16px',
          background: 'var(--surface-secondary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)',
        }}>
          <span style={{ fontSize: '80px', lineHeight: '1' }}>
            {CAT_ICONS[userData.level]}
          </span>
        </div>
        <span style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          display: 'block',
          marginBottom: '4px'
        }}>
          {currentCat.name}
        </span>
        <span style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontWeight: '400',
        }}>
          Lv.{userData.level}
        </span>
      </div>

      {/* Progress section */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>
            猫咪罐头进度
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
            {nextCat ? `${Math.round(progressPercent)}%` : 'MAX'}
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: '8px' }}>
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', textAlign: 'center' }}>
          {nextCat ? `再完成 ${nextCat.cansNeeded - userData.totalCans} 个猫咪罐头升级` : '已达到最高等级！'}
        </span>
      </div>

      {/* Growth stages */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ padding: '0 0 8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            成长路径
          </span>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}>
          {CAT_STAGES.map((item, index) => {
            const isUnlocked = item.level <= userData.level;
            const isCurrent = item.level === userData.level;
            return (
              <div
                key={item.level}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: index < CAT_STAGES.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  background: isCurrent ? 'var(--accent-light)' : 'transparent',
                  opacity: !isUnlocked ? 0.5 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isUnlocked ? (
                    <span style={{ fontSize: '24px', lineHeight: '1' }}>{CAT_ICONS[item.level]}</span>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '1px' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block' }}>
                    {item.desc}
                  </span>
                </div>
                {item.level < userData.level && (
                  <span style={{ fontSize: '13px', color: 'var(--success-color)', fontWeight: '500' }}>✓</span>
                )}
                {isCurrent && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--accent-color)',
                    fontWeight: '500',
                    background: 'var(--accent-light)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>当前</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            成长提示
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6' }}>•</span>
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              完成一个完整番茄钟(25分钟)= 1个猫咪罐头
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginRight: '8px', lineHeight: '1.6' }}>•</span>
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              中途放弃和休息时间不计入猫咪罐头
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
