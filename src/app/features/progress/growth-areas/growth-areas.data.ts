// Static copy for the Overview tab's growth-area toggle — the site's three pillars. DSA has
// live data (the Schedule card the page renders directly); System Design and AI Engineering
// are both "coming soon" — their copy lives here as `comingSoon`, null for DSA.

export type GrowthArea = 'dsa' | 'system-design' | 'ai-engineering';

/** A coming-soon area's copy: `title` is the bolded lead-in ("`{{ title }}` — coming soon."),
 *  `body` is the sentence after it. */
export interface ComingSoonCopy {
  readonly title: string;
  readonly body: string;
}

export interface GrowthAreaOption {
  readonly id: GrowthArea;
  readonly buttonLabel: string;
  /** null for DSA (live — no coming-soon copy needed). */
  readonly comingSoon: ComingSoonCopy | null;
}

export const GROWTH_AREAS: readonly GrowthAreaOption[] = [
  { id: 'dsa', buttonLabel: 'DSA', comingSoon: null },
  {
    id: 'system-design',
    buttonLabel: 'System Design',
    comingSoon: {
      title: 'System Design',
      body: 'Mock interviews, and live samples: small working systems built with the technologies the designs call for.',
    },
  },
  {
    id: 'ai-engineering',
    buttonLabel: 'AI Engineering',
    comingSoon: {
      title: 'AI Engineering',
      body: 'Hands-on notebooks on model APIs, evals, RAG and agents.',
    },
  },
];
