import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { detectSilence } from "./detectSilence.js";
import type { DetectionResult, FolderFailure, FolderReport } from "./types.js";
import {
  SUPPORTED_EXTENSIONS, errorMessage, parseArguments, round, writeJson,
} from "./utils.js";

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2), false);
  const inputFolder = path.resolve(args.input);
  let folderStats;
  try {
    folderStats = await stat(inputFolder);
  } catch {
    throw new Error(`Input folder does not exist or is not readable: ${inputFolder}`);
  }
  if (!folderStats.isDirectory()) throw new Error(`Input path is not a folder: ${inputFolder}`);

  const files = (await readdir(inputFolder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(inputFolder, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const results: DetectionResult[] = [];
  const failures: FolderFailure[] = [];
  const rows: Array<Record<string, string>> = [];
  for (const file of files) {
    try {
      const result = await detectSilence(file, {
        thresholdDb: args.thresholdDb,
        minimumDurationSeconds: args.minimumDurationSeconds,
        paddingSeconds: args.paddingSeconds,
      });
      results.push(result);
      rows.push({
        File: path.basename(file),
        Duration: `${result.mediaDuration.toFixed(2)}s`,
        Silences: String(result.summary.rawSilenceCount),
        Removable: String(result.summary.removableRangeCount),
        "Time Removed": `${result.summary.removableDuration.toFixed(2)}s`,
        Status: "Success",
      });
    } catch (error: unknown) {
      const message = errorMessage(error);
      failures.push({ inputFile: file, error: message });
      rows.push({
        File: path.basename(file), Duration: "-", Silences: "-", Removable: "-",
        "Time Removed": "-", Status: "Failed",
      });
      console.error(`${path.basename(file)}: ${message}`);
    }
  }

  console.table(rows);
  const report: FolderReport = {
    inputFolder,
    generatedAt: new Date().toISOString(),
    successfulFiles: results.length,
    failedFiles: failures.length,
    totals: {
      durationAnalyzed: round(results.reduce((sum, item) => sum + item.mediaDuration, 0)),
      silenceSectionsDetected: results.reduce((sum, item) => sum + item.summary.rawSilenceCount, 0),
      rawSilenceDuration: round(results.reduce((sum, item) => sum + item.summary.rawSilenceDuration, 0)),
      removableDuration: round(results.reduce((sum, item) => sum + item.summary.removableDuration, 0)),
    },
    results,
    failures,
  };
  const outputFile = path.resolve("output", "folder-report.json");
  await writeJson(outputFile, report);
  console.log(`Report: ${path.relative(process.cwd(), outputFile)}`);
  if (files.length === 0) console.log("No supported media files were found.");
}

main().catch((error: unknown) => {
  console.error(`Error: ${errorMessage(error)}`);
  process.exitCode = 1;
});
