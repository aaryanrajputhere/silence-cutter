# Silence Cutter Premiere Prototype

A minimal Windows UXP panel for Premiere Pro 25.6 or newer. It selects a local media file and extracts its audio to a 48 kHz PCM WAV using the FFmpeg installation available on Windows `PATH`.

This prototype intentionally does not modify the Premiere timeline and does not yet read the active clip. Its purpose is to verify UXP loading, file permissions, external-process consent, and FFmpeg extraction on the Premiere computer.

## Requirements

- Windows 10 or 11
- Premiere Pro 25.6 or newer
- UXP Developer Tool 2.2 or newer
- FFmpeg and ffprobe installed and available on `PATH`

After installing FFmpeg, restart Premiere Pro so it inherits the updated `PATH`.

## Load in Premiere

1. In Premiere, open **Settings → Plugins**, enable **Developer Mode**, and restart Premiere.
2. Open UXP Developer Tools.
3. Click **Add Plugin** and choose this folder's `manifest.json`.
4. Click **Load & Watch**.
5. In Premiere, open **Window → UXP Plugins → Silence Cutter Prototype**.

## Test

1. Click **Choose media file** and select a video or audio file.
2. Click **Choose output folder**.
3. Click **Extract WAV**.
4. Approve the Windows process-launch consent prompt.
5. Check the chosen folder for `<source-name>.wav` and `<source-name>-ffmpeg.log`.

The WAV is mono or multichannel according to the source audio, uses 48 kHz sampling, and is stored as uncompressed PCM.

## Why a command file?

Premiere 25.6 UXP can launch an executable but cannot pass command-line arguments to it or capture process output. This prototype writes a temporary Windows `.cmd` job containing the selected paths and asks UXP to launch it. A production plugin should replace this with a signed UXP hybrid/native helper so it can monitor progress, cancel work, bundle FFmpeg, and report process errors directly.

## Package for private testing

In UXP Developer Tools, use the plugin's **••• → Package** menu to generate a `.ccx` file. The temporary plugin ID in `manifest.json` is suitable for development and private testing; Marketplace distribution requires an ID from Adobe Developer Distribution.
