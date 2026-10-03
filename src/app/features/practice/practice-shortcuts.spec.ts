import { RunShortcut, shortcutFor } from './practice-shortcuts';

const NO_KEYS = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

const ROWS: readonly { readonly name: string; readonly event: Parameters<typeof shortcutFor>[0]; readonly expected: RunShortcut | null }[] = [
  { name: 'Ctrl+Enter', event: { ...NO_KEYS, key: 'Enter', ctrlKey: true }, expected: 'all' },
  { name: 'Meta+Enter', event: { ...NO_KEYS, key: 'Enter', metaKey: true }, expected: 'all' },
  { name: "Ctrl+'", event: { ...NO_KEYS, key: "'", ctrlKey: true }, expected: 'sample' },
  { name: 'Enter with no modifier', event: { ...NO_KEYS, key: 'Enter' }, expected: null },
  { name: 'Ctrl+Shift+Enter', event: { ...NO_KEYS, key: 'Enter', ctrlKey: true, shiftKey: true }, expected: null },
  { name: 'Ctrl+a', event: { ...NO_KEYS, key: 'a', ctrlKey: true }, expected: null },
];

describe('shortcutFor', () => {
  it.each(ROWS)('$name', ({ event, expected }) => {
    expect(shortcutFor(event)).toBe(expected);
  });
});
