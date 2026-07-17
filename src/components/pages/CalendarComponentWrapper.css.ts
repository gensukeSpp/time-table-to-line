import { style } from '@vanilla-extract/css';

export const tabMenu = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-evenly",
  height: "15vh",
  marginTop: "5vh"
});

export const tabButton = style({
  color: "blueviolet",
  fontSize: "larger",
  width: "25%",
  selectors: {
    '&[data-state="active"]': {
      fontWeight: "bold",
      borderBottom: "cornflowerblue 3px solid", 
    }
  }
});
