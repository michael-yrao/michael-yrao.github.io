/** Fisher–Yates shuffle of a COPY of `items` (the input is never mutated).
 *  `random` returns a float in [0, 1) — `Math.random` in production, a deterministic
 *  function in tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
