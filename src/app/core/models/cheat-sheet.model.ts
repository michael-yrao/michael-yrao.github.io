// The technique cheat-sheet contract, generated from cse-progress
// (see cse-progress/docs/cse-coach/learn_cheatsheet_plan.md). Phase B bundles a static
// src/assets/cheat-sheets.json that already matches this shape; Phase C switches the fetch
// to the generated dashboard/cheat-sheets.json, the same way ProgressService fetches
// progress.json — this file stays unchanged for that switch.
export const CHEAT_SHEETS_SCHEMA_VERSION = 1;

export interface CheatSheetsData {
  schemaVersion: number;
  generatedAt: string;
  signals: SignalRow[];
  techniques: Technique[];
}

export interface SignalRow {
  see: string;
  reach: string;
  note: string;
  /** false = `reach` is a plain label with no technique page (e.g. a one-trick entry like
   *  "two-heaps" that never got its own doc). Omitted/true = `reach` names a technique id. */
  page?: boolean;
}

export interface Technique {
  id: string;
  name: string;
  family: string;
  tier: string;
  whenToUse: string;
  signals: string[];
  picking: Picking;
  variants: Variant[];
  pitfalls: string[];
  keyProblems: KeyProblem[];
  docUrl: string;
}

export interface Picking {
  feature: string;
  notWhen: NotWhen[];
}

export interface NotWhen {
  technique: string;
  because: string;
  /** false = `technique` is a plain label with no technique page (e.g. a one-trick entry like
   *  "two-heaps" that never got its own doc). Omitted/true = `technique` names a technique id. */
  page?: boolean;
}

export interface Variant {
  title: string;
  when?: string;
  code: string;
  complexity: Complexity;
}

export interface Complexity {
  time: string;
  space: string;
  why: string;
}

export interface KeyProblem {
  lcNumber: number;
  title: string;
}
