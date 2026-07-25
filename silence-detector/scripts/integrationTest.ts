import { spawn } from "node:child_process";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { detectSilence } from "../src/detectSilence.js";
import { verifyExecutable, writeJson } from "../src/utils.js";

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code ?? "unknown"}: ${stderr.trim()}`));
    });
  });
}

async function main(): Promise<void> {
  await verifyExecutable("ffmpeg");
  const mediaFile = path.resolve("test-media", "synthetic-silence.wav");
  await mkdir(path.dirname(mediaFile), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=2",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=3",
    "-filter_complex", "[0:a][1:a][2:a][3:a]concat=n=4:v=0:a=1[out]",
    "-map", "[out]", "-c:a", "pcm_s16le", mediaFile,
  ]);

  const result = await detectSilence(mediaFile, {
    thresholdDb: -35,
    minimumDurationSeconds: 0.5,
    paddingSeconds: 0,
  });
  const expected = [[2, 4], [7, 10]] as const;
  if (result.rawRanges.length !== expected.length) {
    throw new Error(`Expected 2 ranges, received ${JSON.stringify(result.rawRanges)}`);
  }
  const tolerance = 0.08;
  expected.forEach(([start, end], index) => {
    const actual = result.rawRanges[index];
    if (!actual || Math.abs(actual.start - start) > tolerance || Math.abs(actual.end - end) > tolerance) {
      throw new Error(`Range ${index + 1} is outside tolerance: ${JSON.stringify(actual)}`);
    }
  });
  const outputFile = path.resolve("output", "synthetic-silence.json");
  await writeJson(outputFile, result);
  console.log(`Integration test passed. JSON: ${outputFile}`);
  console.log(JSON.stringify(result.rawRanges, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
