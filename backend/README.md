# Battery Tracker Backend

Small Python backend for the battery tracker app. It uses:

- FastAPI for the main JSON API
- SQLite for persistence
- PyInstaller for the desktop sidecar build

## Run

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Start the server:

```bash
uvicorn backend.app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## Desktop sidecar build

The Tauri desktop shell packages this backend as a standalone executable. From the repository root:

```bash
npm run tauri:prepare-sidecar
```

That command builds `backend/app/desktop_main.py` with PyInstaller and copies the result into `src-tauri/binaries/` using the current Rust target triple in the filename, which is what Tauri expects for sidecars.

## Main routes

- `GET /health`
- `GET /summary`
- `GET /batteries`
- `GET /batteries/{battery_id}`
- `POST /batteries`
- `DELETE /batteries/{battery_id}`
- `POST /batteries/{battery_id}/checkout`
- `POST /batteries/{battery_id}/checkin`
- `GET /logs`

## Notes

- The database file defaults to `backend/data/battery_tracker.db` in normal Python development.
- The desktop sidecar stores its database under the user application data directory.
- Battery inventory only uses `Checked In` and `Checked Out` states.
- Check-ins and check-outs are persisted in SQLite via the `logs` table.
- Set `BATTERY_TRACKER_DB_PATH` to point the app at a different SQLite file for local experiments or tests.
