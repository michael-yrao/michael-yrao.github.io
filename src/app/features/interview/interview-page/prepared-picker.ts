import type { PreparedSummary } from '../session/prepared-interviews.service';

export const LINK_UNREADABLE_MESSAGE = 'The problem in this link could not be read.';
export const SAVE_REFUSED_MESSAGE = 'This browser could not save the prepared interview.';

/** A picker option: `<title> · <date prepared>`, or the date alone when the title is empty. */
export function preparedLabel(item: PreparedSummary): string {
  const date = new Date(item.createdAt).toLocaleDateString();
  return item.title ? `${item.title} · ${date}` : date;
}
