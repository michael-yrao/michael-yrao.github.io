// Static copy for the Overview tab's "Growth areas" section (item 6) — the two pillars with
// no live data yet. The DSA card's own numbers come from the live summary instead; see
// `DsaGrowthStats` in growth-areas.component.ts.

/** One named track under a not-yet-live growth area (e.g. System Design's "Mock interviews").
 *  `detail` is a short gloss shown after the name, or null when the name speaks for itself. */
export interface GrowthAreaTrack {
  readonly name: string;
  readonly detail: string | null;
}

export interface ComingSoonArea {
  readonly id: 'system-design' | 'ai-engineering';
  readonly title: string;
  readonly summary: string;
  readonly tracks: readonly GrowthAreaTrack[];
}

export const COMING_SOON_AREAS: readonly ComingSoonArea[] = [
  {
    id: 'system-design',
    title: 'System Design',
    summary: 'Designing larger systems end to end — the other half of the interview loop.',
    tracks: [
      { name: 'Mock interviews', detail: null },
      {
        name: 'Live samples',
        detail: 'small working systems built with the technologies the designs call for',
      },
    ],
  },
  {
    id: 'ai-engineering',
    title: 'AI Engineering',
    summary: 'Working through hands-on notebooks on model APIs, evals, RAG and agents.',
    tracks: [],
  },
];
