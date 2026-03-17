import { Battery, LogRecord } from '../types';

export const INITIAL_BATTERIES: Battery[] = [
  {
    id: 'batt-001',
    name: 'Drone Pack Alpha',
    status: 'Checked In',
    currentVoltage: 24.2,
    resistance: 12.5,
    chargeLevel: 95,
    health: 98,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'batt-002',
    name: 'Drone Pack Bravo',
    status: 'Checked Out',
    currentVoltage: 22.8,
    resistance: 14.1,
    chargeLevel: 45,
    health: 92,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'batt-003',
    name: 'Heavy Lift Rig 1',
    status: 'Checked In',
    currentVoltage: 48.6,
    resistance: 8.2,
    chargeLevel: 100,
    health: 99,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'batt-004',
    name: 'Camera Rig Backup',
    status: 'Checked In',
    currentVoltage: 14.8,
    resistance: 18.0,
    chargeLevel: 15,
    health: 85,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 0.5).toISOString(),
  }
];

export const INITIAL_LOGS: LogRecord[] = [
  {
    id: 'log-1',
    batteryId: 'batt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    type: 'checkout',
    voltage: 24.5,
    resistance: 12.0,
    chargeLevel: 100,
  },
  {
    id: 'log-2',
    batteryId: 'batt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    type: 'checkin',
    voltage: 24.2,
    resistance: 12.5,
    chargeLevel: 95,
  },
  {
    id: 'log-3',
    batteryId: 'batt-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    type: 'checkout',
    voltage: 24.1,
    resistance: 13.5,
    chargeLevel: 98,
  },
];
