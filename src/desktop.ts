import { invoke } from "@tauri-apps/api/core";
import { setApiBaseUrl } from "@/api";

let desktopRuntime = false;

export function isDesktopApp() {
  return desktopRuntime;
}

export async function initializeDesktopRuntime() {
  try {
    const backendBaseUrl = await invoke<string>("get_backend_base_url");
    setApiBaseUrl(backendBaseUrl);
    desktopRuntime = true;
  } catch {
    desktopRuntime = false;
  }
}
