/**
 * Encodes the frames captured by record.mjs into an H.264 MP4 (1080p, 30 fps),
 * and copies the SRT next to it.
 *
 *   node scripts/walkthrough/encode.mjs /tmp/walkthrough docs/walkthrough/walkthrough.mp4 [voice.m4a]
 *
 * With a third argument the audio file is muxed in (video is untouched).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const IN = process.argv[2] ?? "/tmp/walkthrough";
const OUT = process.argv[3] ?? "docs/walkthrough/walkthrough.mp4";
const AUDIO = process.argv[4];

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const args = ["-y", "-f", "concat", "-safe", "0", "-i", path.join(IN, "frames.txt")];
if (AUDIO) args.push("-i", AUDIO);
args.push(
  "-vf",
  "scale=1920:1080:flags=lanczos,format=yuv420p",
  "-fps_mode",
  "cfr",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-crf",
  "19",
  "-preset",
  "medium",
  "-profile:v",
  "high",
  "-movflags",
  "+faststart",
);
if (AUDIO) args.push("-c:a", "aac", "-b:a", "160k", "-shortest");
args.push(OUT);

execFileSync("ffmpeg", args, { stdio: "inherit" });
const srt = path.join(IN, "walkthrough.srt");
if (fs.existsSync(srt)) fs.copyFileSync(srt, OUT.replace(/\.mp4$/, ".srt"));
console.log(`→ ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);
