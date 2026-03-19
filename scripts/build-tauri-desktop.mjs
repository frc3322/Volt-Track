import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tauriExecutable = process.platform === "win32" ? "tauri.cmd" : "tauri";
const extraArgs = process.argv.slice(2);

let tauriArgs;
if (process.platform === "darwin") {
  const macBuildScriptPath = path.join(__dirname, "build-tauri-mac.mjs");
  const child = spawnSync("node", [macBuildScriptPath, ...extraArgs], {
    stdio: "inherit",
    env: process.env,
  });

  if (child.error) {
    throw child.error;
  }

  if (child.signal) {
    process.kill(process.pid, child.signal);
  }

  process.exit(child.status ?? 1);
} else if (process.platform === "win32") {
  tauriArgs = ["build", "--bundles", "nsis", ...extraArgs];
} else {
  tauriArgs = ["build", ...extraArgs];
}

const child = spawnSync(tauriExecutable, tauriArgs, {
  stdio: "inherit",
  env: process.env,
});

if (child.error) {
  throw child.error;
}

if (child.signal) {
  process.kill(process.pid, child.signal);
}

process.exit(child.status ?? 1);
