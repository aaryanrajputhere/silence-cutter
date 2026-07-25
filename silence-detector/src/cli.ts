import path from "node:path";
import { detectSilence } from "./detectSilence.js";
import { errorMessage, parseArguments, writeJson } from "./utils.js";

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const result = await detectSilence(args.input, {
    thresholdDb: args.thresholdDb,
    minimumDurationSeconds: args.minimumDurationSeconds,
    paddingSeconds: args.paddingSeconds,
  });
  const defaultName = `${path.parse(result.inputFile).name}.json`;
  const outputFile = path.resolve(args.output ?? path.join("output", defaultName));
  await writeJson(outputFile, result);

  console.log(`File: ${path.basename(result.inputFile)}`);
  console.log(`Duration: ${result.mediaDuration.toFixed(3)} seconds`);
  console.log(`Detected silent sections: ${result.summary.rawSilenceCount}`);
  console.log(`Removable sections: ${result.summary.removableRangeCount}`);
  console.log(`Removable duration: ${result.summary.removableDuration.toFixed(3)} seconds`);
  console.log(`Estimated final duration: ${result.summary.estimatedFinalDuration.toFixed(3)} seconds`);
  console.log(`Percentage removed: ${result.summary.percentageRemoved.toFixed(2)}%`);
  console.log(`Output: ${path.relative(process.cwd(), outputFile) || outputFile}`);
}

main().catch((error: unknown) => {
  console.error(`Error: ${errorMessage(error)}`);
  process.exitCode = 1;
});
