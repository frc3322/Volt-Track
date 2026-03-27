import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ManageBatteriesPanel from './ManageBatteriesPanel';
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

describe('ManageBatteriesPanel', () => {
  it('opens the add-battery dialog and submits the new battery payload', async () => {
    const user = userEvent.setup();
    const onAddBattery = vi.fn().mockResolvedValue(undefined);

    render(
      <ManageBatteriesPanel
        batteries={batteries}
        onAddBattery={onAddBattery}
        onRemoveBattery={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Battery' }));

    const dialog = screen.getByRole('dialog', { name: 'Add Battery' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Battery Name' }), 'Field Pack Delta');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Voltage (V)' }), '21.9');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Resistance (mΩ)' }), '9.8');
    const chargeInput = within(dialog).getByRole<HTMLInputElement>('spinbutton', { name: 'Charge Level (%)' });
    expect(chargeInput.getAttribute('max')).toBe('200');
    await user.type(chargeInput, '200');
    await user.click(within(dialog).getByRole('button', { name: 'Create Battery' }));

    await waitFor(() => {
      expect(onAddBattery).toHaveBeenCalledWith('Field Pack Delta', 21.9, 9.8, 200);
    });
  });
});
