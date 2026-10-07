import { contractCache } from './contract-cache';

/** A Map-backed stand-in for `caches`: stores the JSON text per request URL. */
function makeFakeCaches() {
  const store = new Map<string, string>();
  const cache = {
    match: async (url: string) => {
      const text = store.get(url);
      return text === undefined ? undefined : { json: async () => JSON.parse(text) };
    },
    put: async (url: string, response: Response) => {
      store.set(url, await response.text());
    },
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (request: { url: string }) => store.delete(request.url),
  };
  return { caches: { open: async () => cache }, store };
}

const PREFIX = 'o/r@main/dashboard/x.json';
const OLD_KEY = `${PREFIX}@${'a'.repeat(64)}`;
const NEW_KEY = `${PREFIX}@${'b'.repeat(64)}`;
const BODY = { n: 1 };

const rows = [
  {
    name: 'read miss → null',
    run: async () => contractCache.read(NEW_KEY),
    expected: null,
  },
  {
    name: 'write then read → the body',
    run: async () => {
      await contractCache.write(NEW_KEY, BODY);
      return contractCache.read(NEW_KEY);
    },
    expected: BODY,
  },
  {
    name: 'prune removes the other hash and keeps keepKey',
    run: async () => {
      await contractCache.write(OLD_KEY, BODY);
      await contractCache.write(NEW_KEY, BODY);
      await contractCache.prune(PREFIX, NEW_KEY);
      return [await contractCache.read(OLD_KEY), await contractCache.read(NEW_KEY)];
    },
    expected: [null, BODY],
  },
  {
    name: 'caches undefined → read returns null without throwing',
    withoutCaches: true,
    run: async () => contractCache.read(NEW_KEY),
    expected: null,
  },
];

describe('contractCache', () => {
  const original = (globalThis as { caches?: unknown }).caches;
  afterEach(() => {
    (globalThis as { caches?: unknown }).caches = original;
  });

  it.each(rows)('$name', async ({ withoutCaches, run, expected }) => {
    (globalThis as { caches?: unknown }).caches = withoutCaches
      ? undefined
      : makeFakeCaches().caches;

    expect(await run()).toEqual(expected);
  });
});
