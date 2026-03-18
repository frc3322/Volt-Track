# Battery Tracker App

This project has two parts:

- A React + Vite frontend in the repository root
- A Python backend in `backend/` using FastAPI and SQLite
- A Tauri desktop shell in `src-tauri/` that launches the backend as a managed sidecar

The frontend talks to the backend at `http://127.0.0.1:8000` by default.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ and pip
- Rust with Cargo

## Install dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## Run the project

Start the backend from the project root:

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --reload
```

The backend will be available at `http://127.0.0.1:8000`.

In a second terminal, start the frontend:

```bash
npm run dev
```

Vite will print the local frontend URL, which is usually `http://127.0.0.1:5173` or `http://localhost:5173`.

## Run the Tauri desktop app

Build the bundled backend sidecar and launch the desktop shell:

```bash
npm run tauri:dev
```

During `tauri dev`, the desktop shell starts the backend from the project `.venv` directly, waits for its health check, and kills it when the desktop app exits. Production desktop builds still package the backend as a standalone sidecar binary.

## Build the frontend

```bash
npm run build
```

To build desktop bundles on the current host OS:

```bash
npm run tauri:build
```

For explicit host-specific desktop outputs:

```bash
npm run tauri:build:mac
npm run tauri:build:windows
```

Run the mac build on macOS to produce the `.app` bundle, and run the Windows build on Windows to produce the NSIS `.exe` installer. The backend sidecar is rebuilt for the current target before each desktop build, and Tauri's own build step now prepares it automatically as well.

To preview the production frontend build locally:

```bash
npm run preview
```

## Test the project

```bash
npm test
```

This runs the Vitest frontend suite and the backend `unittest` suite against an isolated temporary SQLite database.

## Backend routes

Main API:

- `GET /health`
- `GET /summary`
- `GET /batteries`
- `GET /batteries/{battery_id}`
- `POST /batteries`
- `DELETE /batteries/{battery_id}`
- `POST /batteries/{battery_id}/checkout`
- `POST /batteries/{battery_id}/checkin`
- `GET /logs`

## Data and notes

- The SQLite database is stored at `backend/data/battery_tracker.db`.
- In the desktop app, the SQLite database moves to the user application data directory instead of the bundled app resources.
- On first startup, the backend creates the database and seeds a small set of sample batteries and logs.
- If you need the frontend to call a different backend URL, set `VITE_API_BASE_URL` before starting Vite.
- Tests can override the database location with `BATTERY_TRACKER_DB_PATH`.
