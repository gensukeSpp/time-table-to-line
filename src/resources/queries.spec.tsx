import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { act, type ReactNode } from 'react';

import { useAuthQuery, useMilestonesQuery, useMilestoneEventsQuery, useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from './queries';
import { fetchAuthResponse, fetchMilestones, fetchMilestoneEvents, fetchClosedMilestones, fetchClosedMilestoneEvents } from './fetch';
import { MILESTONE_REFRESH_INTERVAL_MS } from '../lib/env';

vi.mock('./fetch', () => ({
  fetchEventsDataForTT: vi.fn(),
  fetchEventsData: vi.fn(),
  fetchAuthResponse: vi.fn(),
  refresh: vi.fn(),
  requestGroup: vi.fn(),
  requestGroupMember: vi.fn(),
  fetchMilestones: vi.fn(),
  fetchMilestoneEvents: vi.fn(),
  fetchClosedMilestones: vi.fn(),
  fetchClosedMilestoneEvents: vi.fn(),
}));

const TestComponent = () => {
  useAuthQuery('test-token');
  return null;
};

const MilestoneTestComponent = () => {
  useMilestonesQuery();
  return null;
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

describe('useAuthQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not refetch auth inquiry when remounted with the same token', async () => {
    const mockedFetchAuthResponse = vi.mocked(fetchAuthResponse);
    mockedFetchAuthResponse.mockResolvedValue({
      data: {
        staff_id: 'staff-1',
        group_id: 'group-1',
        group_name: 'group-name',
      },
    } as never);

    const queryClient = createQueryClient();

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockedFetchAuthResponse).toHaveBeenCalledTimes(1);
    });

    unmount();

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockedFetchAuthResponse).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useMilestonesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refetches milestones periodically after MILESTONE_REFRESH_INTERVAL_MS elapses', async () => {
    vi.useFakeTimers();
    const mockedFetchMilestones = vi.mocked(fetchMilestones);
    mockedFetchMilestones.mockResolvedValue([] as never);

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MilestoneTestComponent />
      </QueryClientProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockedFetchMilestones).toHaveBeenCalledTimes(1);

    // 間隔の途中では再取得しない
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MILESTONE_REFRESH_INTERVAL_MS - 1);
    });
    expect(mockedFetchMilestones).toHaveBeenCalledTimes(1);

    // 間隔経過で再取得される
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mockedFetchMilestones).toHaveBeenCalledTimes(2);
  });
});

describe('useMilestoneEventsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only when enabled', async () => {
    (fetchMilestoneEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result, rerender } = renderHook(
      ({ id, enabled }) => useMilestoneEventsQuery(id, enabled),
      { initialProps: { id: 1, enabled: false }, wrapper },
    );
    expect(fetchMilestoneEvents).not.toHaveBeenCalled();
    rerender({ id: 1, enabled: true });
    await waitFor(() => expect(fetchMilestoneEvents).toHaveBeenCalledWith(1));
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});

describe('useClosedMilestonesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only when enabled', async () => {
    (fetchClosedMilestones as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { rerender } = renderHook(
      ({ enabled }) => useClosedMilestonesQuery(enabled),
      { initialProps: { enabled: false }, wrapper },
    );
    expect(fetchClosedMilestones).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(fetchClosedMilestones).toHaveBeenCalledTimes(1));
  });
});

describe('useClosedMilestoneEventsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only when enabled and id is present', async () => {
    (fetchClosedMilestoneEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { rerender } = renderHook(
      ({ id, enabled }: { id: number | null; enabled: boolean }) => useClosedMilestoneEventsQuery(id, enabled),
      { initialProps: { id: null as number | null, enabled: true }, wrapper },
    );
    expect(fetchClosedMilestoneEvents).not.toHaveBeenCalled();
    rerender({ id: 7, enabled: true });
    await waitFor(() => expect(fetchClosedMilestoneEvents).toHaveBeenCalledWith(7));
  });
});
