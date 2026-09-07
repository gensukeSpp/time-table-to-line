import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { AxiosResponse } from 'axios';

import { AddChildForm } from '../components/organisms/InputItem';
import { TimelineEventProps, GroupUserProps, MilestoneProps } from '../lib/TimelineType';
import { InquiryStaff } from '../lib/authPayload';
import { AuthStateContext } from '../hooks/useContextFamily';
import { authKeys, eventKeys, milestoneKeys } from '../resources/cache';

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
  progress: 'almost',
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
    expect(screen.getByText('almost')).toBeInTheDocument();
    // 更新 / 削除ボタンは表示しない（実装要件 1）
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    // 警告ダイアログも表示しない（管理者の読取専用なので不要）
    expect(screen.queryByText('異なるスタッフの、変更はできません')).not.toBeInTheDocument();
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