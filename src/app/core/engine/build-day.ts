/** The weekday the weekly build runs on, as `Date.getUTCDay()` numbers it (0 = Sunday). */
export const BUILD_WEEKDAY = 0;

const ISO_DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when the `YYYY-MM-DD` date falls on the build weekday; any other string, or a date that does not exist, is false. */
export function isBuildDay(iso: string): boolean {
  const match = ISO_DATE_SHAPE.exec(iso);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate && date.getUTCDay() === BUILD_WEEKDAY;
}
