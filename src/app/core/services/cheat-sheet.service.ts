import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import {
  CheatSheetsData,
  Technique,
  CHEAT_SHEETS_SCHEMA_VERSION,
} from '../models/cheat-sheet.model';
import { ALL_ALGORITHMS } from '../data/algorithms.data';
import { GitHubFileService, RepoRef, parseRepoSlug } from './github-file.service';

export type CheatSheetLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Which copy of the contract is currently loaded: the repo-fetched one, or the bundled
 *  fallback asset. `null` before anything has loaded. */
export type CheatSheetSource = 'repo' | 'bundled' | null;

const CHEAT_SHEETS_ASSET = 'assets/cheat-sheets.json';
// Same logical file ProgressService fetches from `dashboard/`, in the same repo/branch —
// no legacy-path fallback here, since this file has no earlier location to fall back to.
const CHEAT_SHEETS_FILE = 'dashboard/cheat-sheets.json';

export type ProblemLink =
  { kind: 'internal'; commands: string[] } | { kind: 'external'; url: string };

/** A family with its techniques, in the order the family first appears in the JSON —
 *  matches `techniquesByFamily()`'s grouping and drives `learn-list`'s section order and the
 *  cheat-sheet page's prev/next. */
export interface FamilyGroup {
  family: string;
  techniques: Technique[];
}

/**
 * Loads the technique cheat-sheet contract from cse-progress's `dashboard/cheat-sheets.json`
 * (the same repo/branch and Contents-API path `ProgressService` resolves) and exposes it as
 * signals. Falls back to the bundled `assets/cheat-sheets.json` — Phase B's only source — on
 * any remote failure, so the page always has something to render.
 */
@Injectable({ providedIn: 'root' })
export class CheatSheetService {
  private readonly http = inject(HttpClient);
  private readonly github = inject(GitHubFileService);

  readonly status = signal<CheatSheetLoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<CheatSheetsData | null>(null);
  /** Which copy is on screen; reset to `null` at the start of every `load()` so a retry
   *  never shows a stale source/slug while the new fetch is in flight. */
  readonly source = signal<CheatSheetSource>(null);
  private readonly repoRef = signal<RepoRef | null>(null);

  readonly generatedAt = computed<string | null>(() => this.data()?.generatedAt ?? null);

  /** "owner/name" of the repo a remote load came from; `null` when nothing loaded from a
   *  repo (idle, still loading, or on the bundled fallback). */
  readonly repoSlug = computed<string | null>(() => {
    const ref = this.repoRef();
    return ref ? `${ref.owner}/${ref.repo}` : null;
  });

  /** The one-line footer both `/learn` pages render: which copy of the contract is on
   *  screen and when it was generated. `null` until a load finishes. */
  readonly sourceFooter = computed<string | null>(() => {
    const generatedAt = this.generatedAt();
    const source = this.source();
    if (!generatedAt || !source) return null;
    if (source === 'bundled') return `Bundled copy (generated ${generatedAt})`;
    const slug = this.repoSlug();
    return slug ? `Generated ${generatedAt} from ${slug}` : `Generated ${generatedAt}`;
  });

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

  /** Fetch the cheat-sheet contract, repo first. `repoOverride` is the raw `?repo=` value
   *  (owner/name[@branch]); omitted/null resolves to `DEFAULT_REPO`@`DEFAULT_BRANCH`, same as
   *  `ProgressService.loadSummary`. Any remote failure — network error, non-404 or 404, bad
   *  JSON, a schema mismatch, missing `techniques[]`, or a malformed `repoOverride` — falls
   *  back to the bundled asset silently (a `console.warn` is the only trace); only a failure
   *  of THAT fallback reaches `error`. A no-op while already loading or ready; an error retries. */
  load(repoOverride?: string | null): void {
    if (this.status() === 'loading' || this.status() === 'ready') return;

    this.status.set('loading');
    this.error.set(null);
    this.source.set(null);
    this.repoRef.set(null);

    const ref = parseRepoSlug(repoOverride);
    if (!ref) {
      console.warn(`'${repoOverride}' isn't a repo slug; using the bundled cheat sheets.`);
      this.loadBundled();
      return;
    }

    this.github
      .fetch$<CheatSheetsData>(ref, CHEAT_SHEETS_FILE, false)
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        const invalid = result ? this.invalidReason(result, CHEAT_SHEETS_FILE) : null;
        if (result && !invalid) {
          this.data.set(result);
          this.source.set('repo');
          this.repoRef.set(ref);
          this.status.set('ready');
          return;
        }
        console.warn(
          invalid ??
            `Could not reach ${ref.owner}/${ref.repo}@${ref.branch}'s ${CHEAT_SHEETS_FILE}; using the bundled cheat sheets.`,
        );
        this.loadBundled();
      });
  }

  /** The fallback path — also Phase B's only path. Its own failure is the one that reaches
   *  `error` and keeps the existing error state + Retry. */
  private loadBundled(): void {
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
        const invalid = this.invalidReason(result, CHEAT_SHEETS_ASSET);
        if (invalid) {
          this.status.set('error');
          this.error.set(invalid);
          this.data.set(null);
          return;
        }
        this.data.set(result);
        this.source.set('bundled');
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

  /** `null` when `result` is a usable, compatible contract; else a human reason naming
   *  `label` (the file path it came from — `CHEAT_SHEETS_FILE` or `CHEAT_SHEETS_ASSET`). */
  private invalidReason(
    result: { schemaVersion?: number; techniques?: unknown } | null,
    label: string,
  ): string | null {
    if (!result || typeof result.schemaVersion !== 'number') {
      return `${label} has no valid cheat-sheet data.`;
    }
    if (result.schemaVersion !== CHEAT_SHEETS_SCHEMA_VERSION) {
      return `${label} is schema v${result.schemaVersion}; this viewer speaks v${CHEAT_SHEETS_SCHEMA_VERSION}. Update the site.`;
    }
    if (!Array.isArray(result.techniques)) {
      return `${label} has no techniques[] array.`;
    }
    return null;
  }

  private toError(err: { status?: number }): Error {
    return new Error(`Could not load the technique cheat sheets (HTTP ${err?.status ?? '?'}).`);
  }
}
