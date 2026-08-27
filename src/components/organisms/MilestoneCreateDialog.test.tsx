import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneCreateDialog } from './MilestoneCreateDialog';
import { useAddMilestoneMutation } from '../../hooks/useMilestoneMutation';
import { MantineProvider } from '@mantine/core';

vi.mock('../../hooks/useMilestoneMutation', () => ({
  useAddMilestoneMutation: vi.fn(),
}));

const mockMutation = (mutate: ReturnType<typeof vi.fn>, isPending = false) => {
  ;(useAddMilestoneMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate,
    isPending,
  });
};

describe('MilestoneCreateDialog', () => {
  const mockOnClose = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトの mutation モックを設定（isPending 参照でクラッシュしないように）
    mockMutation(mockMutate);
  });

  it('should not submit empty title', async () => {
    render(
      <MantineProvider>
        <MilestoneCreateDialog opened={true} onClose={mockOnClose} />
      </MantineProvider>
    );

    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: /追加/ });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close dialog on success', async () => {
    mockMutate.mockImplementation((_values: unknown, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });

    render(
      <MantineProvider>
        <MilestoneCreateDialog opened={true} onClose={mockOnClose} />
      </MantineProvider>
    );

    const user = userEvent.setup();
    const titleInput = screen.getByPlaceholderText('マイルストーンのタイトルを入力');
    await user.type(titleInput, 'テストマイルストーン');

    const form = titleInput.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable submit button when title is empty', () => {
    render(
      <MantineProvider>
        <MilestoneCreateDialog opened={true} onClose={mockOnClose} />
      </MantineProvider>
    );

    const submitButton = screen.getByRole('button', { name: /追加/ });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when title has content', async () => {
    render(
      <MantineProvider>
        <MilestoneCreateDialog opened={true} onClose={mockOnClose} />
      </MantineProvider>
    );

    const user = userEvent.setup();
    const titleInput = screen.getByPlaceholderText('マイルストーンのタイトルを入力');
    await user.type(titleInput, 'テストマイルストーン');

    const submitButton = screen.getByRole('button', { name: /追加/ });
    expect(submitButton).toBeEnabled();
  });

  it('should call mutation with title when submitting', async () => {
    render(
      <MantineProvider>
        <MilestoneCreateDialog opened={true} onClose={mockOnClose} />
      </MantineProvider>
    );

    const user = userEvent.setup();
    const titleInput = screen.getByPlaceholderText('マイルストーンのタイトルを入力');
    await user.type(titleInput, 'テストマイルストーン');

    const form = titleInput.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
    const callArgs = mockMutate.mock.calls[0][0] as { title: string };
    expect(callArgs.title).toBe('テストマイルストーン');
  });
});