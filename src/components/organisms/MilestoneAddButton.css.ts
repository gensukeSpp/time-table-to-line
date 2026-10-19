import { style } from '@vanilla-extract/css';

export const addButtonArea = style({
  display: 'flex',
  justifyContent: 'flex-end',
  // 親（TimelinePage の adminBar）が縦積みの gap を持つため、ここでは余白を足さない。
  marginBottom: '0'
});
