import { spawn } from "node:child_process";

const executable = process.platform === "win32" ? "tauri.cmd" : "tauri";

const child = spawn(executable, ["dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    TAURI_BACKEND_DEV: "1",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
