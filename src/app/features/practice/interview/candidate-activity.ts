import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/** A paste at least this long, and not copied from the editor itself, counts as a large paste. */
export const LARGE_PASTE_MIN_CHARS = 40;

const CRLF = /\r\n/g;

function normalizeLineBreaks(text: string): string {
  return text.replace(CRLF, '\n');
}

/** Away means the tab is hidden or the window lost focus. */
export function isAway(visibilityState: DocumentVisibilityState, hasFocus: boolean): boolean {
  return visibilityState === 'hidden' || !hasFocus;
}

/** Whether this tab is away right now. */
export function isAwayNow(): boolean {
  return isAway(document.visibilityState, document.hasFocus());
}

/** Calls `onChange` each time the tab goes away or comes back, never twice with the same value; returns the unsubscribe. */
export function watchAway(onChange: (isAway: boolean) => void): () => void {
  let last = isAwayNow();
  const check = (): void => {
    const now = isAwayNow();
    if (now === last) {
      return;
    }
    last = now;
    onChange(now);
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('blur', check);
  window.addEventListener('focus', check);
  return () => {
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('blur', check);
    window.removeEventListener('focus', check);
  };
}

export function isLargePaste(pasted: string, lastCopied: string | null): boolean {
  const text = normalizeLineBreaks(pasted);
  if (text.length < LARGE_PASTE_MIN_CHARS) {
    return false;
  }
  return lastCopied === null || text !== normalizeLineBreaks(lastCopied);
}

/** What CodeMirror itself puts on the clipboard: the non-empty selected ranges, or, when every
 *  range is empty, the whole line under each cursor (once per line). */
function copiedText(view: EditorView): string {
  const { state } = view;
  const selected = state.selection.ranges.filter((range) => !range.empty).map((range) => state.sliceDoc(range.from, range.to));
  if (selected.length > 0) {
    return selected.join(state.lineBreak);
  }
  const lines: string[] = [];
  let lastLineNumber = -1;
  for (const { from } of state.selection.ranges) {
    const line = state.doc.lineAt(from);
    if (line.number > lastLineNumber) {
      lines.push(line.text);
    }
    lastLineNumber = line.number;
  }
  return lines.join(state.lineBreak);
}

/** Calls `onLargePaste` when the editor receives a large paste that did not come from itself.
 *  Never alters editing: every handler returns false and none calls preventDefault. */
export function largePasteExtension(onLargePaste: () => void): Extension {
  let lastCopied: string | null = null;
  const recordCopy = (_event: Event, view: EditorView): boolean => {
    lastCopied = copiedText(view);
    return false;
  };
  return EditorView.domEventHandlers({
    copy: recordCopy,
    cut: recordCopy,
    paste: (event: ClipboardEvent) => {
      const pasted = event.clipboardData?.getData('text/plain') ?? '';
      if (isLargePaste(pasted, lastCopied)) {
        onLargePaste();
      }
      return false;
    },
  });
}
