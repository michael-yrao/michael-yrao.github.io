// Pure derivation for the technique list: tier/family grouping, the board's scope-filter-sort-column pipeline, judge labels.
import { Technique, TechniqueTier } from '../../../core/models/progress.model';
import {
  columnFor,
  compareTechniques,
  TechniqueColumn,
  TechniqueSortKey,
  TechniqueStats,
} from './technique-view';

export interface FamilyGroup {
  family: string;
  items: Technique[];
}

export interface TierGroup {
  tier: TechniqueTier;
  label: string;
  families: FamilyGroup[];
}

export interface BoardColumn {
  readonly key: TechniqueColumn;
  readonly label: string;
  readonly items: Technique[];
}

// Fixed order (not alphabetical — alphabetical would put 'core' after 'dp'), matching the
// intermediate/advanced line: core (started) is always first; dp/tier1 are above the line;
// tier2/tier3 are below it.
const TIER_ORDER: TechniqueTier[] = ['core', 'dp', 'tier1', 'tier2', 'tier3'];
const TIER_LABEL: Record<TechniqueTier, string> = {
  core: 'Core',
  dp: 'DP framework — not started',
  tier1: 'Tier 1 · intermediate — not started',
  tier2: 'Tier 2 · advanced — not started',
  tier3: 'Tier 3 · advanced — not started',
};

// An advanced technique (tier2/tier3) is hidden from the board by default — same
// intermediate/advanced line TIER_LABEL already names — until the learner opts in via the toggle.
const HORIZON_TIERS: ReadonlySet<TechniqueTier> = new Set(['tier2', 'tier3']);

// Least- to most-advanced, matching how a technique actually progresses.
const BOARD_COLUMN_ORDER: TechniqueColumn[] = ['notStarted', 'inProgress', 'covered', 'mastered'];
const BOARD_COLUMN_LABEL: Record<TechniqueColumn, string> = {
  notStarted: 'Not started',
  inProgress: 'In progress',
  covered: 'Covered',
  mastered: 'Mastered',
};

// judgeLabel()'s host → short label map. Keyed by the bare hostname (no leading `www.` —
// judgeLabel strips that before lookup). A host with no entry here falls back to itself.
const JUDGE_HOST_LABELS: Readonly<Record<string, string>> = {
  'leetcode.com': 'LC',
  'neetcode.io': 'NC',
  'open.kattis.com': 'Kattis',
  'cses.fi': 'CSES',
  'hellointerview.com': 'HelloInterview',
  'progressiveoverflow.com': 'progressiveoverflow',
};

/** The items grouped by a key, in first-seen order — each bucket a new array. */
function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

/** Techniques grouped by tier (fixed `TIER_ORDER`, empty tiers dropped), family within each
 *  tier (A-Z), name within each family (A-Z). */
export function groupByTier(techniques: readonly Technique[]): TierGroup[] {
  const byTier = groupBy(techniques, (t) => t.tier);
  return TIER_ORDER.filter((tier) => byTier.has(tier)).map((tier) => {
    const families: FamilyGroup[] = [...groupBy(byTier.get(tier) ?? [], (t) => t.family).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([family, items]) => ({
        family,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
    return { tier, label: TIER_LABEL[tier], families };
  });
}

/** The techniques the horizon toggle lets through — the pool both the family filter's option
 *  list and the board itself draw from, so the filter never offers a family whose every
 *  technique is hidden. */
export function boardInScope(techniques: readonly Technique[], showHorizon: boolean): Technique[] {
  return techniques.filter((t) => showHorizon || !HORIZON_TIERS.has(t.tier));
}

/** The family filter's options: distinct families of the in-scope techniques, A-Z. */
export function boardFamiliesOf(inScope: readonly Technique[]): string[] {
  return [...new Set(inScope.map((t) => t.family))].sort((a, b) => a.localeCompare(b));
}

/** The board's four columns, in `BOARD_COLUMN_ORDER`, each carrying its own count — the
 *  in-scope techniques family-filtered, sorted once, then a plain `filter` per column so each
 *  column's items stay in sort order with no mutation. */
export function buildBoardColumns(
  inScope: readonly Technique[],
  family: string | null,
  sortKey: TechniqueSortKey,
  stats: ReadonlyMap<string, TechniqueStats>,
): BoardColumn[] {
  const sorted = inScope
    .filter((t) => family === null || t.family === family)
    .sort((a, b) => compareTechniques(a, b, sortKey, stats));
  return BOARD_COLUMN_ORDER.map((key) => ({
    key,
    label: BOARD_COLUMN_LABEL[key],
    items: sorted.filter((t) => columnFor(t, stats.get(t.name)) === key),
  }));
}

/** The judge a planned problem's `url` points at, for the detail row's number/label slot
 *  (`Kattis` instead of `#9001`). Bare hostname with `www.` stripped when the host isn't in
 *  `JUDGE_HOST_LABELS`; '' for a null or unparsable url — never throws. */
export function judgeLabel(url: string | null): string {
  if (!url) return '';
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return '';
  }
  const bareHost = hostname.replace(/^www\./, '');
  return JUDGE_HOST_LABELS[bareHost] ?? bareHost;
}
