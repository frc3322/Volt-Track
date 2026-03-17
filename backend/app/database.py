from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "battery_tracker.db"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS batteries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                current_voltage REAL NOT NULL,
                resistance REAL NOT NULL,
                charge_level INTEGER NOT NULL,
                health INTEGER NOT NULL,
                last_updated TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                battery_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                voltage REAL NOT NULL,
                resistance REAL NOT NULL,
                charge_level INTEGER NOT NULL,
                FOREIGN KEY (battery_id) REFERENCES batteries(id) ON DELETE CASCADE
            );
            """
        )

        battery_count = connection.execute("SELECT COUNT(*) FROM batteries").fetchone()[0]
        if battery_count == 0:
            seed_database(connection)
        normalize_legacy_statuses(connection)


def normalize_legacy_statuses(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        UPDATE batteries
        SET status = CASE
            WHEN status = 'Checked Out' THEN 'Checked Out'
            ELSE 'Checked In'
        END
        """
    )
    connection.commit()


def seed_database(connection: sqlite3.Connection) -> None:
    now = datetime.now(timezone.utc)
    batteries = [
        (
            "batt-001",
            "Drone Pack Alpha",
            "Checked In",
            24.2,
            12.5,
            95,
            98,
            (now - timedelta(hours=2)).isoformat(),
        ),
        (
            "batt-002",
            "Drone Pack Bravo",
            "Checked Out",
            22.8,
            14.1,
            45,
            92,
            (now - timedelta(days=1)).isoformat(),
        ),
        (
            "batt-003",
            "Heavy Lift Rig 1",
            "Checked In",
            48.6,
            8.2,
            100,
            99,
            (now - timedelta(hours=5)).isoformat(),
        ),
        (
            "batt-004",
            "Camera Rig Backup",
            "Checked In",
            14.8,
            18.0,
            15,
            85,
            (now - timedelta(minutes=30)).isoformat(),
        ),
    ]
    logs = [
        (
            "log-1",
            "batt-001",
            (now - timedelta(hours=48)).isoformat(),
            "checkout",
            24.5,
            12.0,
            100,
        ),
        (
            "log-2",
            "batt-001",
            (now - timedelta(hours=2)).isoformat(),
            "checkin",
            24.2,
            12.5,
            95,
        ),
        (
            "log-3",
            "batt-002",
            (now - timedelta(hours=24)).isoformat(),
            "checkout",
            24.1,
            13.5,
            98,
        ),
    ]

    connection.executemany(
        """
        INSERT INTO batteries (
            id, name, status, current_voltage, resistance, charge_level, health, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        batteries,
    )
    connection.executemany(
        """
        INSERT INTO logs (
            id, battery_id, timestamp, type, voltage, resistance, charge_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        logs,
    )
    connection.commit()
