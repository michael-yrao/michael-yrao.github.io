import { describe, expect, it } from 'vitest';
import { deviceLabel } from './device';

const CASES: ReadonlyArray<[string, string, string]> = [
  [
    'iPhone Safari',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'iPhone · Safari',
  ],
  [
    'Android Chrome',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Android · Chrome',
  ],
  [
    'Windows Edge',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Windows · Edge',
  ],
  [
    'Mac Chrome',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mac · Chrome',
  ],
  [
    'Linux Firefox',
    'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Linux · Firefox',
  ],
  ['empty', '', 'Other · Other'],
];

describe('deviceLabel', () => {
  it.each(CASES)('%s', (_name, ua, expected) => {
    expect(deviceLabel(ua)).toBe(expected);
  });
});
