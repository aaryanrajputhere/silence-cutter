import { describe, expect, it } from "vitest";
import { processRanges } from "../src/processRanges.js";

describe("processRanges", () => {
  it("applies padding to both ends", () => {
    expect(processRanges([{ start: 5, end: 6, duration: 1 }], 0.08, 10))
      .toEqual([{ start: 5.08, end: 5.92, duration: 0.84 }]);
  });

  it("discards ranges consumed by padding", () => {
    expect(processRanges([{ start: 2, end: 2.1, duration: 0.1 }], 0.1, 10)).toEqual([]);
  });

  it("clamps timestamps to media bounds", () => {
    expect(processRanges([{ start: -1, end: 11, duration: 12 }], 0, 10))
      .toEqual([{ start: 0, end: 10, duration: 10 }]);
  });
});
