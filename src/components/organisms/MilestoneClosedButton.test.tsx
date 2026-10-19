import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';

import { MilestoneClosedButton } from './MilestoneClosedButton';
import { useClosedMilestonesQuery } from '../../resources/queries';

vi.mock('../../resources/queries', () => ({
  useClosedMilestonesQuery: vi.fn(),
  useClosedMilestoneEventsQuery: vi.fn(),
}));

const renderButton = (admin: boolean) =>
  render(<MantineProvider><MilestoneClosedButton admin={admin} /></MantineProvider>);

describe('MilestoneClosedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [], isPending: false, isError: false,
    });
  });

  it('is hidden for non-admin users', () => {
    renderButton(false);

    expect(screen.queryByRole('button', { name: '閉じたマイルストーン' })).not.toBeInTheDocument();
  });

  it('opens the drawer for admin users', async () => {
    const user = userEvent.setup();
    renderButton(true);

    await user.click(screen.getByRole('button', { name: '閉じたマイルストーン' }));

    expect(await screen.findByText('閉じたマイルストーンはありません')).toBeInTheDocument();
  });
});
