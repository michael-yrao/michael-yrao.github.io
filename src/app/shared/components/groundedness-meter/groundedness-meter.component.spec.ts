import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { GroundednessMeterComponent, LOAD_ALL_ALGORITHMS } from './groundedness-meter.component';
import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { LoadStatus } from '../../../core/services/github-file.service';
import { ShowcaseData } from '../../../core/models/showcase.model';
import { loadAllAlgorithms } from '../../../core/data/algorithms.data';
import { computeGroundedness } from '../../../core/showcase/groundedness';

const RATIO_TO_PERCENT = 100;

/** A minimal stand-in for `ShowcaseService`: real signals (so the component's own `computed()`
 *  reacts to them) plus a spy in place of `load()`. The component is self-contained (plan
 *  B7 review) — it injects `ShowcaseService` and derives its report from the loaded algorithms
 *  itself, so the fixture provides the service, not `status`/`report` inputs. */
function makeShowcaseStub(overrides: { status?: LoadStatus; data?: ShowcaseData | null } = {}) {
  return {
    status: signal<LoadStatus>(overrides.status ?? 'idle'),
    data: signal<ShowcaseData | null>(overrides.data ?? null),
    load: vi.fn(),
  };
}

const REPORT_ASSET_URL = 'assets/groundedness.json';
const HTTP_NOT_FOUND = 404;

function createFixture(
  stub: ReturnType<typeof makeShowcaseStub>,
  loader: () => Promise<readonly AlgorithmMeta[]> = loadAllAlgorithms,
) {
  TestBed.configureTestingModule({
    imports: [GroundednessMeterComponent],
    providers: [
      { provide: ShowcaseService, useValue: stub },
      { provide: LOAD_ALL_ALGORITHMS, useValue: loader },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(GroundednessMeterComponent);
  fixture.detectChanges();
  return fixture;
}

const CONTRACT_DATE = '2026-09-22';
const ASSET_GROUNDED = 7;
const ASSET_TOTAL = 9;

const precomputedAsset = (showcaseGeneratedAt: string) => ({
  schemaVersion: 1,
  generatedAt: '2026-10-06T00:00:00.000Z',
  showcaseGeneratedAt,
  total: ASSET_TOTAL,
  grounded: ASSET_GROUNDED,
  legacy: 0,
  ratio: ASSET_GROUNDED / ASSET_TOTAL,
  failures: [],
});

describe('GroundednessMeterComponent report source', () => {
  const rows = [
    {
      name: 'asset matches the contract: uses it, never loads the algorithms',
      respond: (req: TestRequest) =>
        req.flush(precomputedAsset(CONTRACT_DATE)),
      loaderCalls: 0,
      shownCounts: [`${ASSET_GROUNDED}`, `${ASSET_TOTAL}`],
    },
    {
      name: 'asset 404: computes live',
      respond: (req: TestRequest) =>
        req.flush(null, { status: HTTP_NOT_FOUND, statusText: 'Not Found' }),
      loaderCalls: 1,
    },
    {
      name: 'asset stale (different contract): computes live',
      respond: (req: TestRequest) =>
        req.flush(precomputedAsset('2026-01-01')),
      loaderCalls: 1,
    },
  ];

  for (const row of rows) {
    it(row.name, async () => {
      const loader = vi.fn(() => Promise.resolve([] as readonly AlgorithmMeta[]));
      const data: ShowcaseData = { schemaVersion: 1, generatedAt: CONTRACT_DATE, entries: [] };
      const fixture = createFixture(makeShowcaseStub({ status: 'ready', data }), loader);

      await fixture.whenStable();
      row.respond(TestBed.inject(HttpTestingController).expectOne(REPORT_ASSET_URL));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(loader).toHaveBeenCalledTimes(row.loaderCalls);
      if ('shownCounts' in row) {
        const shown = Array.from(fixture.nativeElement.querySelectorAll('strong')).map(
          (el) => (el as HTMLElement).textContent?.trim(),
        );
        expect(shown).toEqual(row.shownCounts);
      }
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    });
  }
});

describe('GroundednessMeterComponent', () => {
  it('calls ShowcaseService.load() once on construction', () => {
    const stub = makeShowcaseStub();
    createFixture(stub);
    expect(stub.load).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator while loading', () => {
    const fixture = createFixture(makeShowcaseStub({ status: 'loading' }));
    expect(fixture.nativeElement.querySelector('.groundedness-meter--loading')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Checking groundedness');
  });

  it('shows the same loading indicator while idle (load() not yet resolved)', () => {
    const fixture = createFixture(makeShowcaseStub({ status: 'idle' }));
    expect(fixture.nativeElement.querySelector('.groundedness-meter--loading')).toBeTruthy();
  });

  it('renders nothing on error', () => {
    const fixture = createFixture(makeShowcaseStub({ status: 'error' }));
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows the loading indicator when ready but no data is available yet', () => {
    const fixture = createFixture(makeShowcaseStub({ status: 'ready', data: null }));
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('renders without throwing, and shows the loading indicator, while the algorithms are still loading', () => {
    const emptyData: ShowcaseData = { schemaVersion: 1, generatedAt: '2026-09-22', entries: [] };

    // Read before the first await: the loader's promise cannot have settled yet.
    const fixture = createFixture(makeShowcaseStub({ status: 'ready', data: emptyData }));

    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('renders the sitewide grounded/total and a rounded percent once ready', async () => {
    // An empty contract — every real algorithm variant that already carries a `variant`
    // id (migration is ongoing elsewhere in this repo) resolves to "no showcase entry", never
    // "grounded". Asserting against `computeGroundedness` run on the SAME data, rather than
    // hardcoded numbers, keeps this test correct regardless of how much has migrated.
    const emptyData: ShowcaseData = { schemaVersion: 1, generatedAt: '2026-09-22', entries: [] };
    const algorithms = await loadAllAlgorithms();
    const fixture = createFixture(makeShowcaseStub({ status: 'ready', data: emptyData }));
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne(REPORT_ASSET_URL)
      .flush(null, { status: HTTP_NOT_FOUND, statusText: 'Not Found' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const expected = computeGroundedness(algorithms, emptyData);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(String(expected.grounded));
    expect(text).toContain(String(expected.total));
    expect(text).toContain('michael-yrao/cse-progress');
    expect(text).toContain(`${Math.round(expected.ratio * RATIO_TO_PERCENT)}%`);
    expect(text).toContain('solution variants');

    const meterEl = fixture.nativeElement.querySelector('.groundedness-meter');
    expect(meterEl.getAttribute('data-tip')).toBeTruthy();
    expect(meterEl.getAttribute('data-tip')).toContain('variant');
    expect(meterEl.getAttribute('tabindex')).toBe('0');
  });
});
