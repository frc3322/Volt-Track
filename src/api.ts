import { Battery, BatteryActionPayload, BatteryCreatePayload, LogRecord } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...init?.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchBatteries(): Promise<Battery[]> {
  return request<Battery[]>('/batteries');
}

export function fetchLogs(limit = 100): Promise<LogRecord[]> {
  return request<LogRecord[]>(`/logs?limit=${limit}`);
}

export function createBattery(payload: BatteryCreatePayload): Promise<Battery> {
  return request<Battery>('/batteries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkoutBattery(batteryId: string, payload: BatteryActionPayload): Promise<Battery> {
  return request<Battery>(`/batteries/${batteryId}/checkout`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkinBattery(batteryId: string, payload: BatteryActionPayload): Promise<Battery> {
  return request<Battery>(`/batteries/${batteryId}/checkin`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeBattery(batteryId: string): Promise<void> {
  return request<void>(`/batteries/${batteryId}`, {
    method: 'DELETE',
  });
}
