import { act, render, waitFor, renderHook } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import { expect, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import * as stories from '../stories/Timeline.stories';
import React from 'react';
import { useEventsState } from '../hooks/useContextFamily';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ turns retries off
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// it("my first test", async () => {
//   const { result } = renderHook(() => useEventsState(), {
//     wrapper: createWrapper()
//   });
// });
// const useGroupUsersQueryMock = vi.hoisted(() => 
//   vi.fn(() => ({
//     data: [{ id: 1, title: 'group 1' }, { id: 2, title: 'group 2' }]
//   }))
// )
// vi.mock('./resources/queries', () => ({
//   useGroupUsersQueryMock,
// }));

describe('MyHorizonTimeline component', () =>{
  const { Standard } = composeStories<typeof import('../stories/Timeline.stories')>(stories);
  type PlayCtx = Parameters<NonNullable<typeof Standard.play>>[0];
  it('タイムラインの表示', async () => {
    const { container, getByText } = render(<Standard />);
    // const { result } = renderHook(() => useEventsState(), {
    //   wrapper: createWrapper()
    // });
    const titleElement = getByText('マイタイムライン');
    // expect(container).toMatchSnapshot();
    // const currentData = await waitFor(() => result.current.slice(-1)[0]);
    // expect(currentData).toBeDefined();
    await act(() => {
      Standard.play?.({ canvasElement: container} as PlayCtx);
    });
  });
});
