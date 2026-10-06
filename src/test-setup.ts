// Loads Zone.js's testing extensions (ProxyZone / FakeAsyncTestZone) so
// fakeAsync/tick work under the Vitest unit-test builder. The app build's
// polyfills provide zone.js itself; this layers the testing patch on top.
import 'zone.js/testing';

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
