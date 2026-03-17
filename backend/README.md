# Battery Tracker Backend

Small Python backend for the battery tracker app. It uses:

- FastAPI for the main JSON API
- Flask for a small mounted compatibility/admin surface
- SQLite for persistence

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

## Flask routes

These are mounted under `/flask`.

- `GET /flask/healthz`
- `GET /flask/counts`

## Notes

- The database file defaults to `backend/data/battery_tracker.db`.
- Battery inventory only uses `Checked In` and `Checked Out` states.
- Check-ins and check-outs are persisted in SQLite via the `logs` table.
