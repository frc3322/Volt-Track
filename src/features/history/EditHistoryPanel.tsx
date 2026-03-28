import { useEffect, useState } from 'react';
import { AlertCircle, Check, ClipboardEdit, Pencil, Trash2, X } from 'lucide-react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { fetchBatteryLogs, updateLog, deleteLog } from '@/api';
import { Battery, HealthStatus, LogRecord, LogUpdatePayload } from '@/types';

interface Props {
  batteries: Battery[];
  onDataChanged: () => void;
}

interface EditDraft {
  timestamp: string;
  type: 'checkout' | 'checkin' | 'add';
  voltage: string;
  resistance: string;
  chargeLevel: string;
  health: HealthStatus | '';
}

function isoToDatetimeLocal(iso: string): string {
  // "2026-03-28T12:34:56.000Z" → "2026-03-28T12:34:56"
  return iso.replace('Z', '').split('.')[0];
}

function datetimeLocalToIso(value: string): string {
  // "2026-03-28T12:34:56" → "2026-03-28T12:34:56.000Z"
  return `${value}.000Z`;
}

function logTypeLabel(type: string): string {
  if (type === 'checkout') return 'Checkout';
  if (type === 'checkin') return 'Check In';
  if (type === 'add') return 'Added';
  return type;
}

function logTypeBadgeClass(type: string): string {
  if (type === 'checkout') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (type === 'checkin') return 'bg-green-500/10 text-green-400 border-green-500/20';
  return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
}

function healthBadgeClass(health: string | null): string {
  if (health === 'good') return 'text-green-400';
  if (health === 'fair') return 'text-yellow-400';
  if (health === 'bad') return 'text-red-400';
  return 'text-gray-500';
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function logToDraft(log: LogRecord): EditDraft {
  return {
    timestamp: isoToDatetimeLocal(log.timestamp),
    type: log.type,
    voltage: log.voltage.toString(),
    resistance: log.resistance.toString(),
    chargeLevel: log.chargeLevel.toString(),
    health: log.health ?? '',
  };
}

export default function EditHistoryPanel({ batteries, onDataChanged }: Readonly<Props>) {
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [batteryLogs, setBatteryLogs] = useState<LogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBatteryId) {
      setBatteryLogs([]);
      setEditingLogId(null);
      setEditDraft(null);
      return;
    }

    setIsLoadingLogs(true);
    setError(null);
    setEditingLogId(null);
    setEditDraft(null);

    fetchBatteryLogs(selectedBatteryId)
      .then((logs) => {
        const sorted = [...logs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setBatteryLogs(sorted);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      })
      .finally(() => setIsLoadingLogs(false));
  }, [selectedBatteryId]);

  const handleStartEdit = (log: LogRecord) => {
    setEditingLogId(log.id);
    setEditDraft(logToDraft(log));
    setConfirmDeleteId(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditDraft(null);
  };

  const handleSave = async (logId: string) => {
    if (!editDraft) return;
    setIsSaving(true);
    setError(null);

    try {
      const payload: LogUpdatePayload = {
        timestamp: datetimeLocalToIso(editDraft.timestamp),
        type: editDraft.type,
        voltage: Number(editDraft.voltage),
        resistance: Number(editDraft.resistance),
        chargeLevel: Number(editDraft.chargeLevel),
        health: editDraft.health !== '' ? (editDraft.health as HealthStatus) : null,
      };

      const updated = await updateLog(logId, payload);
      setBatteryLogs((prev) => {
        const next = prev.map((l) => (l.id === logId ? updated : l));
        return [...next].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      });
      setEditingLogId(null);
      setEditDraft(null);
      onDataChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (logId: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteLog(logId);
      setBatteryLogs((prev) => prev.filter((l) => l.id !== logId));
      setConfirmDeleteId(null);
      if (editingLogId === logId) {
        setEditingLogId(null);
        setEditDraft(null);
      }
      onDataChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete log');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateDraft = (field: keyof EditDraft, value: string) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500 space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
          <div className="p-3 rounded-xl neu-inset text-amber-400">
            <ClipboardEdit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Edit History</h2>
            <p className="text-sm text-gray-500 font-medium">View and edit logged events for any battery</p>
          </div>
        </div>

        <div>
          <Label>Select Battery</Label>
          <Select
            value={selectedBatteryId}
            onChange={(e) => setSelectedBatteryId(e.target.value)}
            aria-label="Select Battery"
          >
            <option value="">Choose a battery...</option>
            {batteries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.status}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {selectedBatteryId && (
        <Card>
          {isLoadingLogs ? (
            <p className="text-center text-gray-400 py-6">Loading events...</p>
          ) : batteryLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No events recorded for this battery.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-4">
                {batteryLogs.length} event{batteryLogs.length !== 1 ? 's' : ''} — newest first
              </p>

              {batteryLogs.map((log) => (
                <div key={log.id} className="rounded-xl overflow-hidden border border-white/5">
                  {/* Log summary row */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02]">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border flex-shrink-0 ${logTypeBadgeClass(log.type)}`}>
                      {logTypeLabel(log.type)}
                    </span>
                    <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className="text-sm text-gray-400 hidden sm:block">
                      {log.voltage}V &middot; {log.resistance}mΩ &middot; {log.chargeLevel}%
                    </span>
                    {log.health && (
                      <span className={`text-xs font-semibold uppercase hidden sm:block ${healthBadgeClass(log.health)}`}>
                        {log.health}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {confirmDeleteId === log.id ? (
                        <>
                          <span className="text-xs text-red-400 mr-1">Delete?</span>
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            aria-label="Confirm delete"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
                            aria-label="Cancel delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => editingLogId === log.id ? handleCancelEdit() : handleStartEdit(log)}
                            className={`p-1.5 rounded-lg transition-colors ${editingLogId === log.id ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                            aria-label={editingLogId === log.id ? 'Cancel edit' : 'Edit log'}
                          >
                            {editingLogId === log.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(log.id); setEditingLogId(null); setEditDraft(null); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingLogId === log.id && editDraft && (
                    <div className="px-4 pb-4 pt-3 border-t border-white/5 bg-white/[0.015] space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Event Type</Label>
                          <Select
                            value={editDraft.type}
                            onChange={(e) => updateDraft('type', e.target.value)}
                            aria-label="Event Type"
                          >
                            <option value="checkout">Checkout</option>
                            <option value="checkin">Check In</option>
                            <option value="add">Added</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Health</Label>
                          <Select
                            value={editDraft.health}
                            onChange={(e) => updateDraft('health', e.target.value)}
                            aria-label="Health"
                          >
                            <option value="">None</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="bad">Bad</option>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Timestamp (UTC)</Label>
                        <Input
                          type="datetime-local"
                          value={editDraft.timestamp}
                          onChange={(e) => updateDraft('timestamp', e.target.value)}
                          aria-label="Timestamp"
                          step="1"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Voltage (V)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editDraft.voltage}
                            onChange={(e) => updateDraft('voltage', e.target.value)}
                            aria-label="Voltage"
                          />
                        </div>
                        <div>
                          <Label>Resistance (mΩ)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editDraft.resistance}
                            onChange={(e) => updateDraft('resistance', e.target.value)}
                            aria-label="Resistance"
                          />
                        </div>
                        <div>
                          <Label>Charge (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="200"
                            value={editDraft.chargeLevel}
                            onChange={(e) => updateDraft('chargeLevel', e.target.value)}
                            aria-label="Charge Level"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button
                          type="button"
                          onClick={() => handleSave(log.id)}
                          disabled={isSaving}
                          className="flex items-center gap-2 text-amber-400 hover:text-amber-300"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
