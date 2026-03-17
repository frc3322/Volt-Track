import { useEffect, useState } from 'react';
import { LogIn, LogOut, BarChart3, Zap, BatteryFull } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CheckoutForm from './components/CheckoutForm';
import CheckinForm from './components/CheckinForm';
import ManageBatteriesPanel from './components/ManageBatteriesPanel';
import { Battery, LogRecord } from './types';
import {
  checkinBattery,
  checkoutBattery,
  createBattery,
  fetchBatteries,
  fetchLogs,
  removeBattery,
} from './api';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'checkin' | 'manage'>('dashboard');
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setErrorMessage(null);
    const [batteryData, logData] = await Promise.all([fetchBatteries(), fetchLogs()]);
    setBatteries(batteryData);
    setLogs(logData);
  };

  const runMutation = async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    setErrorMessage(null);
    try {
      return await operation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save battery changes.');
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const [batteryData, logData] = await Promise.all([fetchBatteries(), fetchLogs()]);
        if (cancelled) {
          return;
        }
        setBatteries(batteryData);
        setLogs(logData);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load battery data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddBattery = async (name: string, voltage: number, resistance: number, chargeLevel: number) => {
    await runMutation(async () => {
      await createBattery({ name, voltage, resistance, chargeLevel });
      await loadData();
    });
  };

  const handleRemoveBattery = async (batteryId: string) => {
    const battery = batteries.find((entry) => entry.id === batteryId);
    if (!battery || battery.status === 'Checked Out') {
      return false;
    }

    const result = await runMutation(async () => {
      await removeBattery(batteryId);
      await loadData();
      return true;
    });
    return result ?? false;
  };

  const handleCheckout = async (batteryId: string, voltage: number, resistance: number, chargeLevel: number) => {
    const result = await runMutation(async () => {
      await checkoutBattery(batteryId, { voltage, resistance, chargeLevel });
      await loadData();
      return true;
    });
    if (result) {
      setActiveTab('dashboard');
    }
  };

  const handleCheckin = async (batteryId: string, voltage: number, resistance: number, chargeLevel: number) => {
    const result = await runMutation(async () => {
      await checkinBattery(batteryId, { voltage, resistance, chargeLevel });
      await loadData();
      return true;
    });
    if (result) {
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-center justify-between mb-10 pb-6 border-b border-white/5 gap-6">
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl neu-panel neu-outset flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-wide">VoltTrack</h1>
            <p className="text-sm text-gray-500 font-medium tracking-wider uppercase">Battery State Manager</p>
          </div>
        </div>

        <nav className="flex items-center gap-4 bg-[#1e2228] p-2 rounded-2xl border border-white/5 neu-inset">
          <button
            onClick={() => setActiveTab('dashboard')}
            data-active={activeTab === 'dashboard'}
            className="neu-tab"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('checkout')}
            data-active={activeTab === 'checkout'}
            className="neu-tab"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Check Out</span>
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            data-active={activeTab === 'checkin'}
            className="neu-tab"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden md:inline">Check In</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            data-active={activeTab === 'manage'}
            className="neu-tab"
          >
            <BatteryFull className="w-4 h-4" />
            <span className="hidden md:inline">Manage</span>
          </button>
        </nav>
      </header>

      <main className="flex-1 w-full">
        {isLoading && (
          <div className="neu-card text-center text-gray-300">Loading battery data...</div>
        )}
        {!isLoading && errorMessage && (
          <div className="neu-card border border-red-500/20 text-red-300">
            Unable to reach the backend. Start the API server and reload the page.
            <div className="mt-2 text-sm text-red-200/80">{errorMessage}</div>
          </div>
        )}
        {!isLoading && !errorMessage && (
          <>
            {activeTab === 'dashboard' && <Dashboard batteries={batteries} logs={logs} />}
            {activeTab === 'checkout' && <CheckoutForm batteries={batteries} onCheckout={handleCheckout} />}
            {activeTab === 'checkin' && <CheckinForm batteries={batteries} onCheckin={handleCheckin} />}
            {activeTab === 'manage' && (
              <ManageBatteriesPanel
                batteries={batteries}
                onAddBattery={handleAddBattery}
                onRemoveBattery={handleRemoveBattery}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
