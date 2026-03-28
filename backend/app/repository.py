from __future__ import annotations

import sqlite3

from .database import get_connection


def list_batteries() -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute(
            "SELECT * FROM batteries ORDER BY name COLLATE NOCASE"
        ).fetchall()


def get_battery(battery_id: str) -> sqlite3.Row | None:
    with get_connection() as connection:
        return connection.execute(
            "SELECT * FROM batteries WHERE id = ?",
            (battery_id,),
        ).fetchone()


def list_logs(
    battery_id: str | None = None,
    limit: int | None = None,
) -> list[sqlite3.Row]:
    query = "SELECT * FROM logs"
    params: tuple[object, ...] = ()
    if battery_id:
        query += " WHERE battery_id = ?"
        params = (battery_id,)

    query += " ORDER BY timestamp DESC"
    if limit is not None:
        query += " LIMIT ?"
        params = (*params, limit)

    with get_connection() as connection:
        return connection.execute(query, params).fetchall()


def insert_battery(
    *,
    battery_id: str,
    name: str,
    status: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    health: int,
    last_updated: str,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO batteries (
                id, name, status, current_voltage, resistance, charge_level, health, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                battery_id,
                name,
                status,
                voltage,
                resistance,
                charge_level,
                health,
                last_updated,
            ),
        )
        connection.commit()

def insert_log(
    *,
    log_id: str,
    battery_id: str,
    timestamp: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    log_type: str,
    health: int | None = None,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO logs (
                id, battery_id, timestamp, type, voltage, resistance, charge_level, health
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (log_id, battery_id, timestamp, log_type, voltage, resistance, charge_level, health),
        )
        connection.commit()

def update_battery(
    *,
    battery_id: str,
    status: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    health: int | None = None,
    last_updated: str,
) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE batteries
            SET status = ?, current_voltage = ?, resistance = ?, charge_level = ?,
                health = COALESCE(?, health), last_updated = ?
            WHERE id = ?
            """,
            (status, voltage, resistance, charge_level, health, last_updated, battery_id),
        )
        connection.commit()
    return cursor.rowcount > 0


def apply_action(
    *,
    battery_id: str,
    status: str,
    voltage: float,
    resistance: float,
    charge_level: int,
    health: int | None,
    last_updated: str,
    log_id: str,
    log_type: str,
) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE batteries
            SET status = ?, current_voltage = ?, resistance = ?, charge_level = ?,
                health = COALESCE(?, health), last_updated = ?
            WHERE id = ?
            """,
            (status, voltage, resistance, charge_level, health, last_updated, battery_id),
        )
        if cursor.rowcount == 0:
            return False
        connection.execute(
            """
            INSERT INTO logs (id, battery_id, timestamp, type, voltage, resistance, charge_level, health)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (log_id, battery_id, last_updated, log_type, voltage, resistance, charge_level, health),
        )
        connection.commit()
    return True


def delete_battery(battery_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM batteries WHERE id = ?", (battery_id,))
        connection.commit()
    return cursor.rowcount > 0


def clear_database() -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM logs")
        connection.execute("DELETE FROM batteries")
        connection.commit()


def get_summary() -> dict[str, int]:
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
        "total": total,
        "checked_in": counts.get("Checked In", 0),
        "checked_out": counts.get("Checked Out", 0),
        "average_health": int(avg_health),
    }


def get_battery_status(battery_id: str) -> str | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT status FROM batteries WHERE id = ?",
            (battery_id,),
        ).fetchone()
    return row["status"] if row else None
