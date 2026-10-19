import type { CoachEvent } from './contract.js';

/** Wire format for one event: `event: <type>`, `data: <json>`, blank line. */
export function formatEvent(event: CoachEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** A comment frame: keeps an idle proxy from closing the stream during a long turn. */
export const HEARTBEAT_FRAME = ': ping\n\n';
