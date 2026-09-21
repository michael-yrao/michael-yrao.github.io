/** Today's date as `YYYY-MM-DD` in the VIEWER's local timezone — deliberately NOT
 *  `toISOString()`, which is UTC and can be off by a day depending on the viewer's
 *  timezone and time of day. Used everywhere a component compares against a server-emitted
 *  ISO date (nextReview, schedule day dates, study-day dates): the server never bakes in
 *  "today" for exactly this reason — a summary can be viewed days after it was generated,
 *  and only the viewer's own clock can say what "today" means to them right now. */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
