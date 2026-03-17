import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BatteryActionForm from './BatteryActionForm';
import { Battery } from '@/types';

const batteries: Battery[] = [
  {
    id: 'batt-001',
    name: 'Drone Pack Alpha',
    status: 'Checked In',
    currentVoltage: 24.2,
    resistance: 12.5,
    chargeLevel: 95,
    health: 98,
    lastUpdated: '2026-03-17T12:00:00Z',
  },
];

describe('BatteryActionForm', () => {
  it('prefills battery values and submits edited checkout measurements', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BatteryActionForm mode="checkout" batteries={batteries} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Select Battery' }), 'batt-001');

    const voltageInput = screen.getByRole('spinbutton', { name: 'Voltage (V)' }) as HTMLInputElement;
    const resistanceInput = screen.getByRole('spinbutton', { name: 'Resistance (mΩ)' }) as HTMLInputElement;
    const chargeInput = screen.getByRole('spinbutton', { name: 'Charge Level (%)' }) as HTMLInputElement;

    expect(voltageInput.value).toBe('24.2');
    expect(resistanceInput.value).toBe('12.5');
    expect(chargeInput.value).toBe('95');

    await user.clear(voltageInput);
    await user.type(voltageInput, '23.8');
    await user.clear(resistanceInput);
    await user.type(resistanceInput, '11.9');
    await user.clear(chargeInput);
    await user.type(chargeInput, '87');
    await user.click(screen.getByRole('button', { name: 'Confirm Checkout' }));

    expect(onSubmit).toHaveBeenCalledWith('batt-001', 23.8, 11.9, 87);
  });
});
