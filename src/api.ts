import { Battery, BatteryActionPayload, BatteryCreatePayload, ExportSnapshot, LogRecord } from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

let apiBaseUrl = DEFAULT_API_BASE_URL;

interface FetchLogsOptions {
  batteryId?: string;
  limit?: number;
}

export function setApiBaseUrl(baseUrl: string) {
  apiBaseUrl = baseUrl.replace(/\/$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
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

export function fetchLogs(options: FetchLogsOptions = {}): Promise<LogRecord[]> {
  const params = new URLSearchParams();
  if (options.batteryId) {
    params.set('battery_id', options.batteryId);
  }
  if (typeof options.limit === 'number') {
    params.set('limit', options.limit.toString());
  }

  const query = params.toString();
  return request<LogRecord[]>(query ? `/logs?${query}` : '/logs');
}

export function fetchRecentLogs(limit = 100): Promise<LogRecord[]> {
  return fetchLogs({ limit });
}

export function fetchBatteryLogs(batteryId: string): Promise<LogRecord[]> {
  return fetchLogs({ batteryId });
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


export function fetchExportSnapshot(): Promise<ExportSnapshot> {
  return request<ExportSnapshot>('/exports/snapshot');
}


export async function exportDatabaseBackup(): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/database/export`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.blob();
}


export async function importDatabaseBackup(file: File): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/database/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
}


export function clearDatabase(): Promise<void> {
  return request<void>('/database/clear', {
    method: 'POST',
  });
}
