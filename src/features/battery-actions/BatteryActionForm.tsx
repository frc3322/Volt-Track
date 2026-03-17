import { useState } from 'react';
import { AlertCircle, CheckCircle, LogIn, LogOut } from 'lucide-react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { Battery } from '@/types';

type BatteryActionMode = 'checkin' | 'checkout';

interface Props {
  mode: BatteryActionMode;
  batteries: Battery[];
  onSubmit: (batteryId: string, voltage: number, resistance: number, chargeLevel: number) => Promise<void>;
}

const copy = {
  checkout: {
    title: 'Checkout Battery',
    description: 'Log current status before field use',
    buttonLabel: 'Confirm Checkout',
    emptyLabel: 'No checked-in batteries found. Use Manage Batteries to add inventory before checkout.',
    highlightClassName: 'text-blue-400',
    hoverClassName: 'hover:text-blue-300',
    Icon: LogOut,
    optionSuffix: (battery: Battery) => `(${battery.chargeLevel}% Charge)`,
    placeholder: {
      voltage: '24.2',
      resistance: '12.5',
      chargeLevel: '100',
    },
  },
  checkin: {
    title: 'Check In Battery',
    description: 'Log post-flight status before charging',
    buttonLabel: 'Confirm Return',
    emptyLabel: 'No batteries are currently checked out. Use checkout for field departures and check-in only for returns.',
    highlightClassName: 'text-green-400',
    hoverClassName: 'hover:text-green-300',
    Icon: LogIn,
    optionSuffix: () => '(Currently checked out)',
    placeholder: {
      voltage: '21.5',
      resistance: '15.2',
      chargeLevel: '25',
    },
  },
} as const;

export default function BatteryActionForm({ mode, batteries, onSubmit }: Readonly<Props>) {
  const [selectedBattery, setSelectedBattery] = useState('');
  const [voltage, setVoltage] = useState('');
  const [resistance, setResistance] = useState('');
  const [chargeLevel, setChargeLevel] = useState('');

  const isCheckout = mode === 'checkout';
  const availableBatteries = batteries.filter((battery) =>
    isCheckout ? battery.status === 'Checked In' : battery.status === 'Checked Out',
  );
  const content = copy[mode];
  const HeaderIcon = content.Icon;

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const batteryId = event.target.value;
    setSelectedBattery(batteryId);

    const battery = batteries.find((entry) => entry.id === batteryId);
    if (!battery) {
      return;
    }

    setVoltage(battery.currentVoltage.toString());
    setResistance(battery.resistance.toString());
    setChargeLevel(battery.chargeLevel.toString());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBattery) {
      return;
    }

    await onSubmit(selectedBattery, Number(voltage), Number(resistance), Number(chargeLevel));
  };

  return (
    <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
          <div className={`p-3 rounded-xl neu-inset ${content.highlightClassName}`}>
            <HeaderIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">{content.title}</h2>
            <p className="text-sm text-gray-500 font-medium">{content.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Select Battery</Label>
            <Select value={selectedBattery} onChange={handleSelectChange} required aria-label="Select Battery">
              <option value="" disabled>Select a battery...</option>
              {availableBatteries.map((battery) => (
                <option key={battery.id} value={battery.id}>
                  {battery.name} {content.optionSuffix(battery)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Voltage (V)</Label>
              <Input
                type="number"
                step="0.1"
                required
                aria-label="Voltage (V)"
                value={voltage}
                onChange={(event) => setVoltage(event.target.value)}
                placeholder={content.placeholder.voltage}
              />
            </div>
            <div>
              <Label>Resistance (mΩ)</Label>
              <Input
                type="number"
                step="0.1"
                required
                aria-label="Resistance (mΩ)"
                value={resistance}
                onChange={(event) => setResistance(event.target.value)}
                placeholder={content.placeholder.resistance}
              />
            </div>
          </div>

          <div>
            <Label>Charge Level (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                required
                aria-label="Charge Level (%)"
                value={chargeLevel}
                onChange={(event) => setChargeLevel(event.target.value)}
                placeholder={content.placeholder.chargeLevel}
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <Button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 ${content.highlightClassName} ${content.hoverClassName}`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>{content.buttonLabel}</span>
            </Button>
          </div>
        </form>
      </Card>

      {availableBatteries.length === 0 && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{content.emptyLabel}</p>
        </div>
      )}
    </div>
  );
}
