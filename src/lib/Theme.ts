// 1. Import the utilities
import { Theme } from "@emotion/react";

// 2. Update the breakpoints as key-value pairs
const breakpoints: Theme = {
  // base: "0px",
  sm: "320px",
  md: "768px",
  lg: "960px",
  // lg: "1280px",
  // xl: "1200px",
  // "2xl": "1536px",
};

// 3. Extend the theme
export const customTheme = { breakpoints };

// 4. Now you can use the custom breakpoints
// function Example() {
//   return <Box width={{ base: "100%", sm: "50%", md: "25%" }} />;
// }