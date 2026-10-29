import { Difficulty } from './algorithm.model';
import { ShowcaseSegment } from './showcase.model';

export const BIG_O_SCHEMA_VERSION = 1;

/**
 * One deck entry for the Big-O trainer: a real code slice from the learner's own
 * cse-progress solutions (`dashboard/big-o.json`), paired with the correct time/space
 * bounds and a curated set of distractor options. Mirrors `ShowcaseEntry`'s segment shape
 * so the same `buildDisplay`/`CodeViewerComponent` pipeline renders both.
 */
export interface BigOEntry {
  readonly key: string;
  readonly lcNumber: number;
  readonly variant: string | null;
  /** Null only when cse-progress found neither a header nor a tracker title. */
  readonly title: string | null;
  readonly url: string | null;
  /** Null for a reference-only entry (a problem with no solution code). */
  readonly file: string | null;
  /** Null for a reference-only entry. */
  readonly symbol: string | null;
  readonly attemptDate: string | null;
  readonly difficulty: Difficulty | null;
  /** The solution's folder name (e.g. `1d_dynamic_programming`) — opaque on this site. */
  readonly category: string;
  /** Whether this problem sits on the learner's complexity-miss ledger. */
  readonly isMiss: boolean;
  /** A short qualifier shown above the code (e.g. "per query"). */
  readonly note: string | null;
  readonly time: string;
  readonly space: string;
  readonly whyTime: string | null;
  readonly whySpace: string | null;
  /** The problem's variable legend, symbol to meaning, in display order. `{}` when the payload has none. */
  readonly variables: Readonly<Record<string, string>>;
  /** Up to 10 pool labels offered for time on the practice page, always including `time`; `[]` when the payload has none. */
  readonly timeChoices: readonly string[];
  /** Up to 10 pool labels offered for space on the practice page, always including `space`; `[]` when the payload has none. */
  readonly spaceChoices: readonly string[];
  /** Exactly 4 options, always including `time`. */
  readonly timeOptions: readonly string[];
  /** Exactly 4 options, always including `space`. */
  readonly spaceOptions: readonly string[];
  /** Empty for a reference-only entry, which the quiz never deals. */
  readonly segments: readonly ShowcaseSegment[];
}

export interface BigOData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  /** The complexity-label pool, in order: every label a stated bound may take. */
  readonly pool: readonly string[];
  readonly entries: readonly BigOEntry[];
}
