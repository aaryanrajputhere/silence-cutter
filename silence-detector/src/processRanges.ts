import type { SilenceRange } from "./types.js";
import { round } from "./utils.js";

export function processRanges(
  rawRanges: SilenceRange[],
  paddingSeconds: number,
  mediaDuration: number,
): SilenceRange[] {
  if (!Number.isFinite(paddingSeconds) || paddingSeconds < 0) {
    throw new Error("Padding must be a finite number that is 0 or greater.");
  }
  if (!Number.isFinite(mediaDuration) || mediaDuration < 0) {
    throw new Error("Media duration must be a finite number that is 0 or greater.");
  }

  return rawRanges.flatMap((range) => {
    const start = round(Math.max(0, Math.min(mediaDuration, range.start + paddingSeconds)));
    const end = round(Math.max(0, Math.min(mediaDuration, range.end - paddingSeconds)));
    if (end <= start) return [];
    return [{ start, end, duration: round(end - start) }];
  });
}
