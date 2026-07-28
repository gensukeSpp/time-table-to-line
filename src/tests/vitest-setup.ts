import '@testing-library/jest-dom/vitest';
import '@testing-library/dom';

// Mantine のカラースキーム検出に必要（jsdom には matchMedia がない）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
