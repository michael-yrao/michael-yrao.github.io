// The suite runs on the Node major CI uses (deploy.yml `node-version`). Node 25+ ships its own
// `localStorage` global, which shadows jsdom's and fails hundreds of specs with misleading errors.
const SUPPORTED_NODE_MAJOR = 24;
const runtime = globalThis as { process?: { versions?: { node?: string } } };
const nodeMajor = Number(runtime.process?.versions?.node?.split('.')[0]);
if (nodeMajor !== SUPPORTED_NODE_MAJOR) {
  throw new Error(
    `Unit tests need Node ${SUPPORTED_NODE_MAJOR}, found ${nodeMajor}: export PATH=/opt/homebrew/opt/node@24/bin:$PATH`,
  );
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
