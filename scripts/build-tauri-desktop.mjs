import { spawnSync } from "node:child_process";

const tauriExecutable = process.platform === "win32" ? "tauri.cmd" : "tauri";
const extraArgs = process.argv.slice(2);

let tauriArgs;
if (process.platform === "darwin") {
  tauriArgs = ["build", "--bundles", "app", ...extraArgs];
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
