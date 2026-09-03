import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'absolute',
  zIndex: 100,
  maxWidth: '320px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#fff',
});
