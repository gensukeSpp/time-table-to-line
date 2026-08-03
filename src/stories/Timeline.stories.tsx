import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

import { AuthInfoProp, GroupUserProps } from "../lib/TimelineType";
import { EventsStateContext, AuthStateContext } from "../hooks/useContextFamily";
import { MyHorizonTimeline } from '../components/pages/TimelinePage';
import { exEvents } from "../lib/SampleState";
import { authKeys, eventKeys } from "../resources/cache";

import "react-calendar-timeline/style.css";

// テスト / Storybook 実行時にコンポーネント内の useGroupUsersQuery（/group/users）
// や useAuthQuery（/timetable/inquiry）が外部通信を行わないよう、react-query の
// キャッシュへモックデータを事前投入し、staleTime を Infinity にして再フェッチを抑止する。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const authParam: AuthInfoProp = {
  accessToken: "0123456789abcdef",
  type: "token",
};

// 認証クエリ（/timetable/inquiry）用モックレスポンス
const mockAuthResponse = {
  data: { type: "token", accessToken: authParam.accessToken } as AuthInfoProp,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
} as AxiosResponse<AuthInfoProp>;

// グループメンバー（/group/users）用モックレスポンス
const mockGroupMembers: GroupUserProps[] = [
  { staff_id: 1, family_kana: "group 1", last_kana: "last1" },
  { staff_id: 2, family_kana: "group 2", last_kana: "last2" },
];
const mockGroupResponse = {
  data: mockGroupMembers,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
} as AxiosResponse<GroupUserProps[]>;

// キャッシュへ事前投入することで、コンポーネント内のクエリがネットワークへ
// 到達しなくなる（staleTime: Infinity と合わせて再フェッチも発生しない）
queryClient.setQueryData(authKeys.verify(authParam.accessToken), mockAuthResponse);
queryClient.setQueryData(eventKeys.userList(), mockGroupResponse);

const meta: Meta<typeof MyHorizonTimeline> = {
  title: "MyTimeline",
  component: MyHorizonTimeline,
  decorators: [
    (Story) => {
      // "Error: No QueryClient set, use QueryClientProvider to set one"
      // https://stackoverflow.com/questions/65590195/error-no-queryclient-set-use-queryclientprovider-to-set-one
      return (
        <QueryClientProvider client={queryClient}>
          <AuthStateContext.Provider value={authParam}>
            <EventsStateContext.Provider value={exEvents}>
              <div style={{ border: '2px solid purple' }}>
                <Story />
              </div>
            </EventsStateContext.Provider>
          </AuthStateContext.Provider>
        </QueryClientProvider>
      )
    },
  ],
};
export default meta;
type Story = StoryObj<typeof MyHorizonTimeline>;

export const Standard: Story = {
  args: {
    visibleTimeStart: 1457902922261,
    visibleTimeEnd: 1457902922261 + 86400000,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // canvas.getByRole
    expect(canvas.getByText("マイタイムライン")).toBeInTheDocument();
  },
};
