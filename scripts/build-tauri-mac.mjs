import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tauriExecutable = process.platform === "win32" ? "tauri.cmd" : "tauri";
const signingIdentity = process.env.APPLE_SIGNING_IDENTITY || "-";
const extraArgs = process.argv.slice(2);

function getTargetTriple() {
  const targetFlagIndex = extraArgs.indexOf("--target");
  return extraArgs.find((argument) => argument.startsWith("--target="))?.split("=")[1]
    ?? (targetFlagIndex >= 0 ? extraArgs[targetFlagIndex + 1] : undefined);
}

const targetTriple = getTargetTriple();
const appBundlePath = path.join(
  projectRoot,
  "src-tauri",
  "target",
  ...(targetTriple ? [targetTriple] : []),
  "release",
  "bundle",
  "macos",
  "VoltTrack.app",
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(tauriExecutable, ["build", "--bundles", "app", ...extraArgs]);
run("codesign", ["--force", "--deep", "--sign", signingIdentity, appBundlePath]);
run("codesign", ["--verify", "--deep", "--strict", "--verbose=4", appBundlePath]);
