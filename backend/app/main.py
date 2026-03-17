from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Body, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .database import get_db_path, init_db
from .services import (
    apply_battery_action,
    clear_database,
    create_battery,
    delete_battery,
    export_snapshot,
    get_battery_by_id,
    get_summary,
    import_database,
    list_batteries,
    list_logs,
)
from .schemas import (
    BatteryAction,
    BatteryCreate,
    BatteryResponse,
    DatabaseMutationResponse,
    ExportSnapshotResponse,
    LogResponse,
    SummaryResponse,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Battery Tracker Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "framework": "fastapi"}


@app.get("/summary", response_model=SummaryResponse)
def summary() -> dict:
    return get_summary()


@app.get("/exports/snapshot", response_model=ExportSnapshotResponse)
def snapshot() -> dict:
    return export_snapshot()


@app.get("/database/export")
def export_database() -> FileResponse:
    db_path = get_db_path()
    filename = f"volttrack-backup-{db_path.stem}.db"
    return FileResponse(
        path=db_path,
        media_type="application/x-sqlite3",
        filename=filename,
    )


@app.post("/database/import", response_model=DatabaseMutationResponse)
def import_database_file(contents: bytes = Body(..., media_type="application/octet-stream")) -> dict:
    try:
        return import_database(contents)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/database/clear", response_model=DatabaseMutationResponse)
def clear_database_file() -> dict:
    return clear_database()


@app.get("/batteries", response_model=list[BatteryResponse])
def batteries() -> list[dict]:
    return list_batteries()


@app.get("/batteries/{battery_id}", response_model=BatteryResponse)
def battery(battery_id: str) -> dict:
    record = get_battery_by_id(battery_id)
    if not record:
        raise HTTPException(status_code=404, detail="Battery not found")
    return record


@app.post("/batteries", response_model=BatteryResponse, status_code=201)
def add_battery(payload: BatteryCreate) -> dict:
    return create_battery(
        name=payload.name,
        voltage=payload.voltage,
        resistance=payload.resistance,
        charge_level=payload.chargeLevel,
        health=payload.health,
        status=payload.status,
    )


@app.post("/batteries/{battery_id}/checkout", response_model=BatteryResponse)
def checkout_battery(battery_id: str, payload: BatteryAction) -> dict:
    record = apply_battery_action(
        battery_id=battery_id,
        voltage=payload.voltage,
        resistance=payload.resistance,
        charge_level=payload.chargeLevel,
        log_type="checkout",
        next_status="Checked Out",
    )
    if not record:
        raise HTTPException(status_code=404, detail="Battery not found")
    return record


@app.post("/batteries/{battery_id}/checkin", response_model=BatteryResponse)
def checkin_battery(battery_id: str, payload: BatteryAction) -> dict:
    record = apply_battery_action(
        battery_id=battery_id,
        voltage=payload.voltage,
        resistance=payload.resistance,
        charge_level=payload.chargeLevel,
        log_type="checkin",
        next_status="Checked In",
    )
    if not record:
        raise HTTPException(status_code=404, detail="Battery not found")
    return record


@app.delete("/batteries/{battery_id}", status_code=204)
def remove_battery(battery_id: str) -> Response:
    try:
        deleted = delete_battery(battery_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    if not deleted:
        raise HTTPException(status_code=404, detail="Battery not found")
    return Response(status_code=204)


@app.get("/logs", response_model=list[LogResponse])
def logs(
    battery_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
) -> list[dict]:
    return list_logs(battery_id=battery_id, limit=limit)
