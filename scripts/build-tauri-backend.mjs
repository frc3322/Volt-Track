import { existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const platform = process.platform;
const isWindows = platform === "win32";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getTargetTriple() {
  const cliTarget = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--target="))
    ?.split("=")[1];

  if (cliTarget) {
    return cliTarget;
  }

  const envTarget = process.env.TAURI_ENV_TARGET_TRIPLE
    ?? process.env.TAURI_TARGET_TRIPLE
    ?? process.env.RUST_TARGET_TRIPLE;

  if (envTarget) {
    return envTarget;
  }

  const result = spawnSync("rustc", ["-vV"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    throw new Error("Unable to determine the Rust target triple. Pass --target=<triple>.");
  }

  const hostLine = result.stdout
    .split("\n")
    .find((line) => line.startsWith("host: "));

  if (!hostLine) {
    throw new Error("Unable to determine the Rust target triple from rustc -vV output.");
  }

  return hostLine.replace("host: ", "").trim();
}

const pyInstallerPath = path.join(
  projectRoot,
  ".venv",
  isWindows ? "Scripts" : "bin",
  isWindows ? "pyinstaller.exe" : "pyinstaller",
);

if (!existsSync(pyInstallerPath)) {
  throw new Error(
    `PyInstaller was not found at ${pyInstallerPath}. Install backend requirements into .venv first.`,
  );
}

const targetTriple = getTargetTriple();
const sidecarName = "battery-tracker-backend";
const distDir = path.join(projectRoot, "backend", "dist");
const workPath = path.join(projectRoot, "backend", "build", "pyinstaller");
const specPath = path.join(projectRoot, "backend", "build", "spec");
const cachePath = path.join(projectRoot, "backend", "build", "pyinstaller-cache");
const binariesDir = path.join(projectRoot, "src-tauri", "binaries");
const extension = targetTriple.includes("windows") ? ".exe" : "";
const builtBinaryPath = path.join(distDir, `${sidecarName}${extension}`);
const tauriBinaryPath = path.join(binariesDir, `${sidecarName}-${targetTriple}${extension}`);

mkdirSync(distDir, { recursive: true });
mkdirSync(workPath, { recursive: true });
mkdirSync(specPath, { recursive: true });
mkdirSync(cachePath, { recursive: true });
mkdirSync(binariesDir, { recursive: true });

run(pyInstallerPath, [
  "--noconfirm",
  "--clean",
  "--onefile",
  "--name",
  sidecarName,
  "--distpath",
  distDir,
  "--workpath",
  workPath,
  "--specpath",
  specPath,
  "backend/app/desktop_main.py",
], {
  env: {
    ...process.env,
    PYINSTALLER_CONFIG_DIR: cachePath,
  },
});

if (!existsSync(builtBinaryPath)) {
  throw new Error(`PyInstaller did not produce ${builtBinaryPath}.`);
}

rmSync(tauriBinaryPath, { force: true });
copyFileSync(builtBinaryPath, tauriBinaryPath);

console.log(`Prepared Tauri sidecar: ${tauriBinaryPath}`);
