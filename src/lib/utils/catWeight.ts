import type { WeightState } from "../../types";

export function getWeightState(weight: number): WeightState {
  if (weight < 2.0) return { label: "骨感", icon: "🦴", mood: "不开心", color: "#FFB6C1" };
  if (weight < 4.0) return { label: "苗条", icon: "🐱", mood: "平静", color: "#98FB98" };
  if (weight < 6.0) return { label: "标准", icon: "😻", mood: "最开心", color: "#4CAF50" };
  if (weight < 8.0) return { label: "微胖", icon: "😺", mood: "满足", color: "#FFA500" };
  if (weight < 9.5) return { label: "胖胖", icon: "🤰", mood: "犯困", color: "#FF6347" };
  return { label: "圆滚滚", icon: "🎱", mood: "懒洋洋", color: "#FF4500" };
}
