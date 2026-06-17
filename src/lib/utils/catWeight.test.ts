import { describe, it, expect } from "vitest";
import { getWeightState } from "./catWeight";

describe("getWeightState", () => {
  const cases: Array<[number, string]> = [
    [1.9, "骨感"],
    [2.0, "苗条"],
    [3.9, "苗条"],
    [4.0, "标准"],
    [5.9, "标准"],
    [6.0, "微胖"],
    [7.9, "微胖"],
    [8.0, "胖胖"],
    [9.4, "胖胖"],
    [9.5, "圆滚滚"],
    [15.0, "圆滚滚"],
  ];

  for (const [weight, expectedLabel] of cases) {
    it(`体重 ${weight} → ${expectedLabel}`, () => {
      expect(getWeightState(weight).label).toBe(expectedLabel);
    });
  }

  it("标准区间 4≤w<6 心情为最开心", () => {
    expect(getWeightState(5.0).mood).toBe("最开心");
  });
});
