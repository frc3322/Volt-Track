import { useEffect, useState } from 'react';
import {
  checkinBattery as submitCheckin,
  checkoutBattery as submitCheckout,
  createBattery,
  fetchBatteries,
  fetchLogs,
  removeBattery as submitRemoval,
} from '@/api';
import { Battery, BatteryActionPayload, BatteryCreatePayload, LogRecord } from '@/types';

interface TrackerState {
  batteries: Battery[];
  logs: LogRecord[];
  isLoading: boolean;
  errorMessage: string | null;
}

const initialState: TrackerState = {
  batteries: [],
  logs: [],
  isLoading: true,
  errorMessage: null,
};

export function useBatteryTracker() {
  const [state, setState] = useState<TrackerState>(initialState);

  const loadData = async () => {
    const [batteries, logs] = await Promise.all([fetchBatteries(), fetchLogs()]);
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
        const [batteries, logs] = await Promise.all([fetchBatteries(), fetchLogs()]);
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

  return {
    ...state,
    addBattery,
    removeBattery,
    checkoutBattery,
    checkinBattery,
  };
}
