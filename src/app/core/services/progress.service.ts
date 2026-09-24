import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import {
  ProgressData,
  ProgressSummary,
  ProblemProgress,
  TrophyGraduateSummary,
  PROGRESS_SCHEMA_VERSION,
} from '../models/progress.model';
import {
  GitHubFileService,
  RepoRef,
  LoadStatus,
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  parseRepoSlug,
  sameRef,
  httpErrorMessage,
} from './github-file.service';

// The dashboard renders any repo that follows the cse-coach schema. This is the default
// when no ?repo= is given; ?repo=owner/name overrides it for any PUBLIC repo. Re-exported
// from github-file.service.ts, the single place the slug is spelled out, so existing
// importers of ProgressService keep compiling.
export { DEFAULT_REPO, DEFAULT_BRANCH };
export type { RepoRef, LoadStatus };

// Landing fetches SUMMARY_FILE only (a few KB, no `problems[]`) — instant, cheap, no
// per-problem components. DETAILS_FILE (the full 144 KB contract) is fetched only when the
// learner opts into "Explore problems".
//
// The contract files moved from the repo root into `dashboard/` on 2026-09-21. We prefer
// the new location and fall back to the legacy root path on a 404 (see fetchFile$), so an
// older cse-progress checkout — or a ?repo= adopter that hasn't relocated — still renders.
const SUMMARY_FILE = 'dashboard/progress-summary.json';
const DETAILS_FILE = 'dashboard/progress.json';
const LEGACY_SUMMARY_FILE = 'progress-summary.json';
const LEGACY_DETAILS_FILE = 'progress.json';

const NOT_FOUND_STATUS = 404;

// What a fetch failure is fetching, for httpErrorMessage()'s wording.
const PROGRESS_WHAT = 'progress';

/** Derive the lightweight summary from a full contract — the client-side mirror of
 *  cse-progress's `gamify.py::summary_of()`. Used when `progress-summary.json` 404s (an
 *  adopter on an older gamify.py that only emits progress.json, or the transient window
 *  before a repo regenerates) so the landing still renders off progress.json alone. */
function summaryFromFull(full: ProgressData): ProgressSummary {
  const trophyCase = full.trophyCase;
  const graduated: TrophyGraduateSummary[] = (trophyCase?.graduated ?? []).map((p) => ({
    lcNumber: p.lcNumber,
    title: p.title,
    difficulty: p.difficulty,
  }));
  return {
    schemaVersion: full.schemaVersion,
    generatedAt: full.generatedAt,
    totals: full.totals,
    pipeline: full.pipeline,
    difficulty: full.difficulty,
    streak: full.streak,
    coverage: full.coverage,
    onSchedule: full.onSchedule,
    badges: full.badges,
    trophyCase: { graduated, retired: trophyCase?.retired ?? [] },
    techniques: full.techniques,
    studyDays: full.studyDays,
    schedule: full.schedule,
    effortCeiling: full.effortCeiling,
    effortFloor: full.effortFloor,
    probes: full.probes,
    warnings: full.warnings,
  };
}

