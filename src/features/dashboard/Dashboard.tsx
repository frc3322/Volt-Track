import { useMemo, useState } from 'react';
import { Badge, Card, Dialog } from '@/components/ui';
import { Battery, LogRecord } from '@/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  LineChart,
  Line,
  Area,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  BatteryCharging,
  CalendarClock,
  Gauge,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  batteries: Battery[];
  logs: LogRecord[];
}

interface BatteryHistoryPoint {
  id: string;
  timestamp: string;
  shortTime: string;
  fullTime: string;
  type: 'checkout' | 'checkin' | 'add' | 'snapshot';
  voltage: number;
  resistance: number;
  chargeLevel: number;
}

const tooltipCardStyle = {
  backgroundColor: '#1e2228',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '15px',
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  return {
    short: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    full: date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

function getLogTone(type: BatteryHistoryPoint['type']) {
  switch (type) {
    case 'checkout':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'checkin':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'add':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20';
  }
}

function BatteryHistoryTooltip({ active, payload, label }: Readonly<{ active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-[170px] p-3 shadow-2xl" style={tooltipCardStyle}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <div className="space-y-1 text-sm">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-gray-200">
            <span className="text-gray-400">{entry.name}</span>
            <span className="font-semibold">
              {entry.name === 'Charge' ? `${entry.value}%` : `${entry.value}V`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ batteries, logs }: Readonly<Props>) {
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(null);

  const checkedIn = batteries.filter((battery) => battery.status === 'Checked In').length;
  const inUse = batteries.filter((battery) => battery.status === 'Checked Out').length;
  const checkedOutBatteries = batteries.filter((battery) => battery.status === 'Checked Out');
  const checkoutLogs = logs.filter((log) => log.type === 'checkout');

  const selectedBattery = useMemo(
    () => batteries.find((battery) => battery.id === selectedBatteryId) ?? null,
    [batteries, selectedBatteryId],
  );

  const selectedBatteryHistory = useMemo<BatteryHistoryPoint[]>(() => {
    if (!selectedBattery) {
      return [];
    }

    const baseHistory = logs
      .filter((log) => log.batteryId === selectedBattery.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map<BatteryHistoryPoint>((log) => {
        const formatted = formatTimestamp(log.timestamp);
        return {
          id: log.id,
          timestamp: log.timestamp,
          shortTime: formatted.short,
          fullTime: formatted.full,
          type: log.type,
          voltage: log.voltage,
          resistance: log.resistance,
          chargeLevel: log.chargeLevel,
        };
      });

    const needsSnapshot =
      baseHistory.length === 0 ||
      baseHistory.at(-1)?.timestamp !== selectedBattery.lastUpdated;

    if (needsSnapshot) {
      const formatted = formatTimestamp(selectedBattery.lastUpdated);
      baseHistory.push({
        id: `${selectedBattery.id}-snapshot`,
        timestamp: selectedBattery.lastUpdated,
        shortTime: formatted.short,
        fullTime: formatted.full,
        type: 'snapshot',
        voltage: selectedBattery.currentVoltage,
        resistance: selectedBattery.resistance,
        chargeLevel: selectedBattery.chargeLevel,
      });
    }

    return baseHistory;
  }, [logs, selectedBattery]);

  const selectedBatteryStats = useMemo(() => {
    if (!selectedBattery || selectedBatteryHistory.length === 0) {
      return null;
    }

    const charges = selectedBatteryHistory.map((point) => point.chargeLevel);
    const voltages = selectedBatteryHistory.map((point) => point.voltage);
    const resistances = selectedBatteryHistory.map((point) => point.resistance);
    const latest = selectedBatteryHistory.at(-1);
    if (!latest) {
      return null;
    }

    const previous = selectedBatteryHistory.at(-2) ?? latest;
    const dischargeDelta = previous.chargeLevel - latest.chargeLevel;
    const cycleCount = selectedBatteryHistory.filter((point) => point.type === 'checkout').length;

    return {
      latest,
      firstSeen: selectedBatteryHistory[0].fullTime,
      eventCount: selectedBatteryHistory.length,
      cycleCount,
      minCharge: Math.min(...charges),
      maxVoltage: Math.max(...voltages),
      averageResistance: Math.round((resistances.reduce((sum, value) => sum + value, 0) / resistances.length) * 10) / 10,
      recentChange: dischargeDelta,
    };
  }, [selectedBattery, selectedBatteryHistory]);

  const getRecentLogs = () => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  };

  const getAvgHealth = () => {
    if (checkedOutBatteries.length === 0) return 0;
    return Math.round(
      checkedOutBatteries.reduce((acc, curr) => acc + curr.health, 0) / checkedOutBatteries.length,
    );
  };

  const chargeDistributionData = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ].map((bucket, index) => {
    const min = index * 20;
    const max = index === 0 ? 20 : (index + 1) * 20;

    return {
      ...bucket,
      count: checkoutLogs.filter((log) =>
        index === 0
          ? log.chargeLevel >= min && log.chargeLevel <= max
          : log.chargeLevel > min && log.chargeLevel <= max,
      ).length,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-4 rounded-xl neu-inset text-blue-400">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Batteries</p>
            <p className="text-3xl font-bold text-gray-100">{batteries.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-4 rounded-xl neu-inset text-green-400">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Checked In</p>
            <p className="text-3xl font-bold text-gray-100">{checkedIn}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-4 rounded-xl neu-inset text-orange-400">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">In Use</p>
            <p className="text-3xl font-bold text-gray-100">{inUse}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-4 rounded-xl neu-inset text-indigo-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Avg Health</p>
            <p className="text-3xl font-bold text-gray-100">{getAvgHealth()}%</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-gray-200 mb-6">Charge At Checkout</h2>
          <div className="flex-1 min-h-[300px] w-full neu-inset rounded-xl p-4">
            {checkoutLogs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chargeDistributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="range" stroke="#4a5568" tick={{ fill: '#a0aec0' }} />
                  <YAxis allowDecimals={false} stroke="#4a5568" tick={{ fill: '#a0aec0' }} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(99, 179, 237, 0.12)' }}
                    contentStyle={tooltipCardStyle}
                    itemStyle={{ color: '#63b3ed' }}
                  />
                  <Bar dataKey="count" fill="#63b3ed" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">
                No checkout data yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-gray-200 mb-6">Recent Activity</h2>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
            <div className="space-y-4">
              {getRecentLogs().map((log) => {
                const battery = batteries.find((entry) => entry.id === log.batteryId);
                const badgeStatus =
                  log.type === 'checkin'
                    ? 'checked in'
                    : log.type === 'checkout'
                      ? 'checked out'
                      : 'default';
                return (
                  <div key={log.id} className="neu-panel neu-outset-sm p-4 rounded-[15px] flex flex-col gap-2">
                    <div className="flex justify-between items-center gap-3">
                      <span className="font-semibold text-gray-200">{battery?.name || 'Unknown'}</span>
                      <Badge status={badgeStatus}>
                        {log.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between gap-3">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>{log.voltage}V • {log.chargeLevel}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-200">Battery Roster</h2>
            <p className="text-sm text-gray-500">Click any battery to inspect its full voltage and charge history.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Interactive history
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-sm uppercase tracking-wider">
                <th className="pb-4 font-semibold px-4">Name</th>
                <th className="pb-4 font-semibold px-4">Status</th>
                <th className="pb-4 font-semibold px-4">Voltage</th>
                <th className="pb-4 font-semibold px-4">Resistance</th>
                <th className="pb-4 font-semibold px-4">Charge</th>
                <th className="pb-4 font-semibold px-4">Health</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {batteries.map((battery) => (
                <tr
                  key={battery.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="py-4 px-4 font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-3 text-left"
                      onClick={() => setSelectedBatteryId(battery.id)}
                      aria-label={`View history for ${battery.name}`}
                    >
                      <span>{battery.name}</span>
                      <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
                        View
                      </span>
                    </button>
                  </td>
                  <td className="py-4 px-4"><Badge status={battery.status}>{battery.status}</Badge></td>
                  <td className="py-4 px-4 font-mono">{battery.currentVoltage}V</td>
                  <td className="py-4 px-4 font-mono">{battery.resistance}mΩ</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 neu-inset rounded-full overflow-hidden">
                        <div
                          className={`h-full ${battery.chargeLevel > 20 ? 'bg-blue-400' : 'bg-red-400'} transition-all`}
                          style={{ width: `${battery.chargeLevel}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono">{battery.chargeLevel}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono">{battery.health}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedBattery && selectedBatteryStats && (
        <Dialog
          onClose={() => setSelectedBatteryId(null)}
          onEnter={() => setSelectedBatteryId(null)}
          overlayClassName="items-start overflow-y-auto bg-black/70 md:p-8"
          contentClassName="relative w-full max-w-6xl animate-in fade-in zoom-in-95 duration-200"
          titleId="battery-history-dialog-title"
        >
            <button
              type="button"
              onClick={() => setSelectedBatteryId(null)}
              className="absolute right-5 top-5 text-gray-500 transition-colors hover:text-gray-200"
              aria-label="Close battery history dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-8 flex flex-col gap-6 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent p-4 text-blue-300 ring-1 ring-white/5">
                    <BatteryCharging className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Battery history</p>
                    <h3 id="battery-history-dialog-title" className="text-3xl font-bold text-gray-100">{selectedBattery.name}</h3>
                  </div>
                  <Badge status={selectedBattery.status}>{selectedBattery.status}</Badge>
                </div>
                <p className="max-w-2xl text-sm text-gray-400">
                  Historical performance view showing charge movement, voltage trend, and key maintenance signals for this battery.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current Charge</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">{selectedBattery.chargeLevel}%</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current Voltage</p>
                  <p className="mt-2 text-2xl font-bold text-cyan-300">{selectedBattery.currentVoltage}V</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Health</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">{selectedBattery.health}%</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Recorded Events</p>
                  <p className="mt-2 text-2xl font-bold text-gray-100">{selectedBatteryStats.eventCount}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(99,179,237,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-100">Performance Timeline</h4>
                      <p className="text-sm text-gray-400">Charge and voltage across every recorded event.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 font-semibold text-blue-300">Charge %</span>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-300">Voltage</span>
                    </div>
                  </div>

                  <div className="h-[320px] rounded-[22px] neu-inset p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedBatteryHistory} margin={{ top: 16, right: 18, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="batteryChargeFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#63b3ed" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#63b3ed" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#2d3748" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="shortTime"
                          stroke="#4a5568"
                          tick={{ fill: '#a0aec0', fontSize: 12 }}
                          minTickGap={20}
                        />
                        <YAxis
                          yAxisId="charge"
                          domain={[0, 100]}
                          stroke="#4a5568"
                          tick={{ fill: '#a0aec0', fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <YAxis
                          yAxisId="voltage"
                          orientation="right"
                          stroke="#4a5568"
                          tick={{ fill: '#67e8f9', fontSize: 12 }}
                          tickFormatter={(value) => `${value}V`}
                        />
                        <RechartsTooltip content={<BatteryHistoryTooltip />} />
                        <Area
                          yAxisId="charge"
                          type="monotone"
                          dataKey="chargeLevel"
                          name="Charge"
                          stroke="#63b3ed"
                          fill="url(#batteryChargeFill)"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="voltage"
                          type="monotone"
                          dataKey="voltage"
                          name="Voltage"
                          stroke="#67e8f9"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#67e8f9', stroke: '#0f172a', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-3 text-blue-300">
                      <CalendarClock className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">First Recorded</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-100">{selectedBatteryStats.firstSeen}</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-3 text-cyan-300">
                      <Gauge className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Peak Voltage</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-100">{selectedBatteryStats.maxVoltage}V</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-3 text-orange-300">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Lowest Charge</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-100">{selectedBatteryStats.minCharge}%</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-3 text-emerald-300">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Avg Resistance</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-100">{selectedBatteryStats.averageResistance}mΩ</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                  <h4 className="text-lg font-semibold text-gray-100">Snapshot</h4>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Last update</span>
                      <span className="font-semibold text-gray-100">{selectedBatteryStats.latest.fullTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Recent change</span>
                      <span className={`font-semibold ${selectedBatteryStats.recentChange > 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
                        {selectedBatteryStats.recentChange > 0 ? '-' : '+'}
                        {Math.abs(selectedBatteryStats.recentChange)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Checkout cycles</span>
                      <span className="font-semibold text-gray-100">{selectedBatteryStats.cycleCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Current resistance</span>
                      <span className="font-semibold text-gray-100">{selectedBattery.resistance}mΩ</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                  <h4 className="text-lg font-semibold text-gray-100">Activity Feed</h4>
                  <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {selectedBatteryHistory.slice().reverse().map((point) => (
                      <div key={point.id} className="rounded-2xl neu-inset p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getLogTone(point.type)}`}>
                            {point.type}
                          </span>
                          <span className="text-xs text-gray-500">{point.fullTime}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Charge</p>
                            <p className="font-semibold text-gray-100">{point.chargeLevel}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Voltage</p>
                            <p className="font-semibold text-gray-100">{point.voltage}V</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Resistance</p>
                            <p className="font-semibold text-gray-100">{point.resistance}mΩ</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </Dialog>
      )}
    </div>
  );
}
