import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useAuthQuery } from './queries';
import { fetchAuthResponse } from './fetch';

vi.mock('./fetch', () => ({
  fetchEventsDataForTT: vi.fn(),
  fetchEventsData: vi.fn(),
  fetchAuthResponse: vi.fn(),
  refresh: vi.fn(),
  requestGroup: vi.fn(),
  requestGroupMember: vi.fn(),
}));

const TestComponent = () => {
  useAuthQuery('test-token');
  return null;
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

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
