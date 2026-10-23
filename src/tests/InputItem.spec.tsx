import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { AxiosResponse } from 'axios';

import { AddChildForm } from '../components/organisms/InputItem';
import { TimelineEventProps, GroupUserProps, MilestoneProps } from '../lib/TimelineType';
import { InquiryStaff } from '../lib/authPayload';
import { AuthStateContext } from '../hooks/useContextFamily';
import { authKeys, eventKeys, milestoneKeys } from '../resources/cache';
import { useUpdateEventMutation, useDeleteMutation } from '../hooks/useEventMutation';

vi.mock('../hooks/useEventMutation', () => ({
  useUpdateEventMutation: vi.fn(),
  useDeleteMutation: vi.fn(),
}));

const mockUpdateEvent = () => {
  const mutate = vi.fn();
  (useUpdateEventMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutate, isPending: false });
  return mutate;
};
const mockDeleteEvent = () => {
  (useDeleteMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: vi.fn(), isPending: false });
};

const authToken = 'valid-token';
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});

// 認証クエリ（/timetable/inquiry）用モック。normalizeAuthPayload が staff_id /
// admin を解決できる形（staff_id は JWT クレーム由来相当）。
const adminAuthResponse = {
  data: {
    staff_id: 1000,
    group_id: 7,
    group_name: 'group 1',
    admin: true,
  } as InquiryStaff,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
} as AxiosResponse<InquiryStaff>;
queryClient.setQueryData(authKeys.verify(authToken), adminAuthResponse);

// グループメンバー（/group/users）用モック。メンバー名解決に使う。
const mockGroupUsers: GroupUserProps[] = [
  { staff_id: 500, family_kana: 'フナキ', last_kana: 'カズヨシ' },
];
queryClient.setQueryData(eventKeys.userList(), {
  data: mockGroupUsers,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
} as AxiosResponse<GroupUserProps[]>);

// グループマイルストーン（/milestone/all）用モック。open のみ編集セレクトに出る（受け入れ 1）。
const mockMilestones: MilestoneProps[] = [
  { id: 1, staff_id: 1000, title: 'open-ms', color: '#9c27b0', status: 'open', created_at: '2026-01-01', guideline_end_date: null },
  { id: 2, staff_id: 1000, title: 'waiting-ms', color: '#009688', status: 'waiting', created_at: '2026-01-02', guideline_end_date: null },
];
queryClient.setQueryData(milestoneKeys.all(), mockMilestones);

const otherEvent: TimelineEventProps = {
  id: 1,
  group: 2,
  staff_id: 500,
  admin: false,
  title: 'other event',
  summary: '内容サマリー',
  progress: 'もうすぐ',
  start_time: new Date(),
  end_time: new Date(new Date().getTime() + 3600000),
  start: new Date(),
  end: new Date(new Date().getTime() + 3600000),
};

const myEvent: TimelineEventProps = {
  id: 9,
  group: 7,
  staff_id: 1000,
  admin: false,
  title: 'my event',
  start_time: new Date(),
  end_time: new Date(new Date().getTime() + 3600000),
  start: new Date(),
  end: new Date(new Date().getTime() + 3600000),
};

const renderWith = (event: TimelineEventProps, readOnly?: boolean) =>
  render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <AuthStateContext.Provider value={{ type: 'token', accessToken: authToken }}>
          <AddChildForm selectedEvent={event} closeClick={() => {}} readOnly={readOnly} />
        </AuthStateContext.Provider>
      </QueryClientProvider>
    </MantineProvider>
  );

