from __future__ import annotations

import sqlite3
from uuid import uuid4

from .database import get_connection, utc_now_iso


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
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM batteries ORDER BY name COLLATE NOCASE"
        ).fetchall()
    return [_battery_row_to_dict(row) for row in rows]


def get_battery(battery_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM batteries WHERE id = ?",
            (battery_id,),
        ).fetchone()
    return _battery_row_to_dict(row) if row else None


def list_logs(battery_id: str | None = None, limit: int = 50) -> list[dict]:
    query = "SELECT * FROM logs"
    params: tuple[object, ...]
    if battery_id:
        query += " WHERE battery_id = ?"
        params = (battery_id, limit)
        query += " ORDER BY timestamp DESC LIMIT ?"
    else:
        params = (limit,)
        query += " ORDER BY timestamp DESC LIMIT ?"

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    return [_log_row_to_dict(row) for row in rows]


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
    log_id = f"log-{uuid4().hex[:10]}"
    timestamp = utc_now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO batteries (
                id, name, status, current_voltage, resistance, charge_level, health, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (battery_id, name, status, voltage, resistance, charge_level, health, timestamp),
        )
        connection.execute(
            """
            INSERT INTO logs (
                id, battery_id, timestamp, type, voltage, resistance, charge_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (log_id, battery_id, timestamp, "add", voltage, resistance, charge_level),
        )
        connection.commit()

    return get_battery(battery_id)


def delete_battery(battery_id: str) -> bool:
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT status FROM batteries WHERE id = ?",
            (battery_id,),
        ).fetchone()
        if not existing:
            return False
        if existing["status"] == "Checked Out":
            raise ValueError("Cannot remove a checked out battery")

        connection.execute("DELETE FROM batteries WHERE id = ?", (battery_id,))
        connection.commit()

    return True


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
    log_id = f"log-{uuid4().hex[:10]}"

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM batteries WHERE id = ?",
            (battery_id,),
        ).fetchone()
        if not existing:
            return None

        connection.execute(
            """
            UPDATE batteries
            SET status = ?, current_voltage = ?, resistance = ?, charge_level = ?, last_updated = ?
            WHERE id = ?
            """,
            (next_status, voltage, resistance, charge_level, timestamp, battery_id),
        )
        connection.execute(
            """
            INSERT INTO logs (
                id, battery_id, timestamp, type, voltage, resistance, charge_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (log_id, battery_id, timestamp, log_type, voltage, resistance, charge_level),
        )
        connection.commit()

    return get_battery(battery_id)


def get_summary() -> dict:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT status, COUNT(*) AS count FROM batteries GROUP BY status"
        ).fetchall()
        total = connection.execute("SELECT COUNT(*) FROM batteries").fetchone()[0]
        avg_health = connection.execute(
            "SELECT COALESCE(ROUND(AVG(health)), 0) FROM batteries"
        ).fetchone()[0]

    counts = {row["status"]: row["count"] for row in rows}
    return {
        "totalBatteries": total,
        "checkedIn": counts.get("Checked In", 0),
        "checkedOut": counts.get("Checked Out", 0),
        "averageHealth": int(avg_health),
    }


def flask_counts() -> dict:
    summary = get_summary()
    return {
        "total": summary["totalBatteries"],
        "checked_in": summary["checkedIn"],
        "checked_out": summary["checkedOut"],
    }
