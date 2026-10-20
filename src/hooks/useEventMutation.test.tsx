import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useCreateMutation,
  useDeleteMutation,
  useUpdateEventMutation,
  useUpdateDateListMutation,
} from './useEventMutation';
import basicAxios from '../lib/AuthInfo';
import { milestoneKeys, useEventCache } from '../resources/cache';
import { TimelineEventProps } from '../lib/TimelineType';

vi.mock('../lib/AuthInfo', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../resources/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../resources/cache')>();
  return {
    ...actual,
    useEventCache: vi.fn(),
  };
});

describe('useEventMutation closed cache invalidation', () => {
  const mockInvalidateList = vi.fn();
  const mockPost = vi.mocked(basicAxios.post);
  const mockDelete = vi.mocked(basicAxios.delete);
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    (useEventCache as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateList: mockInvalidateList,
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('useCreateMutation invalidates closed milestone keys on success', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1 } as TimelineEventProps);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: milestoneKeys.closed(),
      });
    });
  });

  it('useDeleteMutation invalidates closed milestone keys on settled', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteMutation(1), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: milestoneKeys.closed(),
      });
    });
  });

  it('useUpdateEventMutation invalidates closed milestone keys on success', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateEventMutation(1), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1 } as TimelineEventProps);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: milestoneKeys.closed(),
      });
    });
  });

  it('useUpdateDateListMutation invalidates closed milestone keys on settled', async () => {
    mockPost.mockResolvedValue({ data: {} });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateDateListMutation(['1']), {
      wrapper: createWrapper(),
    });

    result.current.mutate([{ id: 1 } as TimelineEventProps]);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: milestoneKeys.closed(),
      });
    });
  });
});
