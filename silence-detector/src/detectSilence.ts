import { spawn } from "node:child_process";
import path from "node:path";
import { SilenceLogParser } from "./parseSilence.js";
import { processRanges } from "./processRanges.js";
import type { DetectionResult, DetectionSettings } from "./types.js";
import { assertReadableFile, round, verifyExecutable } from "./utils.js";

interface ProbeOutput {
  streams?: Array<{ codec_type?: string }>;
  format?: { duration?: string };
}

async function probeMedia(inputFile: string): Promise<number> {
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type",
      "-of", "json",
      inputFile,
    ], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`ffprobe failed with status ${code ?? "unknown"}: ${stderr.trim() || "no details"}`));
    });
  });

  let probe: ProbeOutput;
  try {
    probe = JSON.parse(output) as ProbeOutput;
  } catch {
    throw new Error("ffprobe returned invalid metadata.");
  }
  if (!probe.streams?.some((stream) => stream.codec_type === "audio")) {
    throw new Error("The media file has no audio stream.");
  }
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Could not determine the media duration.");
  }
  return duration;
}

async function runSilenceDetect(
  inputFile: string,
  settings: DetectionSettings,
  mediaDuration: number,
): Promise<ReturnType<SilenceLogParser["finish"]>> {
  const parser = new SilenceLogParser();
  await new Promise<void>((resolve, reject) => {
    const filter = `silencedetect=noise=${settings.thresholdDb}dB:d=${settings.minimumDurationSeconds}`;
    const child = spawn("ffmpeg", [
      "-hide_banner", "-nostats", "-i", inputFile, "-vn", "-af", filter, "-f", "null", "-",
    ], { windowsHide: true });
    let stderrTail = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      parser.push(chunk);
      stderrTail = (stderrTail + chunk).slice(-4000);
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else {
        const reason = signal ? `signal ${signal}` : `status ${code ?? "unknown"}`;
        reject(new Error(`FFmpeg failed with ${reason}: ${stderrTail.trim() || "no details"}`));
      }
    });
  });
  return parser.finish(mediaDuration);
}

export async function detectSilence(
  inputPath: string,
  settings: DetectionSettings,
): Promise<DetectionResult> {
  const inputFile = path.resolve(inputPath);
  await assertReadableFile(inputFile);
  await Promise.all([verifyExecutable("ffmpeg"), verifyExecutable("ffprobe")]);
  const mediaDuration = await probeMedia(inputFile);
  const rawRanges = await runSilenceDetect(inputFile, settings, mediaDuration);
  const removableRanges = processRanges(rawRanges, settings.paddingSeconds, mediaDuration);
  const rawSilenceDuration = round(rawRanges.reduce((sum, range) => sum + range.duration, 0));
  const removableDuration = round(removableRanges.reduce((sum, range) => sum + range.duration, 0));
  const estimatedFinalDuration = round(Math.max(0, mediaDuration - removableDuration));

  return {
    inputFile,
    mediaDuration: round(mediaDuration),
    settings,
    summary: {
      rawSilenceCount: rawRanges.length,
      removableRangeCount: removableRanges.length,
      rawSilenceDuration,
      removableDuration,
      estimatedFinalDuration,
      percentageRemoved: mediaDuration > 0 ? round((removableDuration / mediaDuration) * 100, 2) : 0,
    },
    rawRanges,
    removableRanges,
  };
}
