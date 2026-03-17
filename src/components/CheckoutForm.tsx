import { useState } from 'react';
import { Battery } from '../types';
import { Card, Input, Label, Select, Button } from './ui';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  batteries: Battery[];
  onCheckout: (batteryId: string, voltage: number, resistance: number, chargeLevel: number) => Promise<void>;
}

export default function CheckoutForm({ batteries, onCheckout }: Props) {
  const availableBatteries = batteries.filter(b => b.status === 'Checked In');
  
  const [selectedBattery, setSelectedBattery] = useState<string>('');
  const [voltage, setVoltage] = useState('');
  const [resistance, setResistance] = useState('');
  const [chargeLevel, setChargeLevel] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBattery(val);
    const batt = batteries.find(b => b.id === val);
    if (batt) {
      setVoltage(batt.currentVoltage.toString());
      setResistance(batt.resistance.toString());
      setChargeLevel(batt.chargeLevel.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBattery) return;
    await onCheckout(selectedBattery, Number(voltage), Number(resistance), Number(chargeLevel));
  };

  return (
    <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
          <div className="p-3 rounded-xl neu-inset text-blue-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Checkout Battery</h2>
            <p className="text-sm text-gray-500 font-medium">Log current status before field use</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Select Battery</Label>
            <Select value={selectedBattery} onChange={handleSelectChange} required>
              <option value="" disabled>Select a battery...</option>
              {availableBatteries.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.chargeLevel}% Charge)</option>
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
                value={voltage} 
                onChange={e => setVoltage(e.target.value)}
                placeholder="24.2"
              />
            </div>
            <div>
              <Label>Resistance (mΩ)</Label>
              <Input 
                type="number" 
                step="0.1" 
                required 
                value={resistance} 
                onChange={e => setResistance(e.target.value)}
                placeholder="12.5"
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
                value={chargeLevel} 
                onChange={e => setChargeLevel(e.target.value)}
                placeholder="100"
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <Button type="submit" className="w-full flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Confirm Checkout</span>
            </Button>
          </div>
        </form>
      </Card>
      
      {availableBatteries.length === 0 && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">No checked-in batteries found. Use Manage Batteries to add inventory before checkout.</p>
        </div>
      )}
    </div>
  );
}
