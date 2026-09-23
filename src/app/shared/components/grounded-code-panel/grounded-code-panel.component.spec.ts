import { TestBed } from '@angular/core/testing';

import { GroundedCodePanelComponent } from './grounded-code-panel.component';
import { ShowcaseEntry } from '../../../core/models/showcase.model';
import { LoadStatus } from '../../../core/services/github-file.service';
import { VariantGroundedness } from '../../../core/showcase/groundedness';

function makeEntry(overrides: Partial<ShowcaseEntry> = {}): ShowcaseEntry {
  return {
    key: '733:bfs',
    lcNumber: 733,
    variant: 'bfs',
    title: 'Flood Fill',
    url: null,
    file: 'dsa/leetcode/graphs/733_flood_fill.py',
    symbol: 'floodFill_20260729',
    attemptDate: '2026-07-29',
    segments: [
      {
        kind: 'container',
        symbol: 'Solution',
        startLine: 39,
        endLine: 39,
        lines: ['class Solution:'],
      },
      {
        kind: 'attempt',
        symbol: 'floodFill_20260729',
        startLine: 41,
        endLine: 42,
        lines: ['    def floodFill_20260729(self, image):', '        return image'],
      },
    ],
    ...overrides,
  };
}

function createFixture(opts: {
  status: LoadStatus;
  error?: string | null;
  entry?: ShowcaseEntry | null;
  groundedness?: VariantGroundedness | null;
  label?: string;
}) {
  TestBed.configureTestingModule({ imports: [GroundedCodePanelComponent] });
  const fixture = TestBed.createComponent(GroundedCodePanelComponent);
  fixture.componentRef.setInput('status', opts.status);
  if (opts.error !== undefined) fixture.componentRef.setInput('error', opts.error);
  if (opts.entry !== undefined) fixture.componentRef.setInput('entry', opts.entry);
  if (opts.groundedness !== undefined)
    fixture.componentRef.setInput('groundedness', opts.groundedness);
  if (opts.label !== undefined) fixture.componentRef.setInput('label', opts.label);
  fixture.detectChanges();
  return fixture;
}

describe('GroundedCodePanelComponent', () => {
  it('shows a skeleton while loading (and idle)', () => {
    const fixture = createFixture({ status: 'loading' });
    expect(fixture.nativeElement.querySelector('.showcase-skeleton')).toBeTruthy();
  });

  it('shows the error message and a Retry button that emits (retry) on error', () => {
    const fixture = createFixture({ status: 'error', error: 'GitHub rate limit reached.' });
    expect(fixture.nativeElement.textContent).toContain('GitHub rate limit reached.');

    const retried: void[] = [];
    fixture.componentInstance.retry.subscribe(() => retried.push(undefined));
    (fixture.nativeElement.querySelector('.showcase-retry-btn') as HTMLButtonElement).click();
    expect(retried.length).toBe(1);
  });

  it('shows the "not published yet" message when ready with no entry', () => {
    const fixture = createFixture({ status: 'ready', entry: null });
    expect(fixture.nativeElement.textContent).toContain("isn't published from cse-progress yet");
  });

  it("shows a Grounded badge linking to the attempt segment's blob range when grounded", () => {
    const fixture = createFixture({
      status: 'ready',
      entry: makeEntry(),
      groundedness: { isGrounded: true, isLegacy: false, failures: [] },
      label: 'BFS',
    });

    const badge = fixture.nativeElement.querySelector('.groundedness-badge--grounded');
    expect(badge.textContent).toContain('Grounded ✓');
    expect(badge.textContent).toContain('michael-yrao/cse-progress');
    expect(badge.getAttribute('href')).toBe(
      'https://github.com/michael-yrao/cse-progress/blob/main/dsa/leetcode/graphs/733_flood_fill.py#L41-L42',
    );
    expect(fixture.nativeElement.textContent).toContain('BFS');
    expect(fixture.nativeElement.textContent).toContain('2026-07-29');
    expect(fixture.nativeElement.textContent).toContain('floodFill_20260729');
  });

  it('shows an Ungrounded badge with the failure reasons in its title when not grounded', () => {
    const fixture = createFixture({
      status: 'ready',
      entry: makeEntry(),
      groundedness: {
        isGrounded: false,
        isLegacy: false,
        failures: ["step 0: anchor 'x' — no match"],
      },
    });

    const badge = fixture.nativeElement.querySelector('.groundedness-badge--ungrounded');
    expect(badge.textContent.trim()).toBe('Ungrounded');
    expect(badge.getAttribute('title')).toContain('no match');
  });
});
