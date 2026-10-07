import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadAllAlgorithms } from '../../../core/data/algorithms.data';
import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { GroundednessReport, computeGroundedness } from '../../../core/showcase/groundedness';
import { GOLD_STANDARD_SLUG } from '../../../core/services/github-file.service';
import { ShowcaseService } from '../../../core/services/showcase.service';

const RATIO_TO_PERCENT = 100;

/** Relative on purpose: the app may be served under a base href. */
const REPORT_ASSET_URL = 'assets/groundedness.json';
const REPORT_ASSET_SCHEMA_VERSION = 1;

/** The report CI precomputed (`ci/groundedness.check.ts`), plus the contract it was computed from. */
interface GroundednessReportAsset extends GroundednessReport {
  readonly showcaseGeneratedAt: string;
}

/** Seam over the full-algorithms loader, so a spec can count calls to it. */
export const LOAD_ALL_ALGORITHMS = new InjectionToken<() => Promise<readonly AlgorithmMeta[]>>(
  'LOAD_ALL_ALGORITHMS',
  { factory: () => loadAllAlgorithms },
);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Validates the fetched asset at the boundary; anything malformed falls back to the live path. */
function isReportAsset(body: unknown): body is GroundednessReportAsset {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    candidate['schemaVersion'] === REPORT_ASSET_SCHEMA_VERSION &&
    typeof candidate['showcaseGeneratedAt'] === 'string' &&
    isFiniteNumber(candidate['total']) &&
    isFiniteNumber(candidate['grounded']) &&
    isFiniteNumber(candidate['legacy']) &&
    isFiniteNumber(candidate['ratio']) &&
    Array.isArray(candidate['failures'])
  );
}

const GROUNDED_EXPLANATION =
  'A solution variant is one approach to a problem; a problem can have several, so this counts ' +
  'more than the problem total. "Grounded" means the code shown is fetched live from the repo ' +
  'and every walkthrough step is anchored to a real line of it.';

/**
 * The "N of M solution variants grounded" meter (a solution is any showcased variant, with or without a
 * walkthrough) — identical on the Library hub and the Algorithms
 * list (plan B7), factored out once rather than duplicated (DRY). Self-contained: injects
 * `ShowcaseService` itself, triggers `load()`, and reports the sitewide groundedness — a caller
 * just places `<app-groundedness-meter>` with no inputs (the report is always "every
 * algorithm in the index against the gold-standard contract", identical everywhere it's shown).
 * After the first render it fetches the report CI precomputed; only when that asset is missing,
 * invalid or stale (computed from a different contract) does it load every algorithm and compute
 * the report live, so the host page paints first either way.
 */
@Component({
  selector: 'app-groundedness-meter',
  templateUrl: './groundedness-meter.component.html',
  styleUrls: ['./groundedness-meter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroundednessMeterComponent {
  private readonly showcase = inject(ShowcaseService);
  private readonly http = inject(HttpClient);
  private readonly loadAlgorithms = inject(LOAD_ALL_ALGORITHMS);

  private readonly algorithms = signal<readonly AlgorithmMeta[] | null>(null);
  /** undefined = not answered yet; null = missing or invalid; otherwise the precomputed report. */
  private readonly asset = signal<GroundednessReportAsset | null | undefined>(undefined);
  private hasStartedLiveLoad = false;

  readonly status = this.showcase.status;
  /** Null until the contract data and either a matching asset or the full algorithms are present. */
  readonly report = computed<GroundednessReport | null>(() => {
    const data = this.showcase.data();
    if (!data) return null;
    const asset = this.asset();
    if (asset && asset.showcaseGeneratedAt === data.generatedAt) return asset;
    const algorithms = this.algorithms();
    return algorithms ? computeGroundedness(algorithms, data) : null;
  });

  readonly repoSlug = GOLD_STANDARD_SLUG;

  readonly explanation = GROUNDED_EXPLANATION;

  readonly percent = computed(() => {
    const report = this.report();
    return report ? Math.round(report.ratio * RATIO_TO_PERCENT) : 0;
  });

  constructor() {
    this.showcase.load();
    afterNextRender(() => {
      this.http.get<unknown>(REPORT_ASSET_URL).subscribe({
        next: (body) => this.asset.set(isReportAsset(body) ? body : null),
        error: () => this.asset.set(null),
      });
    });
    effect(() => {
      const data = this.showcase.data();
      const asset = this.asset();
      if (!data || asset === undefined) return;
      if (asset && asset.showcaseGeneratedAt === data.generatedAt) return;
      untracked(() => this.startLiveLoad());
    });
  }

  private startLiveLoad(): void {
    if (this.hasStartedLiveLoad) return;
    this.hasStartedLiveLoad = true;
    this.loadAlgorithms().then(
      (loaded) => this.algorithms.set(loaded),
      (err: unknown) => console.error('Groundedness meter: loading the algorithms failed', err),
    );
  }
}
