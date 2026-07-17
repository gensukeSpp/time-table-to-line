import { style } from '@vanilla-extract/css';

export const flexXmandatory = style({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  overflowX: "auto",
  scrollSnapType: "x mandatory"
});

export const gridArea = style({
  display: 'grid',
  gridTemplateRows: '1fr 19fr',
  margin: '0 1%'
});
