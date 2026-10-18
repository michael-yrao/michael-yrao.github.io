export const PATTERN_SENSE_SCHEMA_VERSION = 1;

/** One step-1 chip: a family id and, in order, its step-2 technique chips. */
export interface PatternSenseFamily {
  readonly id: string;
  readonly techniques: readonly string[];
}

/** One weekly-deck problem. The lcNumber only feeds the results code; it is never shown. */
export interface PatternSenseProblem {
  readonly lcNumber: number;
  readonly prompt: string;
  readonly constraints: readonly string[];
  readonly family: string;
  readonly technique: string;
  readonly cue: string;
}

/**
 * The weekly Pattern Sense deck (`dashboard/pattern-sense.json`). `week` is null (with no
 * problems) when no deck is published. `vocabHash` is only echoed into the results code.
 */
export interface PatternSenseData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly week: string | null;
  readonly vocabHash: string;
  readonly families: readonly PatternSenseFamily[];
  readonly problems: readonly PatternSenseProblem[];
}
