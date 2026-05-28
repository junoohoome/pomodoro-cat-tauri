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
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-gray">加载中...</span>
      </div>
    );
  }

  const currentCat = CAT_STAGES.find((s) => s.level === userData.level) || CAT_STAGES[0];
  const nextCat = CAT_STAGES.find((s) => s.level === userData.level + 1);

  // 计算进度百分比 - 基于猫咪罐头数量（range-based calculation，与小程序一致）
  let progressPercent = 100;
  if (nextCat) {
    const currentLevel = userData.level;
    // 计算当前等级的起始阈值（前一等级的 cansNeeded，level 1 为 0）
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
      {/* 猫咪展示区域 */}
      <div className="cat-showcase" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="cat-circle" style={{
          width: '160px',
          height: '160px',
          margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255, 107, 107, 0.2)',
          position: 'relative'
        }}>
          <span className="cat-emoji" style={{ fontSize: '90px', lineHeight: '1' }}>
            {CAT_ICONS[userData.level]}
          </span>
        </div>
        <span className="cat-name" style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#2C2C2C',
          display: 'block',
          marginBottom: '4px'
        }}>
          {currentCat.name}
        </span>
        <span className="cat-level" style={{
          fontSize: '14px',
          color: '#FF6B6B',
          fontWeight: '600',
          display: 'block'
        }}>
          Lv.{userData.level}
        </span>
      </div>

      {/* 猫咪罐头进度 */}
      <div className="card exp-section" style={{ marginBottom: '16px' }}>
        <div className="exp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="exp-title" style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: '600' }}>
            猫咪罐头进度
          </span>
          <span className="exp-value" style={{ fontSize: '12px', color: '#FF6B6B', fontWeight: '600' }}>
            {nextCat ? `${Math.round(progressPercent)}%` : 'MAX'}
          </span>
        </div>
        <div className="progress-bar" style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div className="progress-fill" style={{ height: '100%', background: 'linear-gradient(90deg, #FF6B6B 0%, #FFA94D 100%)', borderRadius: '4px', transition: 'width 0.5s ease', width: `${progressPercent}%` }} />
        </div>
        <span className="exp-hint" style={{ fontSize: '12px', color: '#999', display: 'block', textAlign: 'center' }}>
          {nextCat ? `再完成 ${nextCat.cansNeeded - userData.totalCans} 个猫咪罐头升级` : '已达到最高等级！'}
        </span>
      </div>

      {/* 成长路径 */}
      <div className="stages-section" style={{ marginBottom: '16px' }}>
        <div className="section-header" style={{ padding: '8px 0', marginBottom: '12px' }}>
          <span className="section-title" style={{ fontSize: '14px', fontWeight: '600', color: '#2C2C2C' }}>
            成长路径
          </span>
        </div>

        <div className="stages-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CAT_STAGES.map((item) => {
            const isUnlocked = item.level <= userData.level;
            const isCurrent = item.level === userData.level;
            return (
              <div
                key={item.level}
                className={`stage-item ${isUnlocked ? 'stage-unlocked' : 'stage-locked'} ${isCurrent ? 'stage-current' : ''}`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s ease',
                  ...(isCurrent ? { border: '1px solid #FF6B6B', background: 'rgba(255, 107, 107, 0.05)' } : {}),
                  ...(!isUnlocked ? { opacity: '0.6' } : {})
                }}
              >
                <div className="stage-icon" style={{
                  position: 'relative',
                  width: '44px',
                  height: '44px',
                  marginRight: '12px'
                }}>
                  <span className="stage-emoji" style={{ fontSize: '28px', lineHeight: '1' }}>
                    {isUnlocked ? CAT_ICONS[item.level] : ''}
                  </span>
                  {!isUnlocked && (
                    <span className="stage-lock" style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      fontSize: '16px'
                    }}>🔒</span>
                  )}
                </div>
                <div className="stage-info" style={{ flex: 1 }}>
                  <span className="stage-name" style={{ fontSize: '14px', fontWeight: '600', color: '#2C2C2C', display: 'block', marginBottom: '2px' }}>
                    {item.name}
                  </span>
                  <span className="stage-requirement" style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '1px' }}>
                    {item.desc}
                  </span>
                </div>
                {item.level < userData.level && (
                  <span className="stage-status" style={{ fontSize: '12px', color: '#51CF66', fontWeight: '600' }}>✓</span>
                )}
                {isCurrent && (
                  <span className="stage-status status-current" style={{ fontSize: '12px', color: '#FF6B6B', fontWeight: '600' }}>当前</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 成就说明 */}
      <div className="card tips-section" style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        padding: '16px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="tips-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <span className="tips-icon" style={{ fontSize: '18px', marginRight: '6px' }}>💡</span>
          <span className="tips-title" style={{ fontSize: '14px', fontWeight: '600', color: '#2C2C2C' }}>
            成长提示
          </span>
        </div>
        <div className="tips-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="tip-item" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span className="tip-bullet" style={{ fontSize: '16px', color: '#FF6B6B', marginRight: '6px', lineHeight: '1.5' }}>•</span>
            <span className="tip-text" style={{ flex: 1, fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
              完成一个完整番茄钟(25分钟)= 1个猫咪罐头
            </span>
          </div>
          <div className="tip-item" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span className="tip-bullet" style={{ fontSize: '16px', color: '#FF6B6B', marginRight: '6px', lineHeight: '1.5' }}>•</span>
            <span className="tip-text" style={{ flex: 1, fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
              中途放弃和休息时间不计入猫咪罐头
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
