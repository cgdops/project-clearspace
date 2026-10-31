import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const downloadsDir = path.resolve(__dirname, "../public/downloads");
const publicDir = path.resolve(__dirname, "../public");

fs.mkdirSync(downloadsDir, { recursive: true });

// Copy favicon from desktop icons if available
const iconSrc = path.join(repoRoot, "apps/desktop/src-tauri/icons/128x128.png");
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(publicDir, "favicon.png"));
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

const bundleDir = path.join(repoRoot, "target/release/bundle");
const releaseDir = path.join(repoRoot, "target/release");

const artifacts = [];

// 1. Check NSIS installer (.exe)
const nsisDir = path.join(bundleDir, "nsis");
if (fs.existsSync(nsisDir)) {
  const exeFiles = fs.readdirSync(nsisDir).filter((f) => f.endsWith(".exe"));
  if (exeFiles.length > 0) {
    const src = path.join(nsisDir, exeFiles[0]);
    const destName = "Clearspace_0.1.0_x64-setup.exe";
    const dest = path.join(downloadsDir, destName);
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    artifacts.push({
      id: "win-nsis",
      platform: "Windows 10/11 (x64)",
      kind: "NSIS Setup Installer (.exe)",
      recommended: true,
      filename: destName,
      url: `/downloads/${destName}`,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      sha256: sha256File(dest),
    });
  }
}

// 2. Check MSI installer (.msi)
const msiDir = path.join(bundleDir, "msi");
if (fs.existsSync(msiDir)) {
  const msiFiles = fs.readdirSync(msiDir).filter((f) => f.endsWith(".msi"));
  if (msiFiles.length > 0) {
    const src = path.join(msiDir, msiFiles[0]);
    const destName = "Clearspace_0.1.0_x64_en-US.msi";
    const dest = path.join(downloadsDir, destName);
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    artifacts.push({
      id: "win-msi",
      platform: "Windows 10/11 (x64)",
      kind: "MSI Windows Installer (.msi)",
      recommended: false,
      filename: destName,
      url: `/downloads/${destName}`,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      sha256: sha256File(dest),
    });
  }
}

// 3. Check Portable Release Binary (.exe)
const candidateExes = ["clearspace-desktop-tauri.exe", "clearspace-desktop.exe", "Clearspace.exe"];
for (const exeName of candidateExes) {
  const src = path.join(releaseDir, exeName);
  if (fs.existsSync(src)) {
    const destName = "Clearspace_0.1.0_x64-portable.exe";
    const dest = path.join(downloadsDir, destName);
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    artifacts.push({
      id: "win-portable",
      platform: "Windows 10/11 (x64)",
      kind: "Standalone Portable Binary (.exe)",
      recommended: artifacts.length === 0,
      filename: destName,
      url: `/downloads/${destName}`,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      sha256: sha256File(dest),
    });
    break;
  }
}

const manifest = {
  productName: "Clearspace",
  version: "0.1.0",
  releaseDate: "2026-10-30",
  identifier: "com.g3zcreative.clearspace",
  license: "MIT Open-Core + Auditable Commercial EE",
  artifacts,
};

fs.writeFileSync(
  path.join(downloadsDir, "release-manifest.json"),
  JSON.stringify(manifest, null, 2)
);

const shaLines = artifacts.map((a) => `${a.sha256}  ${a.filename}`).join("\n") + "\n";
fs.writeFileSync(path.join(downloadsDir, "SHA256SUMS.txt"), shaLines);

console.log(`Synced ${artifacts.length} installer artifact(s) to apps/web/public/downloads/:`);
for (const a of artifacts) {
  console.log(`  - ${a.filename} (${a.sizeFormatted}) [SHA-256: ${a.sha256.slice(0, 16)}...]`);
}
