import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Radix UI Checkbox / RadioGroup / Select use ResizeObserver internally — jsdom
// does not provide it, so we need a no-op stub.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Radix UI Select uses PointerEvent for keyboard / pointer interactions.
if (typeof window.PointerEvent === "undefined") {
  class PointerEvent extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  }
  // @ts-expect-error — jsdom polyfill
  window.PointerEvent = PointerEvent;
}
