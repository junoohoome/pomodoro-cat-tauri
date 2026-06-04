import type { TaskReportItem, DailyStats } from "../../types";
import { formatDuration } from "../../lib/utils/format";

interface ReportTabProps {
  title: string;
  dateRange: string;
  count: number;
  minutes: number;
  streakDays: number;
  completedTasks: number;
  incompleteTasks: number;
  taskBreakdown: TaskReportItem[];
  dailyData: DailyStats[];
  allDays: string[];
}

export default function ReportTab({
  title,
  dateRange,
  count,
  minutes,
  streakDays,
  completedTasks,
  incompleteTasks,
  taskBreakdown,
  dailyData,
  allDays,
}: ReportTabProps) {
  const isWeekly = allDays.length <= 7;
  const barWidth = isWeekly ? "26px" : "8px";

  const chartData = allDays.map((date) => {
    const found = dailyData.find((d) => d.date === date);
    const mins = found?.minutes || 0;
    const standardMinutes = 480;
    const heightPercent = (mins / standardMinutes) * 100;
    const adjustedHeight = mins > 0 ? Math.max(10, Math.min(100, heightPercent)) : 5;
    const hours = mins > 0 ? formatDuration(mins) : "0";

    const d = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let shortLabel: string;
    if (isWeekly) {
      if (d.toDateString() === today.toDateString()) shortLabel = "今天";
      else if (d.toDateString() === yesterday.toDateString()) shortLabel = "昨天";
      else shortLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      const day = d.getDate();
      const lastDay = allDays.length;
      if (day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 25 || day === lastDay) {
        shortLabel = `${day}`;
      } else {
        shortLabel = "";
      }
    }

    return { date, mins, hours, height: adjustedHeight, shortLabel };
  });

  return (
    <div>
      {/* Period title */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{dateRange}</span>
      </div>

      {/* Summary cards */}
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
          <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--accent-color)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
            {minutes > 0 ? formatDuration(minutes) : "0min"}
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
            {count}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>专注次数</span>
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
            {streakDays}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>连续天数</span>
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
          <span style={{ color: 'var(--success-color)' }}>已完成 {completedTasks}</span>
          <span style={{ color: 'var(--warning-color)' }}>进行中 {incompleteTasks}</span>
        </div>
      </div>

      {/* Daily bar chart */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: 'none',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {isWeekly ? "每日专注" : "本月每日专注"}
          </span>
        </div>

        <div style={{
          borderRadius: 'var(--radius-sm)',
          padding: '12px 4px 10px',
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border-subtle)',
        }}>
          {/* Bar area */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            height: isWeekly ? '148px' : '130px',
          }}>
            {chartData.map((data) => (
              <div key={data.date} style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                height: '100%',
                padding: '0 1px',
              }}>
                {data.mins > 0 && (
                  <div style={{
                    width: barWidth,
                    minHeight: '6px',
                    background: 'var(--accent-color)',
                    borderRadius: isWeekly ? '4px 4px 0 0' : '2px 2px 0 0',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    transition: 'height 0.5s ease',
                    height: `${Math.max(data.height, 6)}%`,
                  }}>
                    {(isWeekly || data.mins > 0) && (
                      <span style={{
                        position: 'absolute',
                        top: isWeekly ? '-14px' : '-12px',
                        fontSize: isWeekly ? '10px' : '8px',
                        color: 'var(--text-secondary)',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}>
                        {data.hours}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Label area — separate row with same flex columns guarantees alignment */}
          <div style={{
            display: 'flex',
            marginTop: '8px',
          }}>
            {chartData.map((data) => (
              <div key={data.date} style={{
                flex: 1,
                textAlign: 'center',
                padding: '0 1px',
                height: isWeekly ? '14px' : '12px',
                lineHeight: isWeekly ? '14px' : '12px',
              }}>
                {data.shortLabel && (
                  <span style={{
                    fontSize: isWeekly ? '10px' : '9px',
                    color: 'var(--text-tertiary)',
                    fontWeight: '400',
                  }}>
                    {data.shortLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task breakdown */}
      {taskBreakdown.length > 0 && (
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'none',
          marginTop: '12px',
        }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>任务投入明细</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {taskBreakdown.map((task) => (
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
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {task.focusMinutes > 0 ? formatDuration(task.focusMinutes) : "0min"}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {task.sessionCount}次
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
