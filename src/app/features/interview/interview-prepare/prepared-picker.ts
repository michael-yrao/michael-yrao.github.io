import type { PreparedSummary } from '../session/prepared-interviews.service';

/** Said wherever a request to the server could not be made. */
export const OFFLINE_MESSAGE = 'Could not reach the server.';
export const SAVE_REFUSED_MESSAGE = 'This browser could not save the prepared interview.';

/** A picker option: `<title> · <date prepared>`, or the date alone when the title is empty. */
export function preparedLabel(item: PreparedSummary): string {
  const date = new Date(item.createdAt).toLocaleDateString();
  return item.title ? `${item.title} · ${date}` : date;
}
