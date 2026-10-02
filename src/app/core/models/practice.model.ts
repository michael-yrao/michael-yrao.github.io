export const PRACTICE_SCHEMA_VERSION = 1;

/** How a returned value is compared with the expected one (set per problem by cse-progress). */
export type CompareMode = 'exact' | 'unordered' | 'unordered-nested';

export interface PracticeEntry {
  readonly className: string;
  readonly method: string;
}

export interface PracticeCase {
  /** Positional argument list passed to the entry method. */
  readonly args: readonly unknown[];
  /** Any JSON value, including null. */
  readonly expected: unknown;
  readonly example: boolean;
}

export interface PracticeProblem {
  readonly number: number;
  readonly title: string;
  readonly url: string | null;
  readonly statement: string;
  readonly stub: string;
  readonly entry: PracticeEntry;
  readonly compare: CompareMode;
  readonly cases: readonly PracticeCase[];
}

export interface PracticeData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly problems: readonly PracticeProblem[];
}
