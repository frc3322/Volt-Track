import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';

describe('SettingsPanel', () => {
  it('imports a selected database backup file', async () => {
    const user = userEvent.setup();
    const onImportDatabase = vi.fn().mockResolvedValue({ ok: true });

    const { container } = render(
      <SettingsPanel
        batteryCount={4}
        logCount={12}
        onClose={vi.fn()}
        onImportDatabase={onImportDatabase}
        onExportDatabase={vi.fn().mockResolvedValue(undefined)}
        onExportText={vi.fn().mockResolvedValue(undefined)}
        onExportPdf={vi.fn().mockResolvedValue(undefined)}
        onClearDatabase={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    const file = new File(['sqlite-backup'], 'volttrack-backup.db', { type: 'application/x-sqlite3' });
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: 'Import DB' }));

    await waitFor(() => {
      expect(onImportDatabase).toHaveBeenCalledWith(expect.objectContaining({ name: 'volttrack-backup.db' }));
    });
  });

  it('runs each export action from the settings panel', async () => {
    const user = userEvent.setup();
    const onExportDatabase = vi.fn().mockResolvedValue(undefined);
    const onExportText = vi.fn().mockResolvedValue(undefined);
    const onExportPdf = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsPanel
        batteryCount={4}
        logCount={12}
        onClose={vi.fn()}
        onImportDatabase={vi.fn().mockResolvedValue({ ok: true })}
        onExportDatabase={onExportDatabase}
        onExportText={onExportText}
        onExportPdf={onExportPdf}
        onClearDatabase={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export DB Backup' }));
    await user.click(screen.getByRole('button', { name: 'Export TXT Report' }));
    await user.click(screen.getByRole('button', { name: 'Export PDF Report' }));

    expect(onExportDatabase).toHaveBeenCalledTimes(1);
    expect(onExportText).toHaveBeenCalledTimes(1);
    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before clearing the database', async () => {
    const user = userEvent.setup();
    const onClearDatabase = vi.fn().mockResolvedValue({ ok: true });

    render(
      <SettingsPanel
        batteryCount={4}
        logCount={12}
        onClose={vi.fn()}
        onImportDatabase={vi.fn().mockResolvedValue({ ok: true })}
        onExportDatabase={vi.fn().mockResolvedValue(undefined)}
        onExportText={vi.fn().mockResolvedValue(undefined)}
        onExportPdf={vi.fn().mockResolvedValue(undefined)}
        onClearDatabase={onClearDatabase}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear Database' }));
    expect(onClearDatabase).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm Clear' }));

    await waitFor(() => {
      expect(onClearDatabase).toHaveBeenCalledTimes(1);
    });
  });
});
