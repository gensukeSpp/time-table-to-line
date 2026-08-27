import { style } from '@vanilla-extract/css';

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.35rem',
  minHeight: '1.25rem',
  padding: '0.125rem 0.25rem',
});

export const item = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.4rem',
});

export const colorBar = style({
  width: '3rem',
  height: '0.6rem',
  borderRadius: '3px',
  flexShrink: 0,
});
