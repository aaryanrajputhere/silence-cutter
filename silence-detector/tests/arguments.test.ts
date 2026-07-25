import { describe, expect, it } from "vitest";
import { parseArguments } from "../src/utils.js";

describe("parseArguments", () => {
  it("rejects invalid CLI settings", () => {
    expect(() => parseArguments(["--input", "a.wav", "--threshold", "0"])).toThrow();
    expect(() => parseArguments(["--input", "a.wav", "--minimum-duration", "-1"])).toThrow();
    expect(() => parseArguments(["--input", "a.wav", "--padding", "-0.1"])).toThrow();
    expect(() => parseArguments(["--input", "a.wav", "--padding", "NaN"])).toThrow();
  });

  it("accepts valid settings and paths with spaces", () => {
    expect(parseArguments(["--input", "media/my file.wav"])).toMatchObject({
      input: "media/my file.wav",
      thresholdDb: -35,
      minimumDurationSeconds: 0.5,
      paddingSeconds: 0.08,
    });
  });
});
