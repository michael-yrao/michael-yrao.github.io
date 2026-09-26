// The Tech Events feed contract, emitted by the Cloudflare Worker at EVENTS_API_URL (see
// src/app/core/data/site-links.ts). This block mirrors `worker/src/contract.ts`
// character-for-character.
export const EVENTS_SCHEMA_VERSION = 1;
export type EventArea = 'nyc' | 'online' | 'other';
export interface EventSource { id: string; label: string; company: string; kind: 'ical' | 'bevy';
  area?: 'nyc' | 'online';  /* pin: every event of this source gets this area */
  homepage?: string; ok: boolean; error?: string; count?: number }
export interface TechEvent { id: string; title: string; start: string /* ISO UTC */; end?: string;
  timezone?: string; allDay?: boolean; location?: string; area: EventArea; url: string; sourceId: string }
export interface EventsFeed { schemaVersion: number; generatedAt: string; horizonDays: number;
  sources: EventSource[]; events: TechEvent[] /* upcoming only, ascending by start */ }
