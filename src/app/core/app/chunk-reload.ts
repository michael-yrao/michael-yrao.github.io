/** A tab opened before a deploy asks for a lazy chunk the new build no longer serves. */
const CHUNK_ERROR_PATTERN =
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export const CHUNK_RELOAD_KEY = 'po-chunk-reload';
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { message, name } = error as { message?: unknown; name?: unknown };
  return [message, name].some((part) => typeof part === 'string' && CHUNK_ERROR_PATTERN.test(part));
}

/** Reload unless the same target was reloaded within the window (the server truly lacks the chunk). */
export function shouldReload(target: string, stored: string | null, now: number): boolean {
  if (stored === null) return true;
  try {
    const last = JSON.parse(stored) as { target?: unknown; at?: unknown };
    if (last.target !== target || typeof last.at !== 'number') return true;
    return now - last.at >= CHUNK_RELOAD_WINDOW_MS;
  } catch {
    return true;
  }
}

export function readChunkReload(): string | null {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_KEY);
  } catch {
    return null;
  }
}

/** Set once a reload is under way, so the router and ErrorHandler paths cannot race two navigations. */
let isReloadInFlight = false;

/** Test-only: lets each spec start with no reload under way. */
export function resetChunkReloadForTests(): void {
  isReloadInFlight = false;
}

export function reloadTo(target: string, assign: (url: string) => void = (url) => location.assign(url)): void {
  if (isReloadInFlight) return;
  isReloadInFlight = true;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ target, at: Date.now() }));
  } catch {
    // Storage blocked: the reload still happens; only the loop guard is lost.
  }
  assign(target);
}
