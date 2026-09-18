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

// jsdom は HTMLDialogElement.showModal を実装していないため、
// Dialog コンポーネント（ネイティブ <dialog>）のテスト用にスタブを提供する
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
}
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
}
