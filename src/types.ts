export type BatteryStatus = 'Checked In' | 'Checked Out';

export interface Battery {
  id: string;
  name: string;
  status: BatteryStatus;
  currentVoltage: number;
  resistance: number;
  chargeLevel: number;
  health: number; // 0-100
  lastUpdated: string;
}

export interface LogRecord {
  id: string;
  batteryId: string;
  timestamp: string;
  type: 'checkout' | 'checkin' | 'add';
  voltage: number;
  resistance: number;
  chargeLevel: number;
  health: number | null;
}

export interface BatteryActionPayload {
  voltage: number;
  resistance: number;
  chargeLevel: number;
  health?: number;
}

export interface BatteryCreatePayload extends BatteryActionPayload {
  name: string;
}


export interface ExportSnapshot {
  exportedAt: string;
  batteries: Battery[];
  logs: LogRecord[];
}