describe('AddChildForm (readonly)', () => {
  it('管理者が他メンバーのイベントを readOnly で見ると更新/削除ボタンが出ない', () => {
    renderWith(otherEvent, true);
    // メンバー名（family_kana + last_kana）が staff_id 数値の代わりに表示される
    expect(screen.getByText('フナキカズヨシ')).toBeInTheDocument();
    // 読取専用: 内容・進捗が Text で表示され、編集 UI は出ない
    expect(screen.getByText('内容サマリー')).toBeInTheDocument();
    expect(screen.getByText('もうすぐ')).toBeInTheDocument(); // 保存された進捗（ラベル）が表示される
    // 更新 / 削除ボタンは表示しない（実装要件 1）
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    // 警告ダイアログも表示しない（管理者の読取専用なので不要）
    expect(screen.queryByText('異なるスタッフの、変更はできません')).not.toBeInTheDocument();
  });

  it('旧英字トークンの進捗を日本語ラベルで表示する', () => {
    renderWith({ ...otherEvent, progress: 'almost' }, true);
    expect(screen.getByText('もうすぐ')).toBeInTheDocument();
    expect(screen.queryByText('almost')).not.toBeInTheDocument();
  });

  it('自分のイベントも readOnly で開くと編集不可（更新/削除ボタンが出ない）', () => {
    renderWith(myEvent, true);
    // 編集は Calendar 側で行うため、タイムライン詳細モーダルでは常に閲覧専用
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    expect(screen.getByText('内容：')).toBeInTheDocument();
  });
});

describe('AddChildForm (edit mode: milestone)', () => {
  it('edit モードでマイルストーンセレクトが open のみを表示する', () => {
    renderWith(myEvent);
    expect(screen.getByText('open-ms')).toBeInTheDocument();
    expect(screen.queryByText('waiting-ms')).not.toBeInTheDocument(); // waiting は出ない（受け入れ 1）
  });

  it('edit モードでマイルストーン選択が eventItem に反映される', () => {
    renderWith(myEvent);
    // progress と milestone の 2 つのセレクトが存在。2 つ目（DOM 順）がマイルストーン。
    const milestoneSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(milestoneSelect, { target: { value: '1' } });
    expect(milestoneSelect).toHaveValue('1');
  });
});

// readOnly 表示でもマイルストーン名が出る（Task 5）
const msEvent: TimelineEventProps = { ...myEvent, id: 10, milestone_id: 1 };
describe('AddChildForm (readonly: milestone)', () => {
  it('readOnly で所属マイルストーン名を表示する', () => {
    renderWith(msEvent, true);
    expect(screen.getByText('マイルストーン：')).toBeInTheDocument();
    expect(screen.getByText('open-ms')).toBeInTheDocument();
  });
});

describe('AddChildForm (edit mode: progress null reset)', () => {
  it('旧英字トークンの進捗を日本語ラベルで表示し、更新時に正規化する', async () => {
    const mutate = mockUpdateEvent();
    mockDeleteEvent();
    renderWith({ ...myEvent, progress: 'almost' });
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('もうすぐ');
    await userEvent.setup().click(screen.getByRole('button', { name: '更新' }));
    const call = mutate.mock.calls[0][0] as { progress: unknown };
    expect(call.progress).toBe('もうすぐ');
  });

  it('進捗をプレースホルダーに戻すと null を送信する（受入 2）', async () => {
    const mutate = mockUpdateEvent();
    mockDeleteEvent();
    renderWith({ ...myEvent, progress: 'もうすぐ' }); // 進捗はラベル（日本語）で保存される
    const user = userEvent.setup();
    const progressSelect = screen.getAllByRole('combobox')[0];
    expect(progressSelect).toHaveValue('もうすぐ');
    // プレースホルダー（value=''）へ戻す
    fireEvent.change(progressSelect, { target: { value: '' } });
    expect(progressSelect).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '更新' }));
    const call = mutate.mock.calls[0][0] as { progress: unknown };
    expect(call.progress).toBeNull();
  });

  it('進捗を選択するとラベル（日本語）を送信する', async () => {
    const mutate = mockUpdateEvent();
    mockDeleteEvent();
    renderWith({ ...myEvent }); // 進捗なし（未定）の自分のイベント
    const user = userEvent.setup();
    const progressSelect = screen.getAllByRole('combobox')[0];
    // options の value（英字トークン 'complete'）ではなく label（'完了'）が保存される
    fireEvent.change(progressSelect, { target: { value: '完了' } });
    await user.click(screen.getByRole('button', { name: '更新' }));
    const call = mutate.mock.calls[0][0] as { progress: unknown };
    expect(call.progress).toBe('完了');
  });
});