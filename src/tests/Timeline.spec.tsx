import { act, render } from '@testing-library/react';
import { composeStories } from '@storybook/react';

import * as stories from '../stories/Timeline.stories';

describe('MyHorizonTimeline component', () =>{
  const { Standard } = composeStories(stories);
  type PlayCtx = Parameters<NonNullable<typeof Standard.play>>[0];
  it('タイムラインの表示', async () => {
    const { container } = render(<Standard />);
    await act(() => {
      Standard.play?.({ canvasElement: container} as PlayCtx);
    });
  });
});
