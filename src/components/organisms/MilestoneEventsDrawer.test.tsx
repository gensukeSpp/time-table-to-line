import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MilestoneEventsDrawer } from './MilestoneEventsDrawer';
import { useMilestoneEventsQuery } from '../../resources/queries';
import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({ useMilestoneEventsQuery: vi.fn() }));

const milestone: MilestoneProps = {
  id: 1, staff_id: 1, title: 'M1', color: '#9c27b0', status: 'open',
  created_at: '2026-08-01', guideline_end_date: null,
};

const events: MilestoneEventProps[] = [
  { id: 11, staff_id: 1001, group: 3, group_name: 'グループA', start: '2026-08-02T10:00:00.000Z',
    end: '2026-08-02T11:00:00.000Z', title: 'タイトルA', progress: 'これから', milestone_id: 1, completed: false },
  { id: 12, staff_id: 1002, group: 4, group_name: 'グループB', start: '2026-08-03T09:00:00.000Z',
    end: '2026-08-03T10:00:00.000Z', title: 'タイトルB', progress: null, milestone_id: 1, completed: false },
];

const renderDrawer = () =>
  render(<MantineProvider><MilestoneEventsDrawer milestone={milestone} onClose={vi.fn()} /></MantineProvider>);

describe('MilestoneEventsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMilestoneEventsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: events, isPending: false, isError: false,
    });
  });

  it('renders progress groups in order and omits empty ones', () => {
    renderDrawer();
    expect(screen.getByText('これから（1）')).toBeInTheDocument();
    expect(screen.getByText('指定なし（1）')).toBeInTheDocument();
    expect(screen.queryByText('まだ（0）')).not.toBeInTheDocument();
  });

  it('expands accordion to show title, staff_id, group_name, start_time', async () => {
    renderDrawer();
    fireEvent.click(screen.getByText('これから（1）'));
    expect(screen.getByText('タイトルA')).toBeInTheDocument();
    expect(screen.getByText(/スタッフID: 1001/)).toBeInTheDocument();
    expect(screen.getByText(/グループ名: グループA/)).toBeInTheDocument();
    expect(screen.getByText(/開始日時: 2026\/08\/02 \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('shows 指定なし for null progress', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('指定なし（1）'));
    expect(screen.getByText('タイトルB')).toBeInTheDocument();
    expect(screen.getByText(/スタッフID: 1002/)).toBeInTheDocument();
    expect(screen.getByText(/グループ名: グループB/)).toBeInTheDocument();
  });
});
