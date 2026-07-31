import { act, render } from '@testing-library/react';
import { composeStories } from '@storybook/react';


import * as stories from '../stories/Timeline.stories';
import React from 'react';

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
    const { container } = render(<Standard />);
    await act(() => {
      Standard.play?.({ canvasElement: container} as PlayCtx);
    });
  });
});
