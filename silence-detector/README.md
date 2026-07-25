# Silence Detector

A standalone Node.js and TypeScript test harness for detecting silent sections in audio and video files. It runs local FFmpeg processes, parses `silencedetect` messages from stderr, applies edit padding, and writes structured JSON suitable for validating an eventual Premiere Pro workflow. It does not contain Premiere Pro integration.

## Prerequisites

- Node.js 20 or newer
- npm
- FFmpeg and ffprobe available on `PATH`

Install FFmpeg:

- Ubuntu/Debian: `sudo apt update && sudo apt install ffmpeg`
- macOS with Homebrew: `brew install ffmpeg`
- Windows with winget: `winget install Gyan.FFmpeg`

After installation, open a new terminal and confirm both `ffmpeg -version` and `ffprobe -version` work.

## Install

```bash
cd silence-detector
npm install
```

## Analyze one file

```bash
npm run detect -- --input "./test-media/sample.mp4"
```

All settings:

```bash
npm run detect -- \
  --input "./test-media/sample.mp4" \
  --threshold -35 \
  --minimum-duration 0.5 \
  --padding 0.08 \
  --output "./output/sample.json"
```

| Option | Default | Meaning |
| --- | ---: | --- |
| `--input` | required | Audio or video file path |
| `--threshold` | `-35` | FFmpeg silence threshold in dB; must be below zero |
| `--minimum-duration` | `0.5` | Minimum silence duration in seconds; must be above zero |
| `--padding` | `0.08` | Audio retained at each edge of a silence; must be zero or above |
| `--output` | `output/<name>.json` | Result JSON destination |

Paths containing spaces work when quoted. The program checks file readability, FFmpeg availability, media duration, and the presence of an audio stream before detection.

## Analyze a folder

```bash
npm run test-folder -- --input "./test-media"
```

Folder testing accepts `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.mp4`, `.mov`, `.mkv`, and `.webm` files in the specified folder (not recursively). A failure is reported but does not stop other files. The aggregate report is saved as `output/folder-report.json`. Threshold, minimum-duration, and padding options are also accepted.

## Output

Single-file JSON contains the absolute input path, duration, settings, counts and duration summaries, raw detected ranges, and padded removable ranges. Times are in seconds and rounded to three decimal places; percentage removed is rounded to two.

```json
{
  "inputFile": "/absolute/path/sample.mp4",
  "mediaDuration": 120.5,
  "settings": {
    "thresholdDb": -35,
    "minimumDurationSeconds": 0.5,
    "paddingSeconds": 0.08
  },
  "summary": {
    "rawSilenceCount": 1,
    "removableRangeCount": 1,
    "rawSilenceDuration": 0.793,
    "removableDuration": 0.633,
    "estimatedFinalDuration": 119.867,
    "percentageRemoved": 0.53
  },
  "rawRanges": [{ "start": 4.231, "end": 5.024, "duration": 0.793 }],
  "removableRanges": [{ "start": 4.311, "end": 4.944, "duration": 0.633 }]
}
```

## Tests

Run strict type checking and unit tests:

```bash
npm run typecheck
npm test
```

Generate a ten-second synthetic WAV, detect its two silent regions, check timestamps with tolerance, and save its JSON:

```bash
npm run test:integration
```

The generated file contains tone from 0–2 seconds, silence from 2–4, tone from 4–7, and silence from 7–10.

## Known limitations

- Silence detection is amplitude-based. Background noise, music, compression artifacts, and quiet speech can require threshold tuning.
- Padding produces independent ranges; it does not merge overlapping or adjacent ranges.
- Folder scanning is non-recursive.
- Only the first-level aggregate JSON path is configurable by editing the source; it is always `output/folder-report.json`.
- FFmpeg must be installed separately, and codec/container support depends on the local FFmpeg build.
- The detector identifies time ranges only; it does not cut, re-encode, or modify media.
