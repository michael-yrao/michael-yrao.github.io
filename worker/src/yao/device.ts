const OTHER = 'Other';
const SEPARATOR = ' · ';

type Rule = readonly [label: string, pattern: RegExp];

// Order matters: the first match wins. iPhone/iPad UAs also say "Mac OS X", and Android UAs say "Linux".
const OS_RULES: readonly Rule[] = [
  ['iPhone', /iPhone/],
  ['iPad', /iPad/],
  ['Android', /Android/],
  ['Mac', /Macintosh|Mac OS X/],
  ['Windows', /Windows/],
  ['Linux', /Linux/],
];

// Edge and Chrome UAs both say "Safari"; Edge UAs also say "Chrome".
const BROWSER_RULES: readonly Rule[] = [
  ['Edge', /Edg\//],
  ['Chrome', /Chrome\/|CriOS/],
  ['Firefox', /Firefox\/|FxiOS/],
  ['Safari', /Safari\//],
];

function firstMatch(rules: readonly Rule[], ua: string): string {
  return rules.find(([, pattern]) => pattern.test(ua))?.[0] ?? OTHER;
}

/** "<OS> · <Browser>" from a User-Agent; the raw string is never kept. */
export function deviceLabel(ua: string): string {
  return `${firstMatch(OS_RULES, ua)}${SEPARATOR}${firstMatch(BROWSER_RULES, ua)}`;
}
