import { decodeBase64Url, encodeBase64Url } from './host-key';
import { SignedProblem } from './interview-problem';
import { decodeLinkProblem, encodeLinkProblem, linkProblemValue } from './prepared-link';

const SIGNATURE = 'S'.repeat(86);
const utf8 = (text: string): string => encodeBase64Url(new TextEncoder().encode(text));
const OK_DATA = utf8('{"title":"ok"}');
const ABOVE_INPUT_CAP = 500_000;
const DEFLATE_BOMB_CHARS = 400_000;
const signed = (json: string): SignedProblem => ({ rev: 7, json, signature: SIGNATURE });

describe('prepared link', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { name: 'deflate', hasCompression: true, codec: 'd' },
    { name: 'plain, with no CompressionStream', hasCompression: false, codec: 'u' },
  ])('round trip: $name', async ({ hasCompression, codec }) => {
    if (!hasCompression) {
      vi.stubGlobal('CompressionStream', undefined);
    }
    const original = signed(JSON.stringify({ title: 'Paar süm ✓', statement: 'x'.repeat(2_000) }));

    const value = await encodeLinkProblem(original);

    expect(value.startsWith(`${codec}.7.${SIGNATURE}.`)).toBe(true);
    expect(await decodeLinkProblem(value)).toEqual(original);
  });

  it.each([
    { name: 'a null fragment', fragment: null, expected: null },
    { name: 'p=abc', fragment: 'p=abc', expected: 'abc' },
    { name: 'a leading #', fragment: '#p=abc', expected: 'abc' },
    { name: 'p among other params', fragment: 'x=1&p=abc', expected: 'abc' },
    { name: 'a fragment with no p', fragment: 'x=1', expected: null },
    { name: 'an empty p', fragment: 'p=', expected: null },
  ])('linkProblemValue: $name', ({ fragment, expected }) => {
    expect(linkProblemValue(fragment)).toBe(expected);
  });

  it('decode is null for every malformed value', async () => {
    const whole = await encodeLinkProblem(signed('{"title":"a longer problem body to cut"}'));
    const [, , , data] = whole.split('.');
    const cut = encodeBase64Url(decodeBase64Url(data).slice(0, 8));
    const bomb = (await encodeLinkProblem(signed('a'.repeat(DEFLATE_BOMB_CHARS)))).split('.')[3];
    const cases: readonly { name: string; value: string }[] = [
      { name: 'unknown codec', value: `x.7.${SIGNATURE}.${OK_DATA}` },
      { name: 'bad characters', value: `u.7.${SIGNATURE}.a+b/c=` },
      { name: 'over the input cap', value: `u.7.${SIGNATURE}.${'A'.repeat(ABOVE_INPUT_CAP)}` },
      { name: 'truncated deflate', value: `d.7.${SIGNATURE}.${cut}` },
      { name: 'a deflate bomb', value: `d.7.${SIGNATURE}.${bomb}` },
      { name: 'invalid UTF-8', value: `u.7.${SIGNATURE}.${encodeBase64Url(Uint8Array.of(0xff, 0xfe))}` },
      { name: 'a bad revision', value: `u.abc.${SIGNATURE}.${OK_DATA}` },
      { name: 'a wrong-length signature', value: `u.7.short.${OK_DATA}` },
    ];

    const results = await Promise.all(cases.map(({ value }) => decodeLinkProblem(value)));

    cases.forEach(({ name }, index) => expect(results[index], name).toBeNull());
  });
});
