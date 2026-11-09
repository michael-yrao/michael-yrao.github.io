/** An entry is engaged while its visible ratio passes the bar or it crosses the viewport's center line. */
export function isEngaged(isRatioMet: boolean, isCrossingCenter: boolean): boolean {
  return isRatioMet || isCrossingCenter;
}

/**
 * The full set of read entry ids to send, or null when nothing grew since the last send.
 * The client always sends its full set so a lost ping heals on the next one.
 */
export function nextSeenBatch(sent: ReadonlySet<string>, seen: ReadonlySet<string>): string[] | null {
  const hasGrown = [...seen].some((id) => !sent.has(id));
  return hasGrown ? [...seen] : null;
}
