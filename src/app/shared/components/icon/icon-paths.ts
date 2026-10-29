export type IconName =
  | 'flame' | 'snowflake' | 'trophy' | 'cap' | 'check' | 'alert' | 'ban'
  | 'search' | 'x' | 'circle' | 'half' | 'pause' | 'play' | 'skip-back' | 'skip-forward'
  | 'step-back' | 'step-forward' | 'reset' | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'undo' | 'redo' | 'external' | 'info' | 'trend' | 'lock' | 'bulb' | 'clock' | 'memory'
  | 'sidebar' | 'terminal' | 'hexagon' | 'pick' | 'arrow-up' | 'square' | 'hash' | 'file';

const CIRCLE = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z';
const HALF_CIRCLE = 'M12 3a9 9 0 0 0 0 18z';
const PLAY = 'M7 4l13 8-13 8z';
const SQUARE = 'M6 6h12v12H6z';

/** Simple 24-grid line icons, hand-written, drawn with stroke="currentColor". */
export const ICON_PATHS: Readonly<Record<IconName, string>> = {
  flame: 'M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 3-2 4-4 4 0-3-1-5-3-7-3 3-4 6-4 10 0 4 3 7 7 7z',
  snowflake: 'M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5M12 2l-2 3M12 2l2 3M12 22l-2-3M12 22l2-3',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3',
  cap: 'M2 10l10-5 10 5-10 5-10-5zM6 12v5c0 1 3 3 6 3s6-2 6-3v-5M22 10v6',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 3 2 21h20L12 3zM12 10v5M12 18h.01',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  x: 'M6 6l12 12M18 6 6 18',
  circle: CIRCLE,
  half: CIRCLE,
  pause: 'M8 5v14M16 5v14',
  play: PLAY,
  'skip-back': 'M19 20 9 12l10-8zM5 4v16',
  'skip-forward': 'M5 4l10 8-10 8zM19 4v16',
  'step-back': 'M15 18l-6-6 6-6',
  'step-forward': 'M9 18l6-6-6-6',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  external: 'M14 4h6v6M20 4 10 14M18 14v6H4V6h6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
  trend: 'M4 20V10M12 20V4M20 20v-7',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  bulb: 'M9 21h6M12 3a7 7 0 0 1 4 12.7V18H8v-2.3A7 7 0 0 1 12 3z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  memory: 'M5 5h14v14H5zM9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  sidebar: 'M3 4h18v16H3zM15 4v16',
  terminal: 'M4 17l6-5-6-5M12 19h8',
  hexagon: 'M12 2l8.7 5v10L12 22l-8.7-5V7z',
  pick: 'M14 4l6 6-9 9-6-6zM5 19l-2 2',
  'arrow-up': 'M12 20V4M5 11l7-7 7 7',
  square: SQUARE,
  hash: 'M5 9h14M5 15h14M10 4 8 20M16 4l-2 16',
  file: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',
};

/** A second, filled sub-path drawn over the stroked outline of the shapes that carry a solid fill. */
export const ICON_FILLED: Readonly<Partial<Record<IconName, string>>> = {
  half: HALF_CIRCLE,
  play: PLAY,
  square: SQUARE,
};
