import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('再オープン時にフォームが空になる（受入 1）', async () => {
    const Wrapper = () => {
      const [opened, setOpened] = useState(false);
      return (
        <MantineProvider>
          <button onClick={() => setOpened(true)}>開く</button>
          <MilestoneCreateDialog opened={opened} onClose={() => { setOpened(false); mockOnClose(); }} />
        </MantineProvider>
      );
    };
    render(<Wrapper />);
    const user = userEvent.setup();
    // 1回目: 開いてタイトルを入力 → コミットで閉じる
    await user.click(screen.getByRole('button', { name: '開く' }));
    const titleInput = await screen.findByPlaceholderText('マイルストーンのタイトルを入力');
    await user.type(titleInput, '前回のタイトル');
    mockMutate.mockImplementation((_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.());
    fireEvent.submit(titleInput.closest('form')!);
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    // 2回目: 再度開く → フォームが空
    await user.click(screen.getByRole('button', { name: '開く' }));
    expect(await screen.findByPlaceholderText('マイルストーンのタイトルを入力')).toHaveValue('');
  });
});