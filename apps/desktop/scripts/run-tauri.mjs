import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const homeDir = os.homedir();
const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
const cargoBinDir = path.join(homeDir, ".cargo", "bin");

const extraDirs = [
  cargoBinDir,
  path.join(
    localAppData,
    "Microsoft",
    "WinGet",
    "Packages",
    "BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "mingw64",
    "bin"
  ),
].filter((dir) => fs.existsSync(dir));

const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") || "PATH";
const currentPath = process.env[pathKey] || "";
const updatedPath = [...extraDirs, currentPath].filter(Boolean).join(path.delimiter);

const args = process.argv.slice(2);
const isCargoDirect = args[0] === "--cargo";

if (isCargoDirect) {
  const cargoExe = path.join(
    cargoBinDir,
    process.platform === "win32" ? "cargo.exe" : "cargo"
  );
  const bin = fs.existsSync(cargoExe)
    ? cargoExe
    : process.platform === "win32"
    ? "cargo.exe"
    : "cargo";
  const child = spawn(bin, args.slice(1), {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, [pathKey]: updatedPath },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const tauriCliEntry = require.resolve("@tauri-apps/cli/tauri.js");
  const child = spawn(process.execPath, [tauriCliEntry, ...args], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, [pathKey]: updatedPath },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
