import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAddMilestoneMutation, useUpdateMilestoneMutation, useRemoveMilestoneMutation } from './useMilestoneMutation';
import basicAxios from '../lib/AuthInfo';
import { useMilestoneCache } from '../resources/cache';

vi.mock('../lib/AuthInfo', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../resources/cache', () => ({
  useMilestoneCache: vi.fn(),
}));

describe('useAddMilestoneMutation', () => {
  const mockInvalidateMilestoneList = vi.fn();
  const mockPost = vi.mocked(basicAxios.post);

  beforeEach(() => {
    vi.clearAllMocks();
    ;(useMilestoneCache as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateMilestoneList: mockInvalidateMilestoneList,
    });
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should call /milestone/add endpoint with correct payload', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useAddMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    const payload = {
      title: 'テストマイルストーン',
      description: '説明',
      guideline_end_date: '2024-06-15',
    };

    result.current.mutate(payload);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/milestone/add', payload);
    });
  });

  it('should invalidate milestone list cache on success', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useAddMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: 'テストマイルストーン',
    });

    await waitFor(() => {
      expect(mockInvalidateMilestoneList).toHaveBeenCalledTimes(1);
    });
  });

  it('should not invalidate cache on error', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAddMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: 'テストマイルストーン',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockInvalidateMilestoneList).not.toHaveBeenCalled();
  });

  it('should handle payload without optional fields', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useAddMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    const payload = { title: 'テストマイルストーン' };

    result.current.mutate(payload);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/milestone/add', payload);
    });
  });
});

describe('useUpdateMilestoneMutation', () => {
  const mockInvalidateMilestoneList = vi.fn();
  const mockPost = vi.mocked(basicAxios.post);

  beforeEach(() => {
    vi.clearAllMocks();
    ;(useMilestoneCache as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateMilestoneList: mockInvalidateMilestoneList,
    });
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should call /milestone/update/{id} with correct payload', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useUpdateMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 1,
      body: { title: 'T', accomplished_date: '2026-08-20' },
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/milestone/update/1', {
        title: 'T',
        accomplished_date: '2026-08-20',
      });
    });
  });

  it('should invalidate milestone list cache on success', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useUpdateMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, body: { title: 'T' } });

    await waitFor(() => {
      expect(mockInvalidateMilestoneList).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useRemoveMilestoneMutation', () => {
  const mockInvalidateMilestoneList = vi.fn();
  const mockDelete = vi.mocked(basicAxios.delete);

  beforeEach(() => {
    vi.clearAllMocks();
    ;(useMilestoneCache as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateMilestoneList: mockInvalidateMilestoneList,
    });
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should call /milestone/remove/{id} with DELETE', async () => {
    mockDelete.mockResolvedValue({ data: { closed: 1 } });

    const { result } = renderHook(() => useRemoveMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(1);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/milestone/remove/1');
    });
  });

  it('should invalidate milestone list cache on success', async () => {
    mockDelete.mockResolvedValue({ data: { closed: 1 } });

    const { result } = renderHook(() => useRemoveMilestoneMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(1);

    await waitFor(() => {
      expect(mockInvalidateMilestoneList).toHaveBeenCalledTimes(1);
    });
  });
});