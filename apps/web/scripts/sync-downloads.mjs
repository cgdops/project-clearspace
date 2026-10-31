import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const appVersion = rootPkg.version || "0.1.0";
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
const rehashOnly = process.argv.includes("--rehash-only");
const isSigned = process.argv.includes("--signed");

const artifacts = [];

// 1. Check NSIS installer (.exe)
const nsisDestName = `Clearspace_${appVersion}_x64-setup.exe`;
const nsisDest = path.join(downloadsDir, nsisDestName);
const nsisDir = path.join(bundleDir, "nsis");
if (!rehashOnly && fs.existsSync(nsisDir)) {
  const exeFiles = fs.readdirSync(nsisDir).filter((f) => f.endsWith(".exe"));
  const matchedExe = exeFiles.find((f) => f.includes(appVersion)) || exeFiles[exeFiles.length - 1];
  if (matchedExe) {
    fs.copyFileSync(path.join(nsisDir, matchedExe), nsisDest);
  }
}
if (fs.existsSync(nsisDest)) {
  const stat = fs.statSync(nsisDest);
  artifacts.push({
    id: "win-nsis",
    platform: "Windows 10/11 (x64)",
    kind: "NSIS Setup Installer (.exe)",
    recommended: true,
    signed: isSigned,
    filename: nsisDestName,
    url: `/downloads/${nsisDestName}`,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    sha256: sha256File(nsisDest),
  });
}

// 2. Check MSI installer (.msi)
const msiDestName = `Clearspace_${appVersion}_x64_en-US.msi`;
const msiDest = path.join(downloadsDir, msiDestName);
const msiDir = path.join(bundleDir, "msi");
if (!rehashOnly && fs.existsSync(msiDir)) {
  const msiFiles = fs.readdirSync(msiDir).filter((f) => f.endsWith(".msi"));
  const matchedMsi = msiFiles.find((f) => f.includes(appVersion)) || msiFiles[msiFiles.length - 1];
  if (matchedMsi) {
    fs.copyFileSync(path.join(msiDir, matchedMsi), msiDest);
  }
}
if (fs.existsSync(msiDest)) {
  const stat = fs.statSync(msiDest);
  artifacts.push({
    id: "win-msi",
    platform: "Windows 10/11 (x64)",
    kind: "MSI Windows Installer (.msi)",
    recommended: false,
    signed: isSigned,
    filename: msiDestName,
    url: `/downloads/${msiDestName}`,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    sha256: sha256File(msiDest),
  });
}

// 3. Check Portable Release Binary (.exe)
const portableDestName = `Clearspace_${appVersion}_x64-portable.exe`;
const portableDest = path.join(downloadsDir, portableDestName);
if (!rehashOnly) {
  const candidateExes = ["clearspace-desktop-tauri.exe", "clearspace-desktop.exe", "Clearspace.exe"];
  for (const exeName of candidateExes) {
    const src = path.join(releaseDir, exeName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, portableDest);
      break;
    }
  }
}
if (fs.existsSync(portableDest)) {
  const stat = fs.statSync(portableDest);
  artifacts.push({
    id: "win-portable",
    platform: "Windows 10/11 (x64)",
    kind: "Standalone Portable Binary (.exe)",
    recommended: artifacts.length === 0,
    signed: isSigned,
    filename: portableDestName,
    url: `/downloads/${portableDestName}`,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    sha256: sha256File(portableDest),
  });
}

const tauriMainRs = fs.readFileSync(
  path.join(repoRoot, "apps/desktop/src-tauri/src/main.rs"),
  "utf8"
);
const schemaMatch = /CURRENT_SCHEMA_VERSION:\s*i64\s*=\s*(\d+)/.exec(tauriMainRs);
const currentSchemaVersion = schemaMatch ? Number(schemaMatch[1]) : 3;

if (artifacts.length === 0) {
  console.log("No installer binaries found to sync; preserving existing release manifests.");
  process.exit(0);
}

const manifest = {
  productName: "Clearspace",
  version: appVersion,
  schemaVersion: currentSchemaVersion,
  releaseDate: "2026-10-31",
  identifier: "com.g3zcreative.clearspace",
  codeSigningProvider: isSigned ? "SignPath Foundation (SignPath.io)" : "Unsigned (SHA-256 Verified)",
  license: "MIT Open-Core + Auditable Commercial EE",
  notes: `Zero-Knowledge local SQLite vault with v${currentSchemaVersion} schema migration guard, Adaptive Writing Level (Everyday, Professional, Technical), Plain-English Career Matches, and Personalized Next Steps.`,
  artifacts,
};

fs.writeFileSync(
  path.join(downloadsDir, "release-manifest.json"),
  JSON.stringify(manifest, null, 2)
);

const primaryArtifact = artifacts.find((a) => a.recommended) || artifacts[0] || null;
const tauriLatestManifest = {
  version: manifest.version,
  schemaVersion: manifest.schemaVersion,
  notes: manifest.notes,
  pub_date: "2026-10-30T00:00:00Z",
  platforms: primaryArtifact
    ? {
        "windows-x86_64": {
          url: primaryArtifact.url,
          sha256: primaryArtifact.sha256,
          filename: primaryArtifact.filename,
          sizeFormatted: primaryArtifact.sizeFormatted,
        },
      }
    : {},
};

fs.writeFileSync(
  path.join(downloadsDir, "latest.json"),
  JSON.stringify(tauriLatestManifest, null, 2)
);

const desktopPublicDir = path.join(repoRoot, "apps/desktop/public");
fs.mkdirSync(desktopPublicDir, { recursive: true });
fs.writeFileSync(
  path.join(desktopPublicDir, "latest.json"),
  JSON.stringify(tauriLatestManifest, null, 2)
);

const shaLines = artifacts.map((a) => `${a.sha256}  ${a.filename}`).join("\n") + "\n";
fs.writeFileSync(path.join(downloadsDir, "SHA256SUMS.txt"), shaLines);

console.log(
  `Synced ${artifacts.length} installer artifact(s) to apps/web/public/downloads/ (${rehashOnly ? "rehashed post-signing" : "copied from target/release"}):`
);
for (const a of artifacts) {
  console.log(`  - ${a.filename} (${a.sizeFormatted}) [SHA-256: ${a.sha256.slice(0, 16)}...]`);
}
