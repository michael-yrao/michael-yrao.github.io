/**
 * Node's own `localStorage` is one file shared by every parallel test worker, so another spec's
 * `clear()` can wipe a seeded value mid-test. A private in-memory store keeps a spec's reads its own.
 */
export function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length(): number {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}
