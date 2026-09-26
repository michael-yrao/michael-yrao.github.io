// The events JSON contract served by this worker. This block is byte-for-byte identical to
// the TypeScript model in the Angular app (src/app/...); do not reformat, do not run Prettier
// over it, do not add fields. If it needs to change, change it here and in the app together.
export const EVENTS_SCHEMA_VERSION = 1;
export type EventArea = 'nyc' | 'online' | 'other';
export interface EventSource { id: string; label: string; company: string; kind: 'ical' | 'bevy';
  area?: 'nyc' | 'online';  /* pin: every event of this source gets this area */
  homepage?: string; ok: boolean; error?: string; count?: number }
export interface TechEvent { id: string; title: string; start: string /* ISO UTC */; end?: string;
  timezone?: string; allDay?: boolean; location?: string; area: EventArea; url: string; sourceId: string }
export interface EventsFeed { schemaVersion: number; generatedAt: string; horizonDays: number;
  sources: EventSource[]; events: TechEvent[] /* upcoming only, ascending by start */ }
