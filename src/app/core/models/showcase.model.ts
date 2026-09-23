export const SHOWCASE_SCHEMA_VERSION = 1;

export type ShowcaseSegmentKind = 'container' | 'attempt' | 'helper';

export interface ShowcaseSegment {
  readonly kind: ShowcaseSegmentKind;
  readonly symbol: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly lines: readonly string[];
}

export interface ShowcaseEntry {
  readonly key: string;
  readonly lcNumber: number;
  readonly variant: string;
  /** Null only when neither a header nor a tracker title was found on the cse-progress side. */
  readonly title: string | null;
  readonly url: string | null;
  readonly file: string;
  readonly symbol: string;
  readonly attemptDate: string | null;
  readonly segments: readonly ShowcaseSegment[];
}

export interface ShowcaseData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly entries: readonly ShowcaseEntry[];
}
