import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent, fn } from '@storybook/test';
import { Timeline } from 'react-calendar-timeline';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TimelineEventProps, AuthInfoProp } from "../lib/TimelineType";
import { EventsStateContext, AuthStateContext } from "../hooks/useContextFamily";
import { MyHorizonTimeline } from "../components/pages/TimelineComponent";
import { exEvents, exGroupUsers, exItems } from "../lib/SampleState";

import { eventsStateMock, groupMockMember } from "./lib/timeline.mock";
import { useEventsState } from "../hooks/useContextFamily";

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

const groups = [
  { id: 1, title: "group 1" },
  { id: 2, title: "group 2" },
];

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
