// The Overview tab's growth-area toggle — the site's three pillars. DSA has live data (the
// Schedule card the page renders directly); System Design and AI Engineering show a
// "Coming soon" card.

export type GrowthArea = 'dsa' | 'system-design' | 'ai-engineering';

export interface GrowthAreaOption {
  readonly id: GrowthArea;
  readonly buttonLabel: string;
}

export const GROWTH_AREAS: readonly GrowthAreaOption[] = [
  { id: 'dsa', buttonLabel: 'DSA' },
  { id: 'system-design', buttonLabel: 'System Design' },
  { id: 'ai-engineering', buttonLabel: 'AI Engineering' },
];
