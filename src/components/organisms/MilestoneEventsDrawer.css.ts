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

// title clamp: 既定は 1 行、クリックで 2 行（クラス切替）
export const clampLine = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  wordBreak: 'break-word',
});

export const clamp1 = style({ WebkitLineClamp: 1 });
export const clamp2 = style({ WebkitLineClamp: 2 });

export const metaLine = style({
  fontSize: '0.85rem',
  color: '#546e7a',
  margin: 0,
});
