import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './index';

describe('Dialog', () => {
  it('closes when clicking the transparent area outside the card content', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog onClose={onClose}>
        <div>Dialog content</div>
      </Dialog>,
    );

    await user.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the card content', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog onClose={onClose}>
        <button type="button">Inside</button>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Inside' }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
