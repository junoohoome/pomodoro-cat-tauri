import type { TaskReportItem, DailyStats } from "../../types";

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
    const hours = mins > 0 ? (mins / 60).toFixed(1) : "0";

    const d = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let shortLabel: string;
    if (isWeekly) {
      if (d.getTime() === today.getTime()) shortLabel = "今天";
      else if (d.getTime() === yesterday.getTime()) shortLabel = "昨天";
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
      {/* 周期标题 */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>{title}</span>
        <span style={{ fontSize: "12px", color: "#999" }}>{dateRange}</span>
      </div>

      {/* 汇总卡片 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {count}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>番茄数</span>
        </div>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {minutes > 0 ? (minutes / 60).toFixed(1) + "h" : "0h"}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>专注时长</span>
        </div>
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
          border: "1px solid #FFECE0",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#FF6B6B", display: "block" }}>
            {streakDays}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>连续天数</span>
        </div>
      </div>

      {/* 任务完成概要 */}
      <div style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
        border: "1px solid #FFECE0",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>📋</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#2C2C2C" }}>任务完成情况</span>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
          <span style={{ color: "#4CAF50" }}>已完成 {completedTasks}</span>
          <span style={{ color: "#FF9800" }}>进行中 {incompleteTasks}</span>
        </div>
      </div>

      {/* 每日柱状图 */}
      <div className="card chart-section" style={{ padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <div style={{
            fontSize: "16px",
            marginRight: "6px",
            width: "24px",
            height: "24px",
            background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: "1",
          }}>
            📈
          </div>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
            {isWeekly ? "每日专注" : "本月每日专注"}
          </span>
        </div>

        <div style={{
          borderRadius: "8px",
          padding: "12px 4px 10px",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: "160px",
          }}>
            {chartData.map((data) => (
              <div key={data.date} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                padding: "0 1px",
              }}>
                <div style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: "100%",
                }}>
                  {data.mins > 0 && (
                    <div style={{
                      width: barWidth,
                      minHeight: "6px",
                      background: "linear-gradient(180deg, #FF6B6B 0%, #FFA94D 100%)",
                      borderRadius: isWeekly ? "6px 6px 0 0" : "3px 3px 0 0",
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      transition: "height 0.5s ease",
                      boxShadow: "0 2px 6px rgba(255, 107, 107, 0.25)",
                      height: `${Math.max(data.height, 6)}%`,
                    }}>
                      {isWeekly && (
                        <span style={{
                          position: "absolute",
                          top: "-14px",
                          fontSize: "11px",
                          color: "#FF6B6B",
                          fontWeight: "700",
                          textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
                        }}>
                          {data.hours}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {data.shortLabel && (
                  <span style={{
                    fontSize: isWeekly ? "10px" : "9px",
                    color: "#666",
                    marginTop: "8px",
                    fontWeight: "500",
                  }}>
                    {data.shortLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务投入明细 */}
      {taskBreakdown.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #FFECE0",
          marginTop: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <div style={{
              fontSize: "16px",
              marginRight: "6px",
              width: "24px",
              height: "24px",
              background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: "1",
            }}>
              🍅
            </div>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>任务投入明细</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {taskBreakdown.map((task) => (
              <div key={task.taskId} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#f8f8f8",
                borderRadius: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: task.isCompleted ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 152, 0, 0.1)",
                    color: task.isCompleted ? "#4CAF50" : "#FF9800",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}>
                    {task.isCompleted ? "已完成" : "进行中"}
                  </span>
                  <span style={{
                    fontSize: "13px",
                    color: "#2C2C2C",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {task.taskName}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexShrink: 0 }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {task.pomodoroCount} 番茄
                  </span>
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    {task.focusMinutes > 0 ? (task.focusMinutes / 60).toFixed(1) + "h" : "0h"}
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
