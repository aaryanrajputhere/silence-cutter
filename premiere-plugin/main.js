const { localFileSystem } = require("uxp").storage;
const { shell } = require("uxp");

const state = {
  sourceFile: null,
  outputFolder: null,
};

const MEDIA_TYPES = [
  "mp3", "wav", "m4a", "aac", "flac", "mp4", "mov", "mkv", "webm",
];

function element(id) {
  const result = document.getElementById(id);
  if (!result) {
    throw new Error(`Missing UI element: ${id}`);
  }
  return result;
}

function setStatus(message, kind = "info") {
  const status = element("status");
  status.textContent = message;
  status.className = `status ${kind}`;
}

function refreshButtons() {
  element("extract").disabled = !(state.sourceFile && state.outputFolder);
  element("openOutput").disabled = !state.outputFolder;
}

function withoutExtension(fileName) {
  const finalDot = fileName.lastIndexOf(".");
  return finalDot > 0 ? fileName.slice(0, finalDot) : fileName;
}

function escapeBatchValue(value) {
  return value.replace(/%/g, "%%");
}

function safeOutputName(fileName) {
  const stem = withoutExtension(fileName)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim();
  return `${stem || "extracted-audio"}.wav`;
}

async function chooseSource() {
  try {
    const file = await localFileSystem.getFileForOpening({ types: MEDIA_TYPES });
    if (!file) return;
    state.sourceFile = file;
    element("sourcePath").textContent = file.nativePath;
    setStatus("Source selected. Now choose an output folder.");
    refreshButtons();
  } catch (error) {
    setStatus(`Could not select source: ${error.message || String(error)}`, "error");
  }
}

async function chooseOutput() {
  try {
    const folder = await localFileSystem.getFolder();
    if (!folder) return;
    state.outputFolder = folder;
    element("outputPath").textContent = folder.nativePath;
    setStatus(state.sourceFile
      ? "Ready to extract the WAV."
      : "Output selected. Now choose a source file.");
    refreshButtons();
  } catch (error) {
    setStatus(`Could not select output folder: ${error.message || String(error)}`, "error");
  }
}

async function extractAudio() {
  if (!state.sourceFile || !state.outputFolder) return;
  const extractButton = element("extract");
  extractButton.disabled = true;

  try {
    const outputName = safeOutputName(state.sourceFile.name);
    const separator = state.outputFolder.nativePath.endsWith("\\") ? "" : "\\";
    const outputPath = `${state.outputFolder.nativePath}${separator}${outputName}`;
    const logPath = `${state.outputFolder.nativePath}${separator}${withoutExtension(outputName)}-ffmpeg.log`;
    const temporaryFolder = await localFileSystem.getTemporaryFolder();
    const jobFile = await temporaryFolder.createFile("silence-cutter-extract.cmd", { overwrite: true });

    const input = escapeBatchValue(state.sourceFile.nativePath);
    const output = escapeBatchValue(outputPath);
    const log = escapeBatchValue(logPath);
    const script = [
      "@echo off",
      "setlocal",
      `set "SC_INPUT=${input}"`,
      `set "SC_OUTPUT=${output}"`,
      `set "SC_LOG=${log}"`,
      "where ffmpeg >nul 2>nul",
      "if errorlevel 1 (",
      "  echo FFmpeg was not found on PATH. Install FFmpeg and restart Premiere Pro.>\"%SC_LOG%\"",
      "  exit /b 1",
      ")",
      "ffmpeg -hide_banner -y -i \"%SC_INPUT%\" -vn -ar 48000 -c:a pcm_s16le \"%SC_OUTPUT%\" >\"%SC_LOG%\" 2>&1",
      "exit /b %errorlevel%",
      "",
    ].join("\r\n");
    await jobFile.write(script);

    setStatus(`Starting FFmpeg. Output will be written to ${outputName}.`);
    const launchError = await shell.openPath(
      jobFile.nativePath,
      "Silence Cutter needs to run FFmpeg to extract audio from the media file you selected.",
    );
    if (launchError) {
      throw new Error(launchError);
    }
    setStatus(
      `Extraction started. Check ${outputName} in the selected folder. FFmpeg details are saved beside it.`,
      "success",
    );
  } catch (error) {
    setStatus(`Extraction could not start: ${error.message || String(error)}`, "error");
  } finally {
    extractButton.disabled = false;
  }
}

async function openOutputFolder() {
  if (!state.outputFolder) return;
  try {
    const launchError = await shell.openPath(
      state.outputFolder.nativePath,
      "Open the folder containing the extracted audio.",
    );
    if (launchError) throw new Error(launchError);
  } catch (error) {
    setStatus(`Could not open output folder: ${error.message || String(error)}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  element("chooseSource").addEventListener("click", chooseSource);
  element("chooseOutput").addEventListener("click", chooseOutput);
  element("extract").addEventListener("click", extractAudio);
  element("openOutput").addEventListener("click", openOutputFolder);
  refreshButtons();
});
