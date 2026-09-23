import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { CheatSheetsData, Technique, CHEAT_SHEETS_SCHEMA_VERSION } from '../models/cheat-sheet.model';
import { ALL_ALGORITHMS } from '../data/algorithms.data';

export type CheatSheetLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const CHEAT_SHEETS_ASSET = 'assets/cheat-sheets.json';

export type ProblemLink =
  | { kind: 'internal'; commands: string[] }
  | { kind: 'external'; url: string };

/** A family with its techniques, in the order the family first appears in the JSON —
 *  matches `techniquesByFamily()`'s grouping and drives `learn-list`'s section order and the
 *  cheat-sheet page's prev/next. */
export interface FamilyGroup {
  family: string;
  techniques: Technique[];
}

/**
 * Loads the bundled technique cheat-sheet contract (`assets/cheat-sheets.json`) once and
 * exposes it as signals, in the style of `ProgressService`. Phase C swaps the fetch for the
 * generated `dashboard/cheat-sheets.json` without touching any consumer of this service.
 */
@Injectable({ providedIn: 'root' })
export class CheatSheetService {
  private readonly http = inject(HttpClient);

  readonly status = signal<CheatSheetLoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<CheatSheetsData | null>(null);

  readonly techniquesByFamily = computed<FamilyGroup[]>(() => {
    const techniques = this.data()?.techniques ?? [];
    return techniques.reduce<FamilyGroup[]>((groups, technique) => {
      const existing = groups.find((g) => g.family === technique.family);
      if (existing) {
        return groups.map((g) =>
          g === existing ? { ...g, techniques: [...g.techniques, technique] } : g,
        );
      }
      return [...groups, { family: technique.family, techniques: [technique] }];
    }, []);
  });

  /** The family-grouped techniques flattened back into one list — the order `learn-list`
   *  renders cards in, and what the cheat-sheet page's prev/next walks. */
  readonly orderedTechniques = computed<Technique[]>(() =>
    this.techniquesByFamily().flatMap((group) => group.techniques),
  );

  /** Fetch the bundled asset once. A no-op while already loading or ready; an error retries. */
  load(): void {
    if (this.status() === 'loading' || this.status() === 'ready') return;

    this.status.set('loading');
    this.error.set(null);

    this.http
      .get<CheatSheetsData>(CHEAT_SHEETS_ASSET)
      .pipe(catchError((err) => of(this.toError(err))))
      .subscribe((result) => {
        if (result instanceof Error) {
          this.status.set('error');
          this.error.set(result.message);
          this.data.set(null);
          return;
        }
        const invalid = this.invalidReason(result);
        if (invalid) {
          this.status.set('error');
          this.error.set(invalid);
          this.data.set(null);
          return;
        }
        this.data.set(result);
        this.status.set('ready');
      });
  }

  techniqueById(id: string): Technique | undefined {
    return this.data()?.techniques.find((t) => t.id === id);
  }

  /** Resolves a `keyProblems` entry to this site's own visualizer route when `ALL_ALGORITHMS`
   *  has that LeetCode number, else to a best-effort LeetCode URL derived from the title. */
  resolveProblemLink(lcNumber: number, title: string): ProblemLink {
    const algorithm = ALL_ALGORITHMS.find((a) => a.lcNumber === lcNumber);
    if (algorithm) {
      return { kind: 'internal', commands: ['/algorithms', algorithm.category, algorithm.id] };
    }
    return { kind: 'external', url: `https://leetcode.com/problems/${this.slugify(title)}/` };
  }

  /** Runs of non-alphanumerics collapse to a single hyphen, trimmed of leading/trailing
   *  hyphens. A literal implementation of the plan's slug rule — it diverges from real
   *  LeetCode slugs on punctuation (e.g. "Pow(x, n)" → "pow-x-n", LeetCode's own is
   *  "powx-n"), which is a known, non-blocking gap the plan accepts. */
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private invalidReason(result: { schemaVersion?: number; techniques?: unknown } | null): string | null {
    if (!result || typeof result.schemaVersion !== 'number') {
      return 'assets/cheat-sheets.json has no valid cheat-sheet data.';
    }
    if (result.schemaVersion !== CHEAT_SHEETS_SCHEMA_VERSION) {
      return `The bundled cheat sheets are schema v${result.schemaVersion}; this viewer speaks v${CHEAT_SHEETS_SCHEMA_VERSION}. Update the site.`;
    }
    if (!Array.isArray(result.techniques)) {
      return 'assets/cheat-sheets.json has no techniques[] array.';
    }
    return null;
  }

  private toError(err: { status?: number }): Error {
    return new Error(`Could not load the technique cheat sheets (HTTP ${err?.status ?? '?'}).`);
  }
}
