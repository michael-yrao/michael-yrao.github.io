export type RunShortcut = 'all' | 'sample';

/** How many leading cases Ctrl/Cmd + ' runs. */
export const SAMPLE_CASE_COUNT = 2;

const SHORTCUT_BY_KEY: Readonly<Record<string, RunShortcut>> = {
  Enter: 'all',
  "'": 'sample',
};

/** Ctrl or Cmd + Enter → every case; Ctrl or Cmd + ' → the first SAMPLE_CASE_COUNT; anything else → null. */
export function shortcutFor(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): RunShortcut | null {
  const hasModifier = event.ctrlKey || event.metaKey;
  if (!hasModifier || event.altKey || event.shiftKey) return null;
  return SHORTCUT_BY_KEY[event.key] ?? null;
}
