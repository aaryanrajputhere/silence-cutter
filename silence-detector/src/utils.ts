import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export const SUPPORTED_EXTENSIONS = new Set([
  ".mp3", ".wav", ".m4a", ".aac", ".flac", ".mp4", ".mov", ".mkv", ".webm",
]);

export function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function assertReadableFile(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`Input file does not exist or is not readable: ${filePath}`);
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function verifyExecutable(command: "ffmpeg" | "ffprobe"): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["-version"], { stdio: "ignore", windowsHide: true });
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new Error(
          `${command} was not found. Install FFmpeg and ensure both ffmpeg and ffprobe are on PATH. ` +
          "See the README installation instructions.",
        ));
      } else {
        reject(new Error(`Unable to run ${command}: ${error.message}`));
      }
    });
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} availability check exited with status ${code ?? "unknown"}.`));
    });
  });
}

export interface ParsedArguments {
  input: string;
  thresholdDb: number;
  minimumDurationSeconds: number;
  paddingSeconds: number;
  output?: string;
}

function numericOption(raw: string | undefined, name: string): number {
  if (raw === undefined || raw.trim() === "") throw new Error(`${name} requires a numeric value.`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  return value;
}

export function parseArguments(argv: string[], allowOutput = true): ParsedArguments {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--input", "--threshold", "--minimum-duration", "--padding",
    ...(allowOutput ? ["--output"] : []),
  ]);

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !allowed.has(key)) throw new Error(`Unknown argument: ${key ?? "(empty)"}`);
    if (value === undefined || value.startsWith("--")) throw new Error(`${key} requires a value.`);
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    values.set(key, value);
  }

  const input = values.get("--input");
  if (!input) throw new Error("Missing required argument: --input <path>");
  const thresholdDb = values.has("--threshold")
    ? numericOption(values.get("--threshold"), "--threshold")
    : -35;
  const minimumDurationSeconds = values.has("--minimum-duration")
    ? numericOption(values.get("--minimum-duration"), "--minimum-duration")
    : 0.5;
  const paddingSeconds = values.has("--padding")
    ? numericOption(values.get("--padding"), "--padding")
    : 0.08;

  if (thresholdDb >= 0) throw new Error("--threshold must be less than 0 dB.");
  if (minimumDurationSeconds <= 0) throw new Error("--minimum-duration must be greater than 0.");
  if (paddingSeconds < 0) throw new Error("--padding must be 0 or greater.");

  const parsed: ParsedArguments = {
    input,
    thresholdDb,
    minimumDurationSeconds,
    paddingSeconds,
  };
  const output = values.get("--output");
  if (output !== undefined) parsed.output = output;
  return parsed;
}
