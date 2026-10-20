// Reads the `weekly_build` switch from a cse.config.yml text without a YAML parser.
// The first uncommented `weekly_build:` line decides; true/false map to booleans, anything
// else (absent key, empty value, `True`) is null.
const KEY_PREFIX = 'weekly_build:';
const COMMENT_START = '#';
const LINE_BREAK = /\r?\n/;
const TRAILING_COMMENT = /\s#.*$/;
const VALUE_TRUE = 'true';
const VALUE_FALSE = 'false';

function parseSwitchValue(rawValue: string): boolean | null {
  const value = rawValue.replace(TRAILING_COMMENT, '').trim();
  if (value === VALUE_TRUE) return true;
  if (value === VALUE_FALSE) return false;
  return null;
}

export function readWeeklyBuildSwitch(text: string): boolean | null {
  for (const line of text.split(LINE_BREAK)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(COMMENT_START)) continue;
    if (trimmed.startsWith(KEY_PREFIX)) return parseSwitchValue(trimmed.slice(KEY_PREFIX.length));
  }
  return null;
}
