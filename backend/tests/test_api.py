from __future__ import annotations

import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import HTTPException

from backend.app.database import init_db
from backend.app.main import (
    add_battery,
    app,
    battery,
    checkin_battery,
    clear_database_file,
    checkout_battery,
    health,
    import_database_file,
    remove_battery,
    snapshot,
    summary,
)
from backend.app.schemas import BatteryAction, BatteryCreate


class BatteryTrackerApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test-battery-tracker.db"
        self.previous_db_path = os.environ.get("BATTERY_TRACKER_DB_PATH")
        os.environ["BATTERY_TRACKER_DB_PATH"] = str(self.db_path)
        init_db()

    def tearDown(self) -> None:
        if self.previous_db_path is None:
            os.environ.pop("BATTERY_TRACKER_DB_PATH", None)
        else:
            os.environ["BATTERY_TRACKER_DB_PATH"] = self.previous_db_path
        self.temp_dir.cleanup()

    def test_health_and_summary_are_served_without_flask_mount(self) -> None:
        self.assertEqual(health(), {"status": "ok", "framework": "fastapi"})
        self.assertEqual(summary()["totalBatteries"], 4)
        self.assertFalse(any(route.path.startswith("/flask") for route in app.routes))

    def test_battery_lifecycle_enforces_checkin_before_removal(self) -> None:
        created_battery = add_battery(
            BatteryCreate(
                name="Field Pack Delta",
                voltage=22.1,
                resistance=10.2,
                chargeLevel=92,
            )
        )
        battery_id = created_battery["id"]

        checked_out = checkout_battery(
            battery_id,
            BatteryAction(voltage=21.4, resistance=11.1, chargeLevel=70),
        )
        self.assertEqual(checked_out["status"], "Checked Out")

        with self.assertRaises(HTTPException) as blocked_delete:
            remove_battery(battery_id)
        self.assertEqual(blocked_delete.exception.status_code, 409)

        checked_in = checkin_battery(
            battery_id,
            BatteryAction(voltage=21.0, resistance=11.8, chargeLevel=35),
        )
        self.assertEqual(checked_in["status"], "Checked In")

        delete_response = remove_battery(battery_id)
        self.assertEqual(delete_response.status_code, 204)

        with self.assertRaises(HTTPException) as missing_battery:
            battery(battery_id)
        self.assertEqual(missing_battery.exception.status_code, 404)

    def test_database_can_be_cleared_and_restored_from_backup_file(self) -> None:
        original_snapshot = snapshot()
        backup_bytes = self.db_path.read_bytes()

        cleared = clear_database_file()
        self.assertEqual(cleared["status"], "cleared")
        self.assertEqual(cleared["batteryCount"], 0)
        self.assertEqual(summary()["totalBatteries"], 0)

        restored = import_database_file(backup_bytes)
        self.assertEqual(restored["status"], "imported")
        self.assertEqual(restored["batteryCount"], len(original_snapshot["batteries"]))
        self.assertEqual(restored["logCount"], len(original_snapshot["logs"]))
        self.assertEqual(summary()["totalBatteries"], len(original_snapshot["batteries"]))
