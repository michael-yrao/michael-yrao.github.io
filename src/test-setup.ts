// Node 25+ ships its own `localStorage` / `sessionStorage` globals (undefined without a storage
// file), which shadow jsdom's. Point them back at the storage of the vitest-exposed jsdom window.
const STORAGE_NAMES = ['localStorage', 'sessionStorage'] as const;
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
  for (const name of STORAGE_NAMES) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => jsdomWindow[name],
    });
  }
}

// jsdom has no modal dialog: stand in for `showModal` and `close`, as far as `open` and the `close` event go.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
