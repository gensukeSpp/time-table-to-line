import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneList } from './MilestoneList';
import { useMilestonesQuery, useGroupUsersQuery } from '../../resources/queries';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { useUpdateMilestoneMutation } from '../../hooks/useMilestoneMutation';
import { MantineProvider } from '@mantine/core';
import { MilestoneProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({
  useMilestonesQuery: vi.fn(),
  useGroupUsersQuery: vi.fn(),
}));

vi.mock('../../hooks/useAuthGuard', () => ({
  useAuthInfo: vi.fn(),
}));

vi.mock('../../hooks/useMilestoneMutation', () => ({
  useUpdateMilestoneMutation: vi.fn(),
}));

const mockQuery = (overrides: Partial<ReturnType<typeof useMilestonesQuery>>) => {
  ;(useMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(overrides);
};

const renderList = () =>
  render(
    <MantineProvider>
      <MilestoneList />
    </MantineProvider>
  );

describe('MilestoneList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery({ data: [], isPending: false, isError: false });
    ;(useGroupUsersQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: [] },
    });
    ;(useAuthInfo as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      type: 'auth',
      authId: 1,
      code: 3,
      group: 'グループA',
      admin: true,
    });
    ;(useUpdateMilestoneMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should display open milestones when data is available', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'マイルストーン1', status: 'open', color: '#9c27b0', staff_id: 1, created_at: '2024-01-01', guideline_end_date: null },
      { id: 2, title: 'マイルストーン2', status: 'open', color: '#009688', staff_id: 1, created_at: '2024-01-02', guideline_end_date: null },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });
    renderList();

    const milestoneTitles = screen.getAllByText(/マイルストーン[12]/);
    expect(milestoneTitles.length).toBe(2);
  });

  it('should filter only open milestones (status: open)', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'open milestone', status: 'open', color: '#9c27b0', staff_id: 1, created_at: '2024-01-01', guideline_end_date: null },
      { id: 2, title: 'closed milestone', status: 'closed', color: '#009688', staff_id: 1, created_at: '2024-01-02', guideline_end_date: null },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });
    renderList();

    const openMilestone = screen.getByText('open milestone');
    expect(openMilestone).toBeInTheDocument();
    const closedMilestone = screen.queryByText('closed milestone');
    expect(closedMilestone).not.toBeInTheDocument();
  });

  it('should show loader while pending', () => {
    mockQuery({ data: undefined, isPending: true, isError: false });

    const { container } = renderList();

    const loader = container.querySelector('.mantine-Loader-root');
    expect(loader).toBeInTheDocument();
  });

  it('should show error message when isError is true', () => {
    mockQuery({ data: undefined, isPending: false, isError: true });

    renderList();

    const errorMessage = screen.getByText('マイルストーンの取得に失敗しました');
    expect(errorMessage).toBeInTheDocument();
  });

  it('should display empty state when no milestones', () => {
    mockQuery({ data: [], isPending: false, isError: false });

    renderList();

    const milestoneTitles = screen.queryAllByText(/マイルストーン/);
    expect(milestoneTitles.length).toBe(0);
  });

  it('should show waiting milestone with MM/dd close', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'M1', status: 'waiting', color: '#9c27b0', staff_id: 1,
        created_at: '2026-08-20', accomplished_date: '2026-08-20' },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });
    renderList();

    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText(/close/)).toBeInTheDocument();
  });

  it('should hide closed milestone from list', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'M1', status: 'closed', color: '#9c27b0', staff_id: 1,
        created_at: '2026-08-20', accomplished_date: '2026-08-22' },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });
    renderList();

    expect(screen.queryByText('M1')).not.toBeInTheDocument();
  });

  it('should open detail dialog when title is clicked', async () => {
    const user = userEvent.setup();
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'M1', status: 'open', color: '#9c27b0', staff_id: 1,
        created_at: '2026-08-20', guideline_end_date: null, accomplished_date: null },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });
    renderList();

    await user.click(screen.getByText('M1'));

    expect(screen.getByText('マイルストーン詳細')).toBeInTheDocument();
    expect(screen.getByText(/作成者名/)).toBeInTheDocument();
  });
});