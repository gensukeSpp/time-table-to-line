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

export const waitingDate = style({
  color: '#888',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
});

export const titleButton = style({
  // ボタンのように見える浮き上がり (raised 3D 風)
  padding: '0.3rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #cfd8dc',
  background: 'linear-gradient(#fafafa, #eceff1)',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(0,0,0,0.06)',
  transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease',

  // ホバーでやや持ち上げ
  ':hover': {
    background: 'linear-gradient(#ffffff, #f5f5f5)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.18), inset 0 -1px 0 rgba(0,0,0,0.05)',
  },

  // 押下時に沈み込む
  ':active': {
    boxShadow: '0 1px 2px rgba(0,0,0,0.15), inset 0 1px 3px rgba(0,0,0,0.15)',
    transform: 'translateY(1px)',
  },
});
