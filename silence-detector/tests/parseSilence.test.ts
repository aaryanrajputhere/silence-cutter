import { describe, expect, it } from "vitest";
import { SilenceLogParser, parseSilenceLog } from "../src/parseSilence.js";

describe("parseSilenceLog", () => {
  it("parses one complete silence range", () => {
    expect(parseSilenceLog(`
[silencedetect @ 0x123] silence_start: 4.231
[silencedetect @ 0x123] silence_end: 5.024 | silence_duration: 0.793
`)).toEqual([{ start: 4.231, end: 5.024, duration: 0.793 }]);
  });

  it("parses multiple silence ranges", () => {
    const log = [
      "silence_start: 1",
      "silence_end: 2.5 | silence_duration: 1.5",
      "silence_start: 8.25",
      "silence_end: 9 | silence_duration: 0.75",
    ].join("\n");
    expect(parseSilenceLog(log)).toEqual([
      { start: 1, end: 2.5, duration: 1.5 },
      { start: 8.25, end: 9, duration: 0.75 },
    ]);
  });

  it("handles silence beginning at zero", () => {
    expect(parseSilenceLog("silence_start: 0\nsilence_end: 1.2\n"))
      .toEqual([{ start: 0, end: 1.2, duration: 1.2 }]);
  });

  it("closes an open silence at the media end", () => {
    expect(parseSilenceLog("silence_start: 7\n", 10))
      .toEqual([{ start: 7, end: 10, duration: 3 }]);
  });

  it("ignores malformed output and unmatched end events", () => {
    const log = "silence_start: nope\nsilence_end: 2\nrandom output\n";
    expect(parseSilenceLog(log, 10)).toEqual([]);
  });

  it("returns an empty array when no silence is detected", () => {
    expect(parseSilenceLog("frame=10 fps=25\n")).toEqual([]);
  });

  it("reassembles lines split across stderr chunks", () => {
    const parser = new SilenceLogParser();
    parser.push("[silencedetect] silence_sta");
    parser.push("rt: 2.0\n[silencedetect] silence_end: ");
    parser.push("4.0 | silence_duration: 2.0\n");
    expect(parser.finish(10)).toEqual([{ start: 2, end: 4, duration: 2 }]);
  });
});
