import { useEffect, useState } from "react";
import { useUserStore } from "../stores/userStore";
import ReportTab from "../components/stats/ReportTab";
import type { TaskReportItem, HourlySegment } from "../types";

type StatsTab = "overview" | "weekly" | "monthly";

export default function StatsPage() {
  const { stats, fetchStats } = useUserStore();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>加载中...</span>
      </div>
    );
  }

  // 格式化本地日期为 YYYY-MM-DD，避免 toISOString() 的 UTC 时区偏移
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(stats.weekStartDate + "T00:00:00");
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return formatLocalDate(d);
  });

  const startDate = new Date(stats.monthStartDate + "T00:00:00");
  const endDate = new Date(stats.monthEndDate + "T00:00:00");
  const totalDays = endDate.getDate();
  const monthDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return formatLocalDate(d);
  });

  const renderToday = () => {
    const today = new Date();
    const todayLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

    // Calculate max minutes for hourly chart scale
    const maxMinutes = Math.max(...stats.todayHourlyData.map((s: HourlySegment) => s.minutes), 1);

    return (
      <div>
        {/* Title */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>今日报告</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{todayLabel}</span>
        </div>

        {/* Summary cards — same 3-card layout as ReportTab */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            flex: 1,
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'none',
          }}>
            <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {stats.todayCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>番茄数</span>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'none',
          }}>
            <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {stats.todayMinutes > 0 ? (stats.todayMinutes / 60).toFixed(1) + "h" : "0h"}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>专注时长</span>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'none',
          }}>
            <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {stats.todayCount}/{stats.dailyGoal}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>今日目标</span>
          </div>
        </div>

        {/* Task completion overview */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>任务完成情况</span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ color: 'var(--success-color)' }}>已完成 {stats.todayCompletedTasks}</span>
            <span style={{ color: 'var(--warning-color)' }}>进行中 {stats.todayIncompleteTasks}</span>
          </div>
        </div>

        {/* Hourly bar chart — morning / afternoon / evening / night */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
          marginBottom: '12px',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              今日时段分布
            </span>
          </div>

          <div style={{
            borderRadius: 'var(--radius-sm)',
            padding: '12px 4px 10px',
            background: 'var(--surface-secondary)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '140px',
            }}>
              {stats.todayHourlyData.map((seg: HourlySegment) => {
                const heightPercent = seg.minutes > 0 ? Math.max(15, (seg.minutes / maxMinutes) * 100) : 5;
                return (
                  <div key={seg.startHour} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    padding: '0 8px',
                  }}>
                    <div style={{
                      flex: 1,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      height: '100%',
                    }}>
                      {seg.minutes > 0 && (
                        <div style={{
                          width: '40px',
                          minHeight: '6px',
                          background: 'var(--accent-color)',
                          borderRadius: '4px 4px 0 0',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          transition: 'height 0.5s ease',
                          height: `${heightPercent}%`,
                        }}>
                          <span style={{
                            position: 'absolute',
                            top: '-16px',
                            fontSize: '10px',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {seg.minutes > 0 ? (seg.minutes / 60).toFixed(1) + "h" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', fontWeight: '400' }}>
                      {seg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task breakdown */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
        }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>任务投入明细</span>
          </div>

          {stats.todayTaskBreakdown.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '16px 0',
              color: 'var(--text-tertiary)',
              fontSize: '13px',
            }}>
              今天还没有专注记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.todayTaskBreakdown.map((task: TaskReportItem) => (
                <div key={task.taskId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'var(--surface-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: task.isCompleted ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 149, 0, 0.08)',
                      color: task.isCompleted ? 'var(--success-color)' : 'var(--warning-color)',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.isCompleted ? "已完成" : "进行中"}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.taskName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {task.pomodoroCount} 番茄
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                      {task.focusMinutes > 0 ? (task.focusMinutes / 60).toFixed(1) + "h" : "0h"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabs: { key: StatsTab; label: string }[] = [
    { key: "overview", label: "今日" },
    { key: "weekly", label: "周报" },
    { key: "monthly", label: "月报" },
  ];

  return (
    <div>
      {/* Segmented control */}
      <div style={{
        display: 'flex',
        background: 'var(--surface-secondary)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px',
        marginBottom: '16px',
        border: '1px solid var(--border-color)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              borderRadius: '5px',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? '500' : '400',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: activeTab === tab.key ? 'var(--card-bg)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderToday()}

      {activeTab === "weekly" && (
        <ReportTab
          title="本周报告"
          dateRange={formatDateRange(stats.weekStartDate, stats.weekEndDate)}
          count={stats.weekCount}
          minutes={stats.weekMinutes}
          streakDays={stats.weekStreakDays}
          completedTasks={stats.weekCompletedTasks}
          incompleteTasks={stats.weekIncompleteTasks}
          taskBreakdown={stats.weekTaskBreakdown}
          dailyData={stats.weekDailyData}
          allDays={weekDays}
        />
      )}

      {activeTab === "monthly" && (
        <ReportTab
          title="本月报告"
          dateRange={formatDateRange(stats.monthStartDate, stats.monthEndDate)}
          count={stats.monthCount}
          minutes={stats.monthMinutes}
          streakDays={stats.monthStreakDays}
          completedTasks={stats.monthCompletedTasks}
          incompleteTasks={stats.monthIncompleteTasks}
          taskBreakdown={stats.monthTaskBreakdown}
          dailyData={stats.monthDailyData}
          allDays={monthDays}
        />
      )}
    </div>
  );
}
