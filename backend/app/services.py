from __future__ import annotations

import sqlite3
from uuid import uuid4

from .database import init_db, replace_database_file, utc_now_iso
from .repository import (
    clear_database as clear_database_records,
    delete_battery as delete_battery_record,
    get_battery,
    get_battery_status,
    get_summary as fetch_summary,
    insert_battery,
    insert_log,
    list_batteries as fetch_batteries,
    list_logs as fetch_logs,
    update_battery,
)


def _battery_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "currentVoltage": row["current_voltage"],
        "resistance": row["resistance"],
        "chargeLevel": row["charge_level"],
        "health": row["health"],
        "lastUpdated": row["last_updated"],
    }


def _log_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "batteryId": row["battery_id"],
        "timestamp": row["timestamp"],
        "type": row["type"],
        "voltage": row["voltage"],
        "resistance": row["resistance"],
        "chargeLevel": row["charge_level"],
    }


def list_batteries() -> list[dict]:
    return [_battery_row_to_dict(row) for row in fetch_batteries()]


def get_battery_by_id(battery_id: str) -> dict | None:
    row = get_battery(battery_id)
    return _battery_row_to_dict(row) if row else None


def list_logs(battery_id: str | None = None, limit: int | None = 50) -> list[dict]:
    return [_log_row_to_dict(row) for row in fetch_logs(battery_id=battery_id, limit=limit)]


def create_battery(
    *,
    name: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    health: int,
    status: str,
) -> dict:
    battery_id = f"batt-{uuid4().hex[:10]}"
    timestamp = utc_now_iso()

    insert_battery(
        battery_id=battery_id,
        name=name,
        status=status,
        voltage=voltage,
        resistance=resistance,
        charge_level=charge_level,
        health=health,
        last_updated=timestamp,
    )
    insert_log(
        log_id=f"log-{uuid4().hex[:10]}",
        battery_id=battery_id,
        timestamp=timestamp,
        voltage=voltage,
        resistance=resistance,
        charge_level=charge_level,
        log_type="add",
    )
    return get_battery_by_id(battery_id)


def apply_battery_action(
    *,
    battery_id: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    log_type: str,
    next_status: str,
) -> dict | None:
    timestamp = utc_now_iso()
    updated = update_battery(
        battery_id=battery_id,
        status=next_status,
        voltage=voltage,
        resistance=resistance,
        charge_level=charge_level,
        last_updated=timestamp,
    )
    if not updated:
        return None

    insert_log(
        log_id=f"log-{uuid4().hex[:10]}",
        battery_id=battery_id,
        timestamp=timestamp,
        voltage=voltage,
        resistance=resistance,
        charge_level=charge_level,
        log_type=log_type,
    )
    return get_battery_by_id(battery_id)


def delete_battery(battery_id: str) -> bool:
    status = get_battery_status(battery_id)
    if status is None:
        return False
    if status == "Checked Out":
        raise ValueError("Cannot remove a checked out battery")
    return delete_battery_record(battery_id)


def get_summary() -> dict:
    summary = fetch_summary()
    return {
        "totalBatteries": summary["total"],
        "checkedIn": summary["checked_in"],
        "checkedOut": summary["checked_out"],
        "averageHealth": summary["average_health"],
    }


def export_snapshot() -> dict:
    return {
        "exportedAt": utc_now_iso(),
        "batteries": list_batteries(),
        "logs": list_logs(limit=None),
    }


def import_database(contents: bytes) -> dict:
    replace_database_file(contents)
    init_db()
    return {
        "status": "imported",
        "batteryCount": len(list_batteries()),
        "logCount": len(list_logs(limit=None)),
    }


def clear_database() -> dict:
    clear_database_records()
    return {
        "status": "cleared",
        "batteryCount": 0,
        "logCount": 0,
    }
