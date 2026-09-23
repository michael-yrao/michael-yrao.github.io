import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { GroundednessMeterComponent } from './groundedness-meter.component';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { LoadStatus } from '../../../core/services/github-file.service';
import { ShowcaseData } from '../../../core/models/showcase.model';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { computeGroundedness } from '../../../core/showcase/groundedness';

const RATIO_TO_PERCENT = 100;

/** A minimal stand-in for `ShowcaseService`: real signals (so the component's own `computed()`
 *  reacts to them) plus a spy in place of `load()`. The component is self-contained (plan
 *  B7 review) — it injects `ShowcaseService` and derives its report from `ALL_ALGORITHMS`
 *  itself, so the fixture provides the service, not `status`/`report` inputs. */
function makeShowcaseStub(overrides: { status?: LoadStatus; data?: ShowcaseData | null } = {}) {
  return {
    status: signal<LoadStatus>(overrides.status ?? 'idle'),
    data: signal<ShowcaseData | null>(overrides.data ?? null),
    load: vi.fn(),
  };
}

function createFixture(stub: ReturnType<typeof makeShowcaseStub>) {
  TestBed.configureTestingModule({
    imports: [GroundednessMeterComponent],
    providers: [{ provide: ShowcaseService, useValue: stub }],
  });
  const fixture = TestBed.createComponent(GroundednessMeterComponent);
  fixture.detectChanges();
  return fixture;
}

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

  it('renders nothing when ready but no data is available yet', () => {
    const fixture = createFixture(makeShowcaseStub({ status: 'ready', data: null }));
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders the sitewide grounded/total and a rounded percent once ready', () => {
    // An empty contract — every real ALL_ALGORITHMS variant that already carries a `variant`
    // id (migration is ongoing elsewhere in this repo) resolves to "no showcase entry", never
    // "grounded". Asserting against `computeGroundedness` run on the SAME data, rather than
    // hardcoded numbers, keeps this test correct regardless of how much has migrated.
    const emptyData: ShowcaseData = { schemaVersion: 1, generatedAt: '2026-09-22', entries: [] };
    const fixture = createFixture(makeShowcaseStub({ status: 'ready', data: emptyData }));

    const expected = computeGroundedness(ALL_ALGORITHMS, emptyData);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(String(expected.grounded));
    expect(text).toContain(String(expected.total));
    expect(text).toContain('michael-yrao/cse-progress');
    expect(text).toContain(`${Math.round(expected.ratio * RATIO_TO_PERCENT)}%`);
  });
});
