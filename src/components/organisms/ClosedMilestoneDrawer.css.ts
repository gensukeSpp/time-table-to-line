import { style } from '@vanilla-extract/css';

export const row = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.4rem',
});

export const colorBar = style({
  width: '1.25rem',
  height: '0.6rem',
  borderRadius: '3px',
  flexShrink: 0,
});

// 達成日: タイトルより小さいフォント、折り返さない
export const accomplishedDate = style({
  marginLeft: 'auto',
  flexShrink: 0,
  fontSize: '0.75rem',
  color: '#78909c',
  whiteSpace: 'nowrap',
});

export const nestedList = style({
  marginLeft: '0.75rem',
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
