import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { userEvent, within } from '@storybook/test';
import { action } from '@storybook/addon-actions';
import { addHours } from 'date-fns';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MyCalendar } from '../components/pages/CalendarView';
import { AuthInfoProp, TimelineEventProps } from '../lib/TimelineType';
import { AuthStateContext, EventsStateContext } from '../hooks/useContextFamily';
import { authKeys } from '../resources/cache';
import { AxiosResponse } from 'axios';
import { MemoryRouter } from 'react-router-dom';

// 1. Mock Data
const mockEvents: TimelineEventProps[] = [
  { id: 1, title: 'My Event 1', start_time: addHours(new Date(), -2), end_time: addHours(new Date(), -1), staff_id: 1, group: 1 },
  { id: 2, title: 'Another User Event', start_time: new Date(), end_time: addHours(new Date(), 1), staff_id: 2, group: 2 },
  { id: 3, title: 'My Event 2', start_time: addHours(new Date(), 2), end_time: addHours(new Date(), 3), staff_id: 1, group: 1 },
];

const mockAuthToken: AuthInfoProp = { type: 'token', accessToken: '0123456789abcdef' };
const mockAuthId = '1';

// Mock data for useAuthQuery - returns AxiosResponse with data containing staff_id, group_id, group_name
const mockAuthResponse: AxiosResponse<{ staff_id: number; group_id: number; group_name: string }> = {
  data: { staff_id: 1, group_id: 1, group_name: 'group 1' },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
} as AxiosResponse<{ staff_id: number; group_id: number; group_name: string }>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Set mock data for queries
queryClient.setQueryData(authKeys.verify(mockAuthToken.accessToken), mockAuthResponse);
queryClient.setQueryData(authKeys.search('userID'), mockAuthId);

// 2. Meta configuration with decorators
const meta: Meta<typeof MyCalendar> = {
  title: 'Components/MyCalendar',
  component: MyCalendar,
  tags: ['autodocs'],
  argTypes: {
    onTimeChangeEvents: { action: 'onTimeChangeEvents' },
    onSlotInfo: { action: 'onSlotInfo' },
  },
  decorators: [
    (Story) => {
      return (
        <MemoryRouter>
          <MantineProvider>
          <QueryClientProvider client={queryClient}>
            <AuthStateContext.Provider value={mockAuthToken}>
              <EventsStateContext.Provider value={mockEvents}>
                <Story />
              </EventsStateContext.Provider>
            </AuthStateContext.Provider>
          </QueryClientProvider>
          </MantineProvider>
        </MemoryRouter>
      );
    },
  ],
};

export default meta;


// 3. Stories
type Story = StoryObj<typeof MyCalendar>;

export const Default: Story = {
  args: {
    onTimeChangeEvents: action('onTimeChangeEvents'),
    onSlotInfo: action('onSlotInfo'),
  },
  parameters: {
    // Mock react-query hooks that are used in the component
    msw: {
      handlers: [],
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // Verify only the user's events are rendered
    await canvas.findByText('My Event 1');
    await canvas.findByText('My Event 2');
    // Verify the other user's event is also rendered (styling is different)
    // await canvas.findByText('Another User Event');
  },
};

export const WithEventClick: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // Find and click the first event
    const eventElement = await canvas.findByText('My Event 1');
    await userEvent.click(eventElement);
  },
};