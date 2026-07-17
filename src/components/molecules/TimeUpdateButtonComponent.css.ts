import { style } from '@vanilla-extract/css';

export const updateButtonArea = {
  container: style({
    position: 'fixed',
    top: '20%',
    left: '45%',
    zIndex: '1'
  }),
  countText: style({
    color: 'greenyellow'
  })
}
