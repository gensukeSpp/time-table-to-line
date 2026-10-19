import { style } from '@vanilla-extract/css';

export const header = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.5rem',
});

export const colorBar = style({
  width: '1.25rem',
  height: '0.75rem',
  borderRadius: '3px',
  flexShrink: 0,
});

export const eventRow = style({
  padding: '0.25rem 0',
  borderBottom: '1px solid #eceff1',
});

export const metaLine = style({
  fontSize: '0.85rem',
  color: '#546e7a',
  margin: 0,
});
