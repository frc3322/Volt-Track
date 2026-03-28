from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


BatteryStatus = Literal["Checked In", "Checked Out"]
LogType = Literal["checkout", "checkin", "add"]
HealthStatus = Literal["good", "fair", "bad"]


class BatteryBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    voltage: float = Field(gt=0)
    resistance: float = Field(ge=0)
    chargeLevel: int = Field(ge=0, le=200)


class BatteryCreate(BatteryBase):
    health: HealthStatus = "good"
    status: BatteryStatus = "Checked In"


class BatteryAction(BaseModel):
    voltage: float = Field(gt=0)
    resistance: float = Field(ge=0)
    chargeLevel: int = Field(ge=0, le=200)
    health: HealthStatus | None = None


class BatteryResponse(BaseModel):
    id: str
    name: str
    status: BatteryStatus
    currentVoltage: float
    resistance: float
    chargeLevel: int
    health: HealthStatus
    lastUpdated: str


class LogResponse(BaseModel):
    id: str
    batteryId: str
    timestamp: str
    type: LogType
    voltage: float
    resistance: float
    chargeLevel: int
    health: HealthStatus | None = None


class ExportSnapshotResponse(BaseModel):
    exportedAt: str
    batteries: list[BatteryResponse]
    logs: list[LogResponse]


class DatabaseMutationResponse(BaseModel):
    status: str
    batteryCount: int
    logCount: int


class SummaryResponse(BaseModel):
    totalBatteries: int
    checkedIn: int
    checkedOut: int
    fleetHealth: str | None
