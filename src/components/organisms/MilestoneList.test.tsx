import { render, screen } from '@testing-library/react';
import { MilestoneList } from './MilestoneList';
import { useMilestonesQuery } from '../../resources/queries';
import { MantineProvider } from '@mantine/core';
import { MilestoneProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({
  useMilestonesQuery: vi.fn(),
}));

const mockQuery = (overrides: Partial<ReturnType<typeof useMilestonesQuery>>) => {
  ;(useMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(overrides);
};

describe('MilestoneList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display open milestones when data is available', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'マイルストーン1', status: true, color: '#9c27b0', staff_id: 1, created_at: '2024-01-01', guidline_end_date: null },
      { id: 2, title: 'マイルストーン2', status: true, color: '#009688', staff_id: 1, created_at: '2024-01-02', guidline_end_date: null },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });

    render(
      <MantineProvider>
        <MilestoneList />
      </MantineProvider>
    );

    const milestoneTitles = screen.getAllByText(/マイルストーン[12]/);
    expect(milestoneTitles.length).toBe(2);
  });

  it('should filter only open milestones (status: true)', () => {
    const mockMilestones: MilestoneProps[] = [
      { id: 1, title: 'open milestone', status: true, color: '#9c27b0', staff_id: 1, created_at: '2024-01-01', guidline_end_date: null },
      { id: 2, title: 'closed milestone', status: false, color: '#009688', staff_id: 1, created_at: '2024-01-02', guidline_end_date: null },
    ];

    mockQuery({ data: mockMilestones, isPending: false, isError: false });

    render(
      <MantineProvider>
        <MilestoneList />
      </MantineProvider>
    );

    const openMilestone = screen.getByText('open milestone');
    expect(openMilestone).toBeInTheDocument();
    const closedMilestone = screen.queryByText('closed milestone');
    expect(closedMilestone).not.toBeInTheDocument();
  });

  it('should show loader while pending', () => {
    mockQuery({ data: undefined, isPending: true, isError: false });

    const { container } = render(
      <MantineProvider>
        <MilestoneList />
      </MantineProvider>
    );

    const loader = container.querySelector('.mantine-Loader-root');
    expect(loader).toBeInTheDocument();
  });

  it('should show error message when isError is true', () => {
    mockQuery({ data: undefined, isPending: false, isError: true });

    render(
      <MantineProvider>
        <MilestoneList />
      </MantineProvider>
    );

    const errorMessage = screen.getByText('マイルストーンの取得に失敗しました');
    expect(errorMessage).toBeInTheDocument();
  });

  it('should display empty state when no milestones', () => {
    mockQuery({ data: [], isPending: false, isError: false });

    render(
      <MantineProvider>
        <MilestoneList />
      </MantineProvider>
    );

    const milestoneTitles = screen.queryAllByText(/マイルストーン/);
    expect(milestoneTitles.length).toBe(0);
  });
});