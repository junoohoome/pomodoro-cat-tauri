import { useEffect, useState } from "react";
import { useUserStore } from "../stores/userStore";
import ReportTab from "../components/stats/ReportTab";

type StatsTab = "overview" | "weekly" | "monthly";

export default function StatsPage() {
  const { stats, fetchStats } = useUserStore();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-gray">加载中...</span>
      </div>
    );
  }

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
  };

  // 生成周报的所有天（周一到周日）
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(stats.weekStartDate + "T00:00:00");
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // 生成月报的所有天
  const startDate = new Date(stats.monthStartDate + "T00:00:00");
  const endDate = new Date(stats.monthEndDate + "T00:00:00");
  const totalDays = endDate.getDate();
  const monthDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const renderOverview = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const chartData = last7Days.map((date) => {
      const found = stats.dailyData.find((d) => d.date === date);
      const minutes = found?.minutes || 0;
      const standardMinutes = 480;
      const heightPercent = (minutes / standardMinutes) * 100;
      const adjustedHeight = minutes > 0 ? Math.max(10, Math.min(100, heightPercent)) : 5;
      const hours = minutes > 0 ? (minutes / 60).toFixed(1) : "0";

      return {
        date,
        count: found?.count || 0,
        minutes,
        hours,
        height: adjustedHeight,
        shortLabel: (() => {
          const d = new Date(date);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (d.toDateString() === today.toDateString()) return "今天";
          if (d.toDateString() === yesterday.toDateString()) return "昨天";
          return `${d.getMonth() + 1}/${d.getDate()}`;
        })(),
      };
    });

    return (
      <>
        {/* 统计数据 */}
        <div className="total-section" style={{ marginBottom: "12px" }}>
          <div className="total-header" style={{ padding: "8px 0" }}>
            <span className="total-title" style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
              统计数据
            </span>
          </div>
          <div className="total-cards" style={{ display: "flex", gap: "8px" }}>
            <div className="total-card card" style={{
              flex: 1,
              background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
              borderRadius: "10px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
              border: "1px solid #FFECE0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <div className="total-icon-wrapper" style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}>
                <span className="total-icon" style={{ fontSize: "20px", lineHeight: "1" }}>📅</span>
              </div>
              <span className="total-label" style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px", fontWeight: "500" }}>
                今日专注
              </span>
              <span className="total-value" style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#FF6B6B",
                display: "block",
                marginBottom: "4px",
              }}>
                {stats.todayMinutes > 0 ? (stats.todayMinutes / 60).toFixed(1) + "h" : "0h"}
              </span>
              <div className="total-pomodoro" style={{
                display: "flex",
                alignItems: "baseline",
                gap: "3px",
                padding: "4px 8px",
                background: "rgba(255, 107, 107, 0.08)",
                borderRadius: "10px",
              }}>
                <span className="pomodoro-number" style={{ fontSize: "14px", fontWeight: "700", color: "#FF6B6B" }}>
                  {stats.todayCount}
                </span>
                <span className="pomodoro-unit" style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.85 }}>
                  个番茄钟
                </span>
              </div>
            </div>

            <div className="total-card card" style={{
              flex: 1,
              background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
              borderRadius: "10px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.12)",
              border: "1px solid #FFECE0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <div className="total-icon-wrapper" style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}>
                <span className="total-icon" style={{ fontSize: "20px", lineHeight: "1" }}>📊</span>
              </div>
              <span className="total-label" style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px", fontWeight: "500" }}>
                本周专注
              </span>
              <span className="total-value" style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#FF6B6B",
                display: "block",
              }}>
                {stats.weekMinutes > 0 ? (stats.weekMinutes / 60).toFixed(1) + "h" : "0h"}
              </span>
              <div className="total-pomodoro" style={{
                display: "flex",
                alignItems: "baseline",
                gap: "3px",
                padding: "4px 8px",
                background: "rgba(255, 107, 107, 0.08)",
                borderRadius: "10px",
              }}>
                <span className="pomodoro-number" style={{ fontSize: "14px", fontWeight: "700", color: "#FF6B6B" }}>
                  {stats.weekCount}
                </span>
                <span className="pomodoro-unit" style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.85 }}>
                  个番茄钟
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 历史柱状图 */}
        <div className="card chart-section" style={{ padding: "14px" }}>
          <div className="section-header" style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
            <div className="section-icon" style={{
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
            <span className="section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
              最近7天
            </span>
          </div>

          <div className="chart-container" style={{
            borderRadius: "8px",
            padding: "12px 4px 10px",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
          }}>
            <div className="chart-bars" style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: "160px",
            }}>
              {chartData.map((data) => (
                <div key={data.date} className="chart-bar-item" style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  padding: "0 2px",
                }}>
                  <div className="bar-wrapper" style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    height: "100%",
                  }}>
                    {data.minutes > 0 && (
                      <div className="bar-fill" style={{
                        width: "26px",
                        minHeight: "6px",
                        background: "linear-gradient(180deg, #FF6B6B 0%, #FFA94D 100%)",
                        borderRadius: "6px 6px 0 0",
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        transition: "height 0.5s ease",
                        boxShadow: "0 2px 6px rgba(255, 107, 107, 0.25)",
                        height: `${Math.max(data.height, 6)}%`,
                      }}>
                        <span className="bar-value" style={{
                          position: "absolute",
                          top: "-14px",
                          fontSize: "11px",
                          color: "#FF6B6B",
                          fontWeight: "700",
                          textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
                        }}>
                          {data.hours}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="bar-label" style={{ fontSize: "10px", color: "#666", marginTop: "8px", fontWeight: "500" }}>
                    {data.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 总计统计 */}
        <div className="card" style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #FFECE0",
          marginBottom: "12px",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C", marginBottom: "12px" }}>
            总统计数据
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f8f8f8", borderRadius: "6px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px" }}>🍅</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>总番茄数</p>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>{stats.totalCount}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f8f8f8", borderRadius: "6px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #FFE5E5 0%, #FFF0E5 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px" }}>⏱</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>总专注时长</p>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#2C2C2C" }}>
                  {stats.totalMinutes > 0 ? (stats.totalMinutes / 60).toFixed(1) + "h" : "0h"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const tabs: { key: StatsTab; label: string }[] = [
    { key: "overview", label: "概览" },
    { key: "weekly", label: "周报" },
    { key: "monthly", label: "月报" },
  ];

  return (
    <div>
      {/* Tab 切换栏 */}
      <div style={{
        display: "flex",
        background: "#f5f5f5",
        borderRadius: "10px",
        padding: "3px",
        marginBottom: "14px",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? "600" : "400",
              color: activeTab === tab.key ? "#FF6B6B" : "#999",
              background: activeTab === tab.key ? "#fff" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderOverview()}

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
