/**
 * 将分钟数格式化为易读的时间字符串
 * 5 → "5min", 60 → "1h", 85 → "1h25min", 1440 → "1d", 1500 → "1d1h"
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 0) totalMinutes = 0;
  const days = Math.floor(totalMinutes / 1440);
  const remaining = totalMinutes % 1440;
  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;

  if (days > 0) {
    if (hours === 0 && mins === 0) return `${days}d`;
    if (mins === 0) return `${days}d${hours}h`;
    if (hours === 0) return `${days}d${mins}min`;
    return `${days}d${hours}h${mins}min`;
  }
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}min`;
}
