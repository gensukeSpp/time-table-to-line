import { style } from '@vanilla-extract/css';

export const formParent = style({
  height: '40%',
  border: 'lightgray 2px solid',
  borderRadius: '3% 4%',
  // margin: '26% 1% 0 1%',
  padding: '3% 3%'
});

export const fixedClose = style({
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  width: '10%',
  height: '10vh',
  position: 'fixed',
  backgroundColor: 'blue',
  borderRadius: '12%',
  padding: '2%'
});
