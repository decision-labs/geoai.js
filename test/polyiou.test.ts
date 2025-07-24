import { describe, expect, it } from "vitest";
import { iouPoly } from "../src/utils/gghl/polyiou";

describe("iouPoly", () => {
  it("should return correct IoU for two identical squares", () => {
    const p = [0, 0, 1, 0, 1, 1, 0, 1];
    const q = [0, 0, 1, 0, 1, 1, 0, 1];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(1.0, 5);
  });

  it("should return correct IoU for two non-overlapping squares", () => {
    const p = [0, 0, 1, 0, 1, 1, 0, 1];
    const q = [2, 2, 3, 2, 3, 3, 2, 3];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(0.0, 5);
  });

  it("should return correct IoU for two partially overlapping squares", () => {
    const p = [0, 0, 2, 0, 2, 2, 0, 2];
    const q = [1, 1, 3, 1, 3, 3, 1, 3];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(1 / 7, 5);
  });
});
