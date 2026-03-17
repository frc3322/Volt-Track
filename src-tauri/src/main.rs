use std::{
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Child as StdChild, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};

use tauri::{Manager, RunEvent, State};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

enum BackendProcess {
    Dev(StdChild),
    Sidecar(CommandChild),
}

impl BackendProcess {
    fn kill(self) {
        match self {
            Self::Dev(mut child) => {
                let _ = child.kill();
                let _ = child.wait();
            }
            Self::Sidecar(child) => {
                let _ = child.kill();
            }
        }
    }
}

struct BackendHandle {
    base_url: String,
    process: BackendProcess,
}

#[derive(Default)]
struct BackendState(Mutex<Option<BackendHandle>>);

#[tauri::command]
fn get_backend_base_url(state: State<'_, BackendState>) -> Result<String, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "Unable to read the backend state.".to_string())?;

    guard
        .as_ref()
        .map(|handle| handle.base_url.clone())
        .ok_or_else(|| "The backend process is not running.".to_string())
}

fn reserve_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Unable to reserve a localhost port: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Unable to read the reserved localhost port: {error}"))?
        .port();
    drop(listener);
    Ok(port)
}

fn wait_for_backend(base_url: &str) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(300))
        .build()
        .map_err(|error| format!("Unable to create the backend health check client: {error}"))?;
    let health_url = format!("{base_url}/health");

    for _ in 0..120 {
        if let Ok(response) = client.get(&health_url).send() {
            if response.status().is_success() {
                return Ok(());
            }
        }
        thread::sleep(Duration::from_millis(250));
    }

    Err("The backend sidecar did not become healthy before startup timed out.".to_string())
}

fn stop_backend(state: &BackendState) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(handle) = guard.take() {
            handle.process.kill();
        }
    }
}

fn project_root() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Unable to locate the project root from the Tauri crate.".to_string())
}

fn python_executable(project_root: &Path) -> PathBuf {
    if cfg!(target_os = "windows") {
        project_root.join(".venv").join("Scripts").join("python.exe")
    } else {
        project_root.join(".venv").join("bin").join("python")
    }
}

fn spawn_dev_backend(port: u16) -> Result<BackendProcess, String> {
    let project_root = project_root()?;
    let python = python_executable(&project_root);

    if !python.exists() {
        return Err(format!(
            "Unable to start the development backend because {} does not exist.",
            python.display()
        ));
    }

    let child = Command::new(&python)
        .current_dir(&project_root)
        .env("BATTERY_TRACKER_APP_ENV", "desktop")
        .args([
            "-m",
            "backend.app.desktop_main",
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
            "--log-level",
            "info",
        ])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("Unable to start the development backend: {error}"))?;

    Ok(BackendProcess::Dev(child))
}

fn spawn_sidecar_backend(app: &tauri::AppHandle, port: u16) -> Result<BackendProcess, String> {
    let command = app
        .shell()
        .sidecar("battery-tracker-backend")
        .map_err(|error| format!("Unable to configure the backend sidecar: {error}"))?
        .args(["--host", "127.0.0.1", "--port", &port.to_string()]);

    let (_receiver, child) = command
        .spawn()
        .map_err(|error| format!("Unable to start the backend sidecar: {error}"))?;

    Ok(BackendProcess::Sidecar(child))
}

fn start_backend(app: &tauri::AppHandle, state: &BackendState) -> Result<(), String> {
    let port = reserve_port()?;
    let base_url = format!("http://127.0.0.1:{port}");
    let process = if std::env::var_os("TAURI_BACKEND_DEV").is_some() {
        spawn_dev_backend(port)?
    } else {
        spawn_sidecar_backend(app, port)?
    };

    if let Err(error) = wait_for_backend(&base_url) {
        process.kill();
        return Err(error);
    }

    let mut guard = state
        .0
        .lock()
        .map_err(|_| "Unable to update the backend state.".to_string())?;

    *guard = Some(BackendHandle { base_url, process });
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendState::default())
        .setup(|app| {
            let state = app.state::<BackendState>();
            start_backend(app.handle(), state.inner())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_base_url])
        .build(tauri::generate_context!())
        .expect("error while running Tauri")
        .run(|app, event| match event {
            RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                let state = app.state::<BackendState>();
                stop_backend(state.inner());
            }
            _ => {}
        });
}
