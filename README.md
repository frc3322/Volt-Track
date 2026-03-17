# Battery Tracker App

This project has two parts:

- A React + Vite frontend in the repository root
- A Python backend in `backend/` using FastAPI, Flask, and SQLite

The frontend talks to the backend at `http://127.0.0.1:8000` by default.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ and pip

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

## Build the frontend

```bash
npm run build
```

To preview the production frontend build locally:

```bash
npm run preview
```

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

Mounted Flask routes:

- `GET /flask/healthz`
- `GET /flask/counts`

## Data and notes

- The SQLite database is stored at `backend/data/battery_tracker.db`.
- On first startup, the backend creates the database and seeds a small set of sample batteries and logs.
- If you need the frontend to call a different backend URL, set `VITE_API_BASE_URL` before starting Vite.