/**
 * Fetches the cse-coach progress contract from a public GitHub repo.
 *
 * Primary source is the GitHub Contents API with `Accept: application/vnd.github.raw`
 * (Cache-Control max-age=60), NOT raw.githubusercontent (max-age=300). The reason is the
 * Refresh button: a user-initiated refresh has to return current data, and a click against
 * raw's 5-minute CDN copy would do nothing. On a 403 (the API's 60/hr anonymous limit) we
 * fall back to raw so the page still renders. Phase 2 (GitHub login) lifts the limit to
 * 5000/hr. All state is signals so the page stays declarative.
 *
 * Two tiers, on purpose (see progress-summary.json in cse-progress/scripts/gamify.py):
 *   - `data` / `status` — the lightweight summary (aggregates only). Loaded on every
 *     navigation via `loadSummary()`. This is what the landing renders.
 *   - `details` / `detailsStatus` — the full `problems[]` array. Loaded only on explicit
 *     opt-in via `loadDetails()`, once per repo (or on a forced refresh).
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgressSummary | null>(null);
  readonly source = signal<RepoRef | null>(null);
  // A forced refresh keeps the current dashboard on screen (no blanking) and just spins the
  // button; refreshError surfaces a failed refresh inline without tearing down good data.
  readonly refreshing = signal(false);
  readonly refreshError = signal<string | null>(null);

  readonly details = signal<ProblemProgress[] | null>(null);
  readonly detailsStatus = signal<LoadStatus>('idle');
  readonly detailsError = signal<string | null>(null);
  readonly detailsRefreshing = signal(false);

  // Monotonic request ids: a slow earlier fetch must not overwrite a newer one (the ?repo
  // param can change, and there is no HttpClient cancellation on a bare subscribe). Summary
  // and details are independent request streams, so each gets its own sequence.
  private seq = 0;
  private detailsSeq = 0;

  readonly repoSlug = computed(() => {
    const s = this.source();
    return s ? `${s.owner}/${s.repo}` : null;
  });

  /** The active repo WITH its branch — what a per-row `src` link needs (`fileUrl`), since a
   *  progress.json `file` path is relative to whichever repo/branch the page is rendering,
   *  never to the gold standard. Null until a slug has been parsed. */
  readonly repoRef = this.source.asReadonly();

  constructor(private readonly github: GitHubFileService) {}

  /** Parse "owner/name" or "owner/name@branch"; empty/missing input falls back to the
   *  default repo, but a malformed slug (not exactly owner/name[@branch], every part
   *  non-empty) returns `null` instead of silently substituting the default — the caller
   *  decides how to surface that (see `loadSummary`'s null-ref branch). Delegates to
   *  `parseRepoSlug`, the single implementation shared with `GitHubFileService`. */
  parseRepo(raw: string | null | undefined): RepoRef | null {
    return parseRepoSlug(raw);
  }

  /** Fetch a logical contract file, preferring its `dashboard/` location and falling back
   *  to the legacy repo-root path ONLY on a genuine 404 (the files moved into `dashboard/`
   *  on 2026-09-21). A non-404 from the primary — a 403 rate-limit, offline, etc. —
   *  propagates unchanged rather than masquerading as "not found", so the caller's own
   *  404 handling (summary → full-contract derivation) stays correct. */
  private fetchFile$<T>(ref: RepoRef, primary: string, legacy: string, bust: boolean): Observable<T> {
    return this.github.fetch$<T>(ref, primary, bust).pipe(
      catchError((err) =>
        err?.status === NOT_FOUND_STATUS ? this.github.fetch$<T>(ref, legacy, bust) : throwError(() => err),
      ),
    );
  }

  /** Re-fetch the repo currently shown, bypassing caches. Used by the Refresh button.
   *  Always re-loads the summary; re-loads details too, but only if they were opened. */
  refresh(): void {
    const cur = this.source();
    if (!cur) return;
    this.loadSummary(`${cur.owner}/${cur.repo}@${cur.branch}`, true);
    if (this.detailsStatus() === 'ready') this.loadDetails(true);
  }

  /** Load the lightweight aggregate summary (progress-summary.json). This is what the
   *  landing renders and what the effect calls on every ?repo change. */
  loadSummary(raw: string | null | undefined, force = false): void {
    const ref = this.parseRepo(raw);
    if (!ref) {
      this.failInvalidSlug(raw);
      return;
    }
    // Skip a redundant reload of the repo already shown (the effect can fire twice with the
    // same value). A forced refresh always proceeds; a retry (not ready) always proceeds.
    const cur = this.source();
    if (!force && sameRef(cur, ref) && this.status() === 'ready') {
      return;
    }

    const mine = ++this.seq;
    // Idempotent write: only replace `source` when the repo actually changed. `parseRepo`
    // builds a NEW RepoRef object on every call, so an unconditional `source.set(ref)` here
    // would look like a change to anything tracking `source` (e.g. an effect calling this
    // method) even when the repo is identical — defense in depth alongside the `untracked`
    // wrap at the call site in progress-page.component.ts.
    if (!sameRef(cur, ref)) this.source.set(ref);
    if (force) {
      // Keep the current dashboard visible; just spin the button.
      this.refreshing.set(true);
      this.refreshError.set(null);
    } else {
      this.status.set('loading');
      this.error.set(null);
    }

    this.fetchFile$<ProgressSummary>(ref, SUMMARY_FILE, LEGACY_SUMMARY_FILE, force)
      .pipe(
        catchError((err) => {
          // A genuine 404 on the summary in BOTH locations (not "the whole repo is
          // unreachable") means this repo hasn't regenerated progress-summary.json yet —
          // fall back to the full contract and derive the aggregates client-side, so the
          // landing still works. Any other failure (403 rate-limit, network, etc.) keeps
          // the normal error path.
          if (err?.status !== NOT_FOUND_STATUS) return of(this.toError(err));
          return this.fetchFile$<ProgressData>(ref, DETAILS_FILE, LEGACY_DETAILS_FILE, force).pipe(
            map((full) => summaryFromFull(full)),
            catchError((fallbackErr) => of(this.toError(fallbackErr))),
          );
        }),
      )
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer loadSummary() superseded this response
        this.refreshing.set(false);

        if (result instanceof Error) {
          if (force) {
            // A failed refresh must not tear down good data already on screen.
            this.refreshError.set(result.message);
          } else {
            this.status.set('error');
            this.error.set(result.message);
            this.data.set(null);
          }
          return;
        }
        const invalid = this.invalidReason(result, ref);
        if (invalid) {
          if (force) {
            this.refreshError.set(invalid);
          } else {
            this.status.set('error');
            this.error.set(invalid);
            this.data.set(null);
          }
          return;
        }
        this.data.set(result);
        this.status.set('ready');
      });
  }

  /** Load the full contract's `problems[]` (progress.json) for the repo currently shown.
   *  Explicit opt-in only — never called from the navigation effect. A details error never
   *  blanks the (already-loaded) summary. */
  loadDetails(force = false): void {
    const ref = this.source();
    if (!ref) return;
    if (!force && this.detailsStatus() === 'ready') return;

    const mine = ++this.detailsSeq;
    const wasReady = this.detailsStatus() === 'ready';
    if (force && wasReady) {
      this.detailsRefreshing.set(true);
    } else {
      this.detailsStatus.set('loading');
      this.detailsError.set(null);
    }

    this.fetchFile$<ProgressData>(ref, DETAILS_FILE, LEGACY_DETAILS_FILE, force)
      .pipe(catchError((err) => of(this.toError(err))))
      .subscribe((result) => {
        if (mine !== this.detailsSeq) return; // a newer loadDetails() superseded this response
        this.detailsRefreshing.set(false);

        if (result instanceof Error) {
          this.detailsError.set(result.message);
          if (!wasReady) this.detailsStatus.set('error');
          return;
        }
        if (!Array.isArray(result.problems)) {
          this.detailsError.set(`${ref.owner}/${ref.repo} has no problems[] in progress.json.`);
          if (!wasReady) this.detailsStatus.set('error');
          return;
        }
        this.details.set(result.problems);
        this.detailsStatus.set('ready');
      });
  }

  /** A malformed `?repo=` (`parseRepo` returned `null`) is a fatal, non-retryable input
   *  error — no fetch attempted. Clears `source` so the header doesn't keep showing the
   *  previous, still-valid repo's slug next to a message that no longer describes it. */
  private failInvalidSlug(raw: string | null | undefined): void {
    this.seq++; // invalidate any in-flight fetch from a previously valid repo
    this.source.set(null);
    this.status.set('error');
    this.error.set(`'${raw}' isn't a repo slug — use owner/name or owner/name@branch.`);
    this.data.set(null);
  }

  /** null when the payload is a usable, compatible contract; else a human reason. */
  private invalidReason(result: { schemaVersion?: number } | null, ref: RepoRef): string | null {
    if (!result || typeof result.schemaVersion !== 'number') {
      return `${ref.owner}/${ref.repo} has no valid progress data — is it a cse-coach repo?`;
    }
    if (result.schemaVersion > PROGRESS_SCHEMA_VERSION) {
      return `That repo's progress data is schema v${result.schemaVersion}; this viewer speaks v${PROGRESS_SCHEMA_VERSION}. Update the site.`;
    }
    return null;
  }

  /** Turn an HttpErrorResponse into a human message (rate-limit / missing / offline). Text
   *  comes from the shared `httpErrorMessage`, unchanged from before the B2 extraction. */
  private toError(err: { status?: number }): Error {
    return new Error(httpErrorMessage(err, PROGRESS_WHAT));
  }
}
