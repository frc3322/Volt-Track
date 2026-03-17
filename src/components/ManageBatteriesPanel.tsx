import { useMemo, useRef, useState } from 'react';
import { Battery } from '../types';
import { Badge, Button, Card, Dialog, Input, Label } from './ui';
import { BatteryFull, Plus, Trash2, X } from 'lucide-react';

interface AddBatteryValues {
  name: string;
  voltage: string;
  resistance: string;
  chargeLevel: string;
}

interface Props {
  batteries: Battery[];
  onAddBattery: (name: string, voltage: number, resistance: number, chargeLevel: number) => Promise<void>;
  onRemoveBattery: (batteryId: string) => Promise<boolean>;
}

const initialFormValues: AddBatteryValues = {
  name: '',
  voltage: '',
  resistance: '',
  chargeLevel: '',
};

export default function ManageBatteriesPanel({ batteries, onAddBattery, onRemoveBattery }: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [batteryToRemove, setBatteryToRemove] = useState<Battery | null>(null);
  const [formValues, setFormValues] = useState<AddBatteryValues>(initialFormValues);
  const addBatteryFormRef = useRef<HTMLFormElement>(null);

  const statusCounts = useMemo(() => ({
    total: batteries.length,
    checkedIn: batteries.filter((battery) => battery.status === 'Checked In').length,
    checkedOut: batteries.filter((battery) => battery.status === 'Checked Out').length,
  }), [batteries]);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormValues(initialFormValues);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddBattery(
      formValues.name.trim(),
      Number(formValues.voltage),
      Number(formValues.resistance),
      Number(formValues.chargeLevel),
    );
    closeAddModal();
  };

  const handleRemoveConfirm = async () => {
    if (!batteryToRemove) return;
    const removed = await onRemoveBattery(batteryToRemove.id);
    if (removed) {
      setBatteryToRemove(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl neu-inset text-blue-400">
              <BatteryFull className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Manage Batteries</h2>
              <p className="text-sm text-gray-500 font-medium">The only place to add or remove inventory.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span className="neu-chip rounded-full px-4 py-2 text-sm font-semibold text-gray-300">{statusCounts.total} total</span>
            <span className="neu-chip rounded-full px-4 py-2 text-sm font-semibold text-gray-300">{statusCounts.checkedIn} checked in</span>
            <span className="neu-chip rounded-full px-4 py-2 text-sm font-semibold text-gray-300">{statusCounts.checkedOut} checked out</span>
          </div>
        </div>
        <Button
          type="button"
          className="flex items-center justify-center gap-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-5 h-5" />
          <span>Add Battery</span>
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-200">Inventory Roster</h3>
          <p className="text-sm text-gray-500">Checked-out batteries must be returned before removal.</p>
        </div>

        <div className="space-y-4">
          {batteries.map((battery) => {
            const isCheckedOut = battery.status === 'Checked Out';
            return (
              <div
                key={battery.id}
                className="neu-panel neu-outset-sm rounded-[18px] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-gray-100">{battery.name}</p>
                    <Badge status={battery.status}>{battery.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>{battery.currentVoltage}V</span>
                    <span>{battery.resistance}mΩ</span>
                    <span>{battery.chargeLevel}% charge</span>
                    <span>{battery.health}% health</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isCheckedOut && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                      In use
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    disabled={isCheckedOut}
                    className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
                    onClick={() => setBatteryToRemove(battery)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {isAddModalOpen && (
        <Dialog
          onClose={closeAddModal}
          onEnter={() => addBatteryFormRef.current?.requestSubmit()}
          contentClassName="w-full max-w-lg relative animate-in zoom-in-95 duration-200"
          titleId="add-battery-dialog-title"
        >
            <button
              type="button"
              onClick={closeAddModal}
              className="absolute right-5 top-5 text-gray-500 transition-colors hover:text-gray-200"
              aria-label="Close add battery dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8">
              <h3 id="add-battery-dialog-title" className="text-2xl font-bold text-gray-100">Add Battery</h3>
              <p className="text-sm text-gray-500 font-medium">Create inventory before any checkout or check-in activity.</p>
            </div>

            <form ref={addBatteryFormRef} onSubmit={handleAddSubmit} className="space-y-6">
              <div>
                <Label>Battery Name</Label>
                <Input
                  required
                  autoFocus
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  placeholder="Heavy Lift Rig 2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label>Voltage (V)</Label>
                  <Input
                    required
                    type="number"
                    step="0.1"
                    value={formValues.voltage}
                    onChange={(e) => setFormValues({ ...formValues, voltage: e.target.value })}
                    placeholder="24.2"
                  />
                </div>
                <div>
                  <Label>Resistance (mΩ)</Label>
                  <Input
                    required
                    type="number"
                    step="0.1"
                    value={formValues.resistance}
                    onChange={(e) => setFormValues({ ...formValues, resistance: e.target.value })}
                    placeholder="12.5"
                  />
                </div>
              </div>

              <div>
                <Label>Charge Level (%)</Label>
                <Input
                  required
                  type="number"
                  min="0"
                  max="100"
                  value={formValues.chargeLevel}
                  onChange={(e) => setFormValues({ ...formValues, chargeLevel: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Battery</span>
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={closeAddModal}>
                  Cancel
                </Button>
              </div>
            </form>
        </Dialog>
      )}

      {batteryToRemove && (
        <Dialog
          onClose={() => setBatteryToRemove(null)}
          onEnter={handleRemoveConfirm}
          contentClassName="w-full max-w-md animate-in zoom-in-95 duration-200"
          titleId="remove-battery-dialog-title"
        >
            <div className="mb-6">
              <h3 id="remove-battery-dialog-title" className="text-xl font-bold text-gray-100">Remove Battery</h3>
              <p className="text-sm text-gray-500 font-medium">
                Remove <span className="text-gray-200">{batteryToRemove.name}</span> and its history from the tracker?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="danger"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleRemoveConfirm}
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Remove</span>
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setBatteryToRemove(null)}>
                Cancel
              </Button>
            </div>
        </Dialog>
      )}
    </div>
  );
}
