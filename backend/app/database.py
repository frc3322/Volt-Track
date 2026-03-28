from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
import os
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

from platformdirs import user_data_dir


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DEFAULT_DB_PATH = DATA_DIR / "battery_tracker.db"
REQUIRED_TABLE_COLUMNS = {
    "batteries": {
        "id",
        "name",
        "status",
        "current_voltage",
        "resistance",
        "charge_level",
        "health",
        "last_updated",
    },
    "logs": {
        "id",
        "battery_id",
        "timestamp",
        "type",
        "voltage",
        "resistance",
        "charge_level",
    },
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_desktop_runtime() -> bool:
    return os.environ.get("BATTERY_TRACKER_APP_ENV") == "desktop" or getattr(sys, "frozen", False)


def get_default_db_path() -> Path:
    if is_desktop_runtime():
        return Path(user_data_dir("VoltTrack", "VoltTrack")) / "battery_tracker.db"
    return DEFAULT_DB_PATH


def get_db_path() -> Path:
    configured_path = os.environ.get("BATTERY_TRACKER_DB_PATH")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return get_default_db_path()


def get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        has_batteries_table = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'batteries'"
        ).fetchone() is not None
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS batteries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                current_voltage REAL NOT NULL,
                resistance REAL NOT NULL,
                charge_level INTEGER NOT NULL,
                health TEXT NOT NULL,
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
                health TEXT,
                FOREIGN KEY (battery_id) REFERENCES batteries(id) ON DELETE CASCADE
            );
            """
        )

        add_health_column_if_missing(connection)
        migrate_health_to_strings(connection)

        if not has_batteries_table:
            seed_database(connection)
        normalize_legacy_statuses(connection)


def add_health_column_if_missing(connection: sqlite3.Connection) -> None:
    columns = {
        row[1]
        for row in connection.execute("PRAGMA table_info(logs)").fetchall()
    }
    if "health" not in columns:
        connection.execute("ALTER TABLE logs ADD COLUMN health TEXT")
        connection.commit()


def migrate_health_to_strings(connection: sqlite3.Connection) -> None:
    health_to_string_sql = """
        CASE
            WHEN CAST(health AS INTEGER) >= 67 THEN 'good'
            WHEN CAST(health AS INTEGER) >= 34 THEN 'fair'
            ELSE 'bad'
        END
    """
    connection.execute(
        f"""
        UPDATE batteries
        SET health = {health_to_string_sql}
        WHERE health NOT IN ('good', 'fair', 'bad')
        AND health IS NOT NULL
        """
    )
    connection.execute(
        f"""
        UPDATE logs
        SET health = {health_to_string_sql}
        WHERE health NOT IN ('good', 'fair', 'bad')
        AND health IS NOT NULL
        """
    )
    connection.commit()


def normalize_legacy_statuses(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        UPDATE batteries
        SET status = 'Checked In'
        WHERE status NOT IN ('Checked In', 'Checked Out')
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
            "good",
            (now - timedelta(hours=2)).isoformat(),
        ),
        (
            "batt-002",
            "Drone Pack Bravo",
            "Checked Out",
            24.1,
            13.5,
            98,
            "good",
            (now - timedelta(hours=24)).isoformat(),
        ),
        (
            "batt-003",
            "Heavy Lift Rig 1",
            "Checked In",
            48.6,
            8.2,
            100,
            "good",
            (now - timedelta(hours=5)).isoformat(),
        ),
        (
            "batt-004",
            "Camera Rig Backup",
            "Checked In",
            14.8,
            18.0,
            15,
            "fair",
            (now - timedelta(minutes=30)).isoformat(),
        ),
    ]
    logs = [
        # Add logs — one per battery at initial entry time
        (
            "log-add-001",
            "batt-001",
            (now - timedelta(hours=72)).isoformat(),
            "add",
            24.8,
            12.0,
            100,
            "good",
        ),
        (
            "log-add-002",
            "batt-002",
            (now - timedelta(hours=96)).isoformat(),
            "add",
            24.8,
            13.5,
            100,
            "good",
        ),
        (
            "log-add-003",
            "batt-003",
            (now - timedelta(hours=5)).isoformat(),
            "add",
            48.6,
            8.2,
            100,
            "good",
        ),
        (
            "log-add-004",
            "batt-004",
            (now - timedelta(minutes=30)).isoformat(),
            "add",
            14.8,
            18.0,
            15,
            "fair",
        ),
        # Checkout / checkin logs
        (
            "log-1",
            "batt-001",
            (now - timedelta(hours=48)).isoformat(),
            "checkout",
            24.5,
            12.0,
            100,
            "good",
        ),
        (
            "log-2",
            "batt-001",
            (now - timedelta(hours=2)).isoformat(),
            "checkin",
            24.2,
            12.5,
            95,
            "good",
        ),
        (
            "log-3",
            "batt-002",
            (now - timedelta(hours=24)).isoformat(),
            "checkout",
            24.1,
            13.5,
            98,
            "good",
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
            id, battery_id, timestamp, type, voltage, resistance, charge_level, health
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        logs,
    )
    connection.commit()


def validate_database_file(db_path: Path) -> None:
    try:
        with sqlite3.connect(db_path) as connection:
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
            }

            missing_tables = [
                table_name for table_name in REQUIRED_TABLE_COLUMNS if table_name not in tables
            ]
            if missing_tables:
                raise ValueError(
                    f"Imported database is missing required tables: {', '.join(missing_tables)}"
                )

            for table_name, expected_columns in REQUIRED_TABLE_COLUMNS.items():
                columns = {
                    row[1]
                    for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
                }
                missing_columns = sorted(expected_columns - columns)
                if missing_columns:
                    raise ValueError(
                        f"Imported database is missing required columns in {table_name}: "
                        f"{', '.join(missing_columns)}"
                    )
    except sqlite3.DatabaseError as error:
        raise ValueError("Imported file is not a valid VoltTrack database.") from error


def replace_database_file(contents: bytes) -> None:
    if not contents:
        raise ValueError("Imported file is empty.")

    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with NamedTemporaryFile(
        mode="wb",
        delete=False,
        dir=db_path.parent,
        prefix="volttrack-import-",
        suffix=".db",
    ) as temporary_file:
        temporary_file.write(contents)
        temporary_path = Path(temporary_file.name)

    try:
        validate_database_file(temporary_path)
        os.replace(temporary_path, db_path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()
