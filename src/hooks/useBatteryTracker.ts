import { useEffect, useState } from 'react';
import {
  checkinBattery as submitCheckin,
  clearDatabase as submitClearDatabase,
  checkoutBattery as submitCheckout,
  createBattery,
  fetchBatteries,
  fetchRecentLogs,
  importDatabaseBackup as submitDatabaseImport,
  removeBattery as submitRemoval,
} from '@/api';
import { isDesktopApp } from '@/desktop';
import { Battery, BatteryActionPayload, BatteryCreatePayload, LogRecord } from '@/types';

interface TrackerState {
  batteries: Battery[];
  logs: LogRecord[];
  isLoading: boolean;
  errorMessage: string | null;
}

interface MutationResult {
  ok: boolean;
  error?: string;
}

const initialState: TrackerState = {
  batteries: [],
  logs: [],
  isLoading: true,
  errorMessage: null,
};

const DESKTOP_LOAD_RETRY_ATTEMPTS = 20;
const DESKTOP_LOAD_RETRY_DELAY_MS = 250;

function sleep(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function useBatteryTracker() {
  const [state, setState] = useState<TrackerState>(initialState);

  const loadData = async () => {
    const [batteries, logs] = await Promise.all([fetchBatteries(), fetchRecentLogs()]);
    setState((current) => ({
      ...current,
      batteries,
      logs,
      errorMessage: null,
    }));
  };

  const runMutation = async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    setState((current) => ({ ...current, errorMessage: null }));
    try {
      const result = await operation();
      await loadData();
      return result;
    } catch (error) {
      setState((current) => ({
        ...current,
        errorMessage: error instanceof Error ? error.message : 'Unable to save battery changes.',
      }));
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        let batteries: Battery[] = [];
        let logs: LogRecord[] = [];
        let attemptsRemaining = isDesktopApp() ? DESKTOP_LOAD_RETRY_ATTEMPTS : 1;
        let lastError: unknown = null;

        while (attemptsRemaining > 0) {
          try {
            [batteries, logs] = await Promise.all([fetchBatteries(), fetchRecentLogs()]);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            attemptsRemaining -= 1;
            if (attemptsRemaining === 0) {
              throw error;
            }
            await sleep(DESKTOP_LOAD_RETRY_DELAY_MS);
          }
        }

        if (lastError) {
          throw lastError;
        }

        if (cancelled) {
          return;
        }
        setState({
          batteries,
          logs,
          isLoading: false,
          errorMessage: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState((current) => ({
          ...current,
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : 'Unable to load battery data.',
        }));
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const addBattery = async (name: string, voltage: number, resistance: number, chargeLevel: number) => {
    const payload: BatteryCreatePayload = { name, voltage, resistance, chargeLevel };
    await runMutation(() => createBattery(payload));
  };

  const removeBattery = async (batteryId: string) => {
    const battery = state.batteries.find((entry) => entry.id === batteryId);
    if (!battery || battery.status === 'Checked Out') {
      return false;
    }

    const removed = await runMutation(async () => {
      await submitRemoval(batteryId);
      return true;
    });
    return removed ?? false;
  };

  const checkoutBattery = async (batteryId: string, payload: BatteryActionPayload) => {
    return runMutation(() => submitCheckout(batteryId, payload));
  };

  const checkinBattery = async (batteryId: string, payload: BatteryActionPayload) => {
    return runMutation(() => submitCheckin(batteryId, payload));
  };

  const importDatabase = async (file: File) => {
    setState((current) => ({ ...current, errorMessage: null }));
    try {
      await submitDatabaseImport(file);
      await loadData();
      return { ok: true } satisfies MutationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import the database backup.';
      setState((current) => ({ ...current, errorMessage: message }));
      return {
        ok: false,
        error: message,
      } satisfies MutationResult;
    }
  };

  const clearDatabase = async () => {
    setState((current) => ({ ...current, errorMessage: null }));
    try {
      await submitClearDatabase();
      await loadData();
      return { ok: true } satisfies MutationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to clear the database.';
      setState((current) => ({ ...current, errorMessage: message }));
      return {
        ok: false,
        error: message,
      } satisfies MutationResult;
    }
  };

  return {
    ...state,
    addBattery,
    removeBattery,
    checkoutBattery,
    checkinBattery,
    importDatabase,
    clearDatabase,
  };
}
