import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthInfoProp } from "../lib/TimelineType";
import { EventsStateContext, AuthStateContext } from "../hooks/useContextFamily";
import { MyHorizonTimeline } from '../components/pages/TimelinePage';
import { exEvents } from "../lib/SampleState";

import "react-calendar-timeline/style.css";

const queryClient = new QueryClient();

const authParam: AuthInfoProp = {
  accessToken: "0123456789abcdef",
  type: "token",
};

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
  beforeEach: async () => {
    // await groupMockMember.mockReturnValue(groups);
    // await eventsStateMock.mockReturnValue(exItems);
  },
  args: {
    // items: exItems,
    // groups: groups,
    visibleTimeStart: 1457902922261,
    visibleTimeEnd: 1457902922261 + 86400000,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // canvas.getByRole
    expect(canvas.getByText("マイタイムライン")).toBeInTheDocument();
  },
};
