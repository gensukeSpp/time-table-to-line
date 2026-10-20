import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { ClosedMilestoneDrawer } from './ClosedMilestoneDrawer';
import { useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from '../../resources/queries';
import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({
  useClosedMilestonesQuery: vi.fn(),
  useClosedMilestoneEventsQuery: vi.fn(),
}));

const milestones: MilestoneProps[] = [
  { id: 1, staff_id: 1, title: 'M1', color: '#9c27b0', status: 'closed',
    created_at: '2026-08-01', guideline_end_date: null, accomplished_date: '2026-08-20' },
  { id: 2, staff_id: 1, title: 'M2', color: '#009688', status: 'closed',
    created_at: '2026-08-01', guideline_end_date: null, accomplished_date: null },
];

const events: MilestoneEventProps[] = [
  { id: 11, staff_id: 1001, group: 3, group_name: 'グループA', start: '2026-08-02T10:00:00.000Z',
    end: '2026-08-02T11:30:00.000Z', title: '完了タスク', progress: '完了', milestone_id: 1, completed: true },
  { id: 12, staff_id: 1002, group: 4, group_name: 'グループB', start: '2026-08-03T09:00:00.000Z',
    end: '2026-08-03T10:00:00.000Z', title: '未完了タスク', progress: 'これから', milestone_id: 1, completed: false },
];

const renderDrawer = () =>
  render(<MantineProvider><ClosedMilestoneDrawer onClose={vi.fn()} /></MantineProvider>);

// Mantine Collapse は閉時も子を DOM に保持する（height:0 + inert）ため、
// 表示判定は祖先の aria-hidden で行う。
const isCollapsed = (element: HTMLElement): boolean =>
  element.closest('[aria-hidden]')?.getAttribute('aria-hidden') === 'true';

describe('ClosedMilestoneDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: milestones, isPending: false, isError: false,
    });
    (useClosedMilestoneEventsQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (id: number | null) => ({ data: id === 1 ? events : [], isPending: false, isError: false }),
    );
  });

  it('lists closed milestones with accomplished date (null → 達成日なし)', () => {
    renderDrawer();

    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('2026/08/20')).toBeInTheDocument();
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('達成日なし')).toBeInTheDocument();
  });

  it('expands a milestone to show only 完了 events', () => {
    renderDrawer();
    const toggle = screen.getByRole('button', { name: 'M1 の完了イベント' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(isCollapsed(screen.getByText('完了タスク'))).toBe(true);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(isCollapsed(screen.getByText('完了タスク'))).toBe(false);
    expect(screen.queryByText('未完了タスク')).not.toBeInTheDocument();
  });

  it('collapses again when the milestone title is clicked twice', () => {
    renderDrawer();
    const toggle = screen.getByRole('button', { name: 'M1 の完了イベント' });

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(isCollapsed(screen.getByText('完了タスク'))).toBe(true);
  });

  it('expands an event to show staff_id / group_name / end_time', () => {
    renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'M1 の完了イベント' }));
    const eventToggle = screen.getByRole('button', { name: '完了タスク の詳細を開閉' });
    expect(isCollapsed(screen.getByText(/スタッフID: 1001/))).toBe(true);

    fireEvent.click(eventToggle);

    expect(eventToggle).toHaveAttribute('aria-expanded', 'true');
    expect(isCollapsed(screen.getByText(/スタッフID: 1001/))).toBe(false);
    expect(screen.getByText(/グループ名: グループA/)).toBeInTheDocument();
    expect(screen.getByText(/終了日時: 2026\/08\/02 \d{2}:30/)).toBeInTheDocument();
  });

  it('has an explicit toggle button on the event title (3 段構成の手掛かり)', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'M1 の完了イベント' }));

    const toggle = screen.getByRole('button', { name: '完了タスク の詳細を開閉' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('data-expanded', 'false');
    expect(isCollapsed(screen.getByText(/スタッフID: 1001/))).toBe(true);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('data-expanded', 'true');
    expect(isCollapsed(screen.getByText(/スタッフID: 1001/))).toBe(false);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(isCollapsed(screen.getByText(/スタッフID: 1001/))).toBe(true);
  });

  it('shows empty state when there is no closed milestone', () => {
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [], isPending: false, isError: false,
    });

    renderDrawer();

    expect(screen.getByText('閉じたマイルストーンはありません')).toBeInTheDocument();
  });
});
