import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) {
    throw new Error(`Invalid SemVer string: "${v}" (expected X.Y.Z)`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function computeNextVersion(current, arg) {
  if (!arg || arg === "sync") return current;
  const [maj, min, pat] = parseSemver(current);
  if (arg === "patch") return `${maj}.${min}.${pat + 1}`;
  if (arg === "minor") return `${maj}.${min + 1}.0`;
  if (arg === "major") return `${maj + 1}.0.0`;
  parseSemver(arg);
  return arg.trim();
}

const rootPkgPath = path.join(repoRoot, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const previousVersion = rootPkg.version;
const cliArg = process.argv[2];
const nextVersion = computeNextVersion(previousVersion, cliArg);

if (nextVersion !== previousVersion) {
  rootPkg.version = nextVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
}

const updatedFiles = [];

function updateJsonVersion(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return;
  const raw = fs.readFileSync(fullPath, "utf8");
  const json = JSON.parse(raw);
  if (json.version !== nextVersion) {
    json.version = nextVersion;
    fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + "\n");
    updatedFiles.push(relPath);
  }
}

function replaceRegexInFile(relPath, replacements) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return;
  const original = fs.readFileSync(fullPath, "utf8");
  let next = original;
  for (const [rx, repl] of replacements) {
    next = next.replace(rx, repl);
  }
  if (next !== original) {
    fs.writeFileSync(fullPath, next);
    updatedFiles.push(relPath);
  }
}

// 1. JSON configs
updateJsonVersion("apps/desktop/package.json");
updateJsonVersion("apps/web/package.json");
updateJsonVersion("apps/api/package.json");
updateJsonVersion("apps/desktop/src-tauri/tauri.conf.json");

// 2. Cargo.toml [workspace.package] version
replaceRegexInFile("Cargo.toml", [
  [/(\[workspace\.package\][\s\S]*?\nversion\s*=\s*")(\d+\.\d+\.\d+)(")/, `$1${nextVersion}$3`],
]);

// 3. README.md installer links
replaceRegexInFile("README.md", [
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);

// 4. Web HTML & TypeScript entrypoints
const webHtmlReplacements = [
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
  [/Clearspace v\d+\.\d+\.\d+/g, `Clearspace v${nextVersion}`],
  [/Release v\d+\.\d+\.\d+/g, `Release v${nextVersion}`],
  [/Download v\d+\.\d+\.\d+/g, `Download v${nextVersion}`],
  [/(id="nav-version-badge">v)\d+\.\d+\.\d+(<\/span>)/g, `$1${nextVersion}$2`],
  [/(Recommended NSIS Installer &bull; v)\d+\.\d+\.\d+/g, `$1${nextVersion}`],
  [/\(<code>v\d+\.\d+\.\d+<\/code>\)/g, `(<code>v${nextVersion}</code>)`],
];
replaceRegexInFile("apps/web/index.html", webHtmlReplacements);
replaceRegexInFile("apps/web/zero-knowledge.html", webHtmlReplacements);
replaceRegexInFile("apps/web/how-ai-works.html", webHtmlReplacements);
replaceRegexInFile("apps/web/src/main.ts", [
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
  [/sizeFormatted:\s*"v\d+\.\d+\.\d+"/g, `sizeFormatted: "v${nextVersion}"`],
]);
replaceRegexInFile("apps/web/tests/marketing.spec.ts", [
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);

// 5. Download manifests
replaceRegexInFile("apps/web/public/downloads/release-manifest.json", [
  [/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${nextVersion}$2`],
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);
replaceRegexInFile("apps/web/public/downloads/latest.json", [
  [/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${nextVersion}$2`],
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);
replaceRegexInFile("apps/desktop/public/latest.json", [
  [/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${nextVersion}$2`],
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);
replaceRegexInFile("apps/web/public/downloads/SHA256SUMS.txt", [
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);

// 6. Desktop client default version fallback
replaceRegexInFile("apps/desktop/src/vaultClient.ts", [
  [/installed_version:\s*"\d+\.\d+\.\d+"/g, `installed_version: "${nextVersion}"`],
  [/installedVersion\s*=\s*"\d+\.\d+\.\d+"/g, `installedVersion = "${nextVersion}"`],
  [/Clearspace_\d+\.\d+\.\d+_x64/g, `Clearspace_${nextVersion}_x64`],
]);
replaceRegexInFile("apps/desktop/src/App.tsx", [
  [/(data\??\.update_status\?\.installed_version\s*\?\?\s*")\d+\.\d+\.\d+(")/g, `$1${nextVersion}$2`],
]);
replaceRegexInFile("apps/desktop/src/__tests__/vaultClient.test.ts", [
  [/(expect\(status\.installed_version\)\.toBe\(")\d+\.\d+\.\d+("\))/g, `$1${nextVersion}$2`],
  [/(checkForAppUpdates\(")\d+\.\d+\.\d+(",\s*\d+\))/g, `$1${nextVersion}$2`],
  [/(expect\(checkRes\.installed_version\)\.toBe\(")\d+\.\d+\.\d+("\))/g, `$1${nextVersion}$2`],
]);

console.log(
  `[version:sync] Version ${previousVersion} -> ${nextVersion} (${updatedFiles.length} file(s) updated)`
);
for (const f of updatedFiles) {
  console.log(`  - ${f}`);
}
