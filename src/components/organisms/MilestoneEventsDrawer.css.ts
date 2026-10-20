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
  display: 'flex',
  flexDirection: 'column',
  padding: '0.25rem 0',
  borderBottom: '1px solid #eceff1',
  minWidth: 0,
});

export const eventTitleRow = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: '0.25rem',
});

export const metaLine = style({
  fontSize: '0.85rem',
  color: '#546e7a',
  margin: 0,
});

// 開閉ボタン（chevron）。開いた状態で 90 度回転させる。
export const toggleIcon = style({
  flexShrink: 0,
  marginTop: '0.15rem',
  color: '#78909c',
  transition: 'transform 200ms ease, color 150ms ease',
  selectors: {
    '&[data-expanded="true"]': {
      transform: 'rotate(90deg)',
      color: '#37474f',
    },
  },
  ':hover': {
    color: '#37474f',
  },
});
