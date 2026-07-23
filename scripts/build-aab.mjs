// One-command release AAB builder with auto-incrementing versionCode.
//
//   npm run aab
//
// It does everything, so you never hand-edit a version number again:
//   1. Reads ANDROID_VERSION_CODE from app.config.js and adds 1.
//   2. Writes the new number back to app.config.js AND to
//      android/app/build.gradle (the value Gradle actually reads).
//   3. Builds the signed release AAB via Gradle (uses the release signing
//      config wired in android/app/build.gradle + android/gradle.properties).
//   4. Copies the result to shuleone-v<N>-release.aab in the project root and
//      prints the path.
//
// Version codes are cheap and Play allows gaps, so incrementing once per build
// (even a failed one) is fine — it mirrors how EAS autoIncrement behaves.
//
// This does NOT run `expo prebuild`, on purpose: prebuild --clean wipes the
// signing config and SDK paths. Patching build.gradle's versionCode directly
// keeps the native project (and its signing setup) intact between builds, which
// is also why rebuilds are fast — the compiled native layer is reused.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(root, 'app.config.js');
const GRADLE = join(root, 'android', 'app', 'build.gradle');
const OUT = join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── 1. read + bump ──────────────────────────────────────────────
if (!existsSync(CONFIG)) fail('app.config.js not found');
let config = readFileSync(CONFIG, 'utf8');
const m = config.match(/const ANDROID_VERSION_CODE\s*=\s*(\d+)\s*;/);
if (!m) fail('Could not find `const ANDROID_VERSION_CODE = <n>;` in app.config.js');
const current = Number(m[1]);
const next = current + 1;

console.log(`\n▸ versionCode ${current} → ${next}`);

// ── 2. write back to both files ─────────────────────────────────
config = config.replace(/const ANDROID_VERSION_CODE\s*=\s*\d+\s*;/, `const ANDROID_VERSION_CODE = ${next};`);
writeFileSync(CONFIG, config);

if (!existsSync(GRADLE)) {
  fail('android/app/build.gradle not found — run `npx expo prebuild -p android` once first.');
}
let gradle = readFileSync(GRADLE, 'utf8');
if (!/versionCode\s+\d+/.test(gradle)) fail('Could not find `versionCode <n>` in build.gradle');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${next}`);
writeFileSync(GRADLE, gradle);
console.log('▸ synced app.config.js + build.gradle');

// ── 3. build ────────────────────────────────────────────────────
const androidDir = join(root, 'android');
const isWin = platform() === 'win32';
// Absolute path to the wrapper — a bare "gradlew.bat" is NOT resolved from cwd
// on Windows. And because the path can contain spaces (e.g. "C:\EDUCRAFT
// PROJECTS\…"), it must be QUOTED and passed as a single shell command string,
// or the shell splits on the space ("'C:\EDUCRAFT' is not recognized").
const gradlew = join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
console.log('▸ building signed AAB (this reuses the cached native layer)…\n');
const cmd = `"${gradlew}" :app:bundleRelease --no-daemon`;
const res = spawnSync(cmd, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});
if (res.status !== 0) fail(`Gradle build failed (exit ${res.status}). versionCode was already bumped to ${next}; the next run continues from there.`);

// ── 4. copy + report ────────────────────────────────────────────
if (!existsSync(OUT)) fail('Build reported success but no AAB was found.');
const dest = join(root, `shuleone-v${next}-release.aab`);
copyFileSync(OUT, dest);

console.log(`\n✔ AAB ready — versionCode ${next}`);
console.log(`  ${dest}`);
console.log(`\nUpload that file to the Play Console.\n`);
