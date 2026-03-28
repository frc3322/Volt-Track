import { useState } from 'react';
import { BatteryFull, BarChart3, ClipboardEdit, LogIn, LogOut, Settings2, Zap } from 'lucide-react';
import { Button } from '@/components/ui';
import { exportDatabaseBackup, fetchExportSnapshot } from '@/api';
import BatteryActionForm from '@/features/battery-actions/BatteryActionForm';
import Dashboard from '@/features/dashboard/Dashboard';
import EditHistoryPanel from '@/features/history/EditHistoryPanel';
import ManageBatteriesPanel from '@/features/inventory/ManageBatteriesPanel';
import SettingsPanel from '@/features/settings/SettingsPanel';
import {
  buildExportFileName,
  buildPdfReport,
  buildTextReport,
  downloadBlob,
} from '@/features/settings/exporters';
import { isDesktopApp } from '@/desktop';
import { useBatteryTracker } from '@/hooks/useBatteryTracker';
import { HealthStatus } from '@/types';

type AppTab = 'dashboard' | 'checkout' | 'checkin' | 'manage' | 'history';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'checkout', label: 'Check Out', icon: LogOut },
  { id: 'checkin', label: 'Check In', icon: LogIn },
  { id: 'manage', label: 'Manage', icon: BatteryFull },
  { id: 'history', label: 'Edit History', icon: ClipboardEdit },
] as const satisfies ReadonlyArray<{
  id: AppTab;
  label: string;
  icon: typeof BarChart3;
}>;

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    batteries,
    logs,
    isLoading,
    errorMessage,
    addBattery,
    removeBattery,
    checkinBattery,
    checkoutBattery,
    importDatabase,
    clearDatabase,
    loadData,
  } = useBatteryTracker();

  const handleCheckout = async (batteryId: string, voltage: number, resistance: number, chargeLevel: number, health: HealthStatus | undefined) => {
    const updated = await checkoutBattery(batteryId, { voltage, resistance, chargeLevel, health });
    if (updated) {
      setActiveTab('dashboard');
    }
  };

  const handleCheckin = async (batteryId: string, voltage: number, resistance: number, chargeLevel: number, health: HealthStatus | undefined) => {
    const updated = await checkinBattery(batteryId, { voltage, resistance, chargeLevel, health });
    if (updated) {
      setActiveTab('dashboard');
    }
  };

  const handleExportDatabase = async () => {
    const backupBlob = await exportDatabaseBackup();
    downloadBlob(backupBlob, buildExportFileName('backup', 'db'));
  };

  const handleExportText = async () => {
    const snapshot = await fetchExportSnapshot();
    const report = buildTextReport(snapshot);
    downloadBlob(
      new Blob([report], { type: 'text/plain;charset=utf-8' }),
      buildExportFileName('report', 'txt'),
    );
  };

  const handleExportPdf = async () => {
    const snapshot = await fetchExportSnapshot();
    downloadBlob(buildPdfReport(snapshot), buildExportFileName('report', 'pdf'));
  };

  const backendErrorMessage = isDesktopApp()
    ? 'The bundled backend did not start cleanly. Close the app and reopen it.'
    : 'Unable to reach the backend. Start the API server and reload the page.';

  return (
    <div className="min-h-screen px-2 py-4 md:px-3 md:py-8 flex flex-col max-w-7xl mx-auto">
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

        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          <nav className="flex items-center gap-4 bg-[#1e2228] p-2 rounded-2xl border border-white/5 neu-inset">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-active={activeTab === tab.id}
                  className="neu-tab"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <Button
            type="button"
            variant="secondary"
            className="flex items-center justify-center gap-2 px-5"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full">
        {isLoading && (
          <div className="neu-card text-center text-gray-300">Loading battery data...</div>
        )}
        {!isLoading && errorMessage && (
          <div className="neu-card border border-red-500/20 text-red-300">
            {backendErrorMessage}
            <div className="mt-2 text-sm text-red-200/80">{errorMessage}</div>
          </div>
        )}
        {!isLoading && !errorMessage && (
          <>
            {activeTab === 'dashboard' && <Dashboard batteries={batteries} logs={logs} />}
            {activeTab === 'checkout' && (
              <BatteryActionForm
                mode="checkout"
                batteries={batteries}
                onSubmit={handleCheckout}
              />
            )}
            {activeTab === 'checkin' && (
              <BatteryActionForm
                mode="checkin"
                batteries={batteries}
                onSubmit={handleCheckin}
              />
            )}
            {activeTab === 'manage' && (
              <ManageBatteriesPanel
                batteries={batteries}
                onAddBattery={addBattery}
                onRemoveBattery={removeBattery}
              />
            )}
            {activeTab === 'history' && (
              <EditHistoryPanel
                batteries={batteries}
                onDataChanged={loadData}
              />
            )}
          </>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsPanel
          batteryCount={batteries.length}
          logCount={logs.length}
          onClose={() => setIsSettingsOpen(false)}
          onImportDatabase={importDatabase}
          onExportDatabase={handleExportDatabase}
          onExportText={handleExportText}
          onExportPdf={handleExportPdf}
          onClearDatabase={clearDatabase}
        />
      )}
    </div>
  );
}

export default App;
