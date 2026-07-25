import type { SilenceRange } from "./types.js";
import { round } from "./utils.js";

const START_PATTERN = /silence_start:\s*(-?\d+(?:\.\d+)?)/;
const END_PATTERN = /silence_end:\s*(-?\d+(?:\.\d+)?)(?:\s*\|\s*silence_duration:\s*(\d+(?:\.\d+)?))?/;

export class SilenceLogParser {
  private buffer = "";
  private openStart: number | undefined;
  private readonly ranges: SilenceRange[] = [];

  push(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    for (const line of lines) this.parseLine(line);
  }

  finish(mediaDuration?: number): SilenceRange[] {
    if (this.buffer) {
      this.parseLine(this.buffer);
      this.buffer = "";
    }
    if (this.openStart !== undefined && mediaDuration !== undefined && mediaDuration >= this.openStart) {
      this.addRange(this.openStart, mediaDuration);
      this.openStart = undefined;
    }
    return this.ranges.map((range) => ({ ...range }));
  }

  private parseLine(line: string): void {
    const startMatch = START_PATTERN.exec(line);
    if (startMatch?.[1] !== undefined) {
      const start = Number(startMatch[1]);
      if (Number.isFinite(start) && start >= 0) this.openStart = start;
    }

    const endMatch = END_PATTERN.exec(line);
    if (endMatch?.[1] !== undefined && this.openStart !== undefined) {
      const end = Number(endMatch[1]);
      if (Number.isFinite(end) && end >= this.openStart) this.addRange(this.openStart, end);
      this.openStart = undefined;
    }
  }

  private addRange(start: number, end: number): void {
    this.ranges.push({
      start: round(start),
      end: round(end),
      duration: round(end - start),
    });
  }
}

export function parseSilenceLog(log: string, mediaDuration?: number): SilenceRange[] {
  const parser = new SilenceLogParser();
  parser.push(log);
  return parser.finish(mediaDuration);
}
