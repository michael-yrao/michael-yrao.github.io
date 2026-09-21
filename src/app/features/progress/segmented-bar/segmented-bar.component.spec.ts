import { TestBed } from '@angular/core/testing';

import { SegmentedBarComponent, SegmentedBarSegment } from './segmented-bar.component';

function makeSegments(overrides: Partial<SegmentedBarSegment>[] = []): SegmentedBarSegment[] {
  const base: SegmentedBarSegment[] = [
    { key: 'a', label: 'Alpha', value: 30, cls: 'seg-easy' },
    { key: 'b', label: 'Beta', value: 10, cls: 'seg-medium' },
    { key: 'c', label: 'Gamma', value: 60, cls: 'seg-hard' },
  ];
  return overrides.length ? (overrides as SegmentedBarSegment[]) : base;
}

function createFixture(segments: SegmentedBarSegment[], opts: { clickable?: boolean; title?: string; caption?: string } = {}) {
  TestBed.configureTestingModule({ imports: [SegmentedBarComponent] });
  const fixture = TestBed.createComponent(SegmentedBarComponent);
  fixture.componentRef.setInput('segments', segments);
  if (opts.clickable !== undefined) fixture.componentRef.setInput('clickable', opts.clickable);
  if (opts.title !== undefined) fixture.componentRef.setInput('title', opts.title);
  if (opts.caption !== undefined) fixture.componentRef.setInput('caption', opts.caption);
  fixture.detectChanges();
  return fixture;
}

describe('SegmentedBarComponent', () => {
  it('sizes each segment width proportional to value/total', () => {
    const fixture = createFixture(makeSegments()); // total = 100, so pct === value

    const segs = fixture.nativeElement.querySelectorAll('.segbar__seg');
    expect(segs.length).toBe(3);
    expect((segs[0] as HTMLElement).style.width).toBe('30%');
    expect((segs[1] as HTMLElement).style.width).toBe('10%');
    expect((segs[2] as HTMLElement).style.width).toBe('60%');
  });

  it('computes width against the total of only the segments actually rendered', () => {
    // total = 20 + 20 = 40 -> each 50%.
    const fixture = createFixture([
      { key: 'x', label: 'X', value: 20, cls: 'seg-easy' },
      { key: 'y', label: 'Y', value: 20, cls: 'seg-hard' },
    ]);

    const segs = fixture.nativeElement.querySelectorAll('.segbar__seg');
    expect((segs[0] as HTMLElement).style.width).toBe('50%');
    expect((segs[1] as HTMLElement).style.width).toBe('50%');
  });

  it('shows each segment self-labeled with its label and value', () => {
    const fixture = createFixture(makeSegments());

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Alpha');
    expect(text).toContain('30');
    expect(text).toContain('Beta');
    expect(text).toContain('10');
    expect(text).toContain('Gamma');
    expect(text).toContain('60');
  });

  it('omits zero-value segments entirely', () => {
    const fixture = createFixture([
      { key: 'a', label: 'Alpha', value: 5, cls: 'seg-easy' },
      { key: 'b', label: 'Beta', value: 0, cls: 'seg-medium' },
    ]);

    const segs = fixture.nativeElement.querySelectorAll('.segbar__seg');
    expect(segs.length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Beta');
  });

  it('renders static (non-interactive) segments by default', () => {
    const fixture = createFixture(makeSegments());

    expect(fixture.nativeElement.querySelectorAll('button.segbar__seg').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('span.segbar__seg').length).toBe(3);
  });

  it('renders segments as buttons and emits segmentClick when clickable is true', () => {
    const fixture = createFixture(makeSegments(), { clickable: true });
    const clicked: SegmentedBarSegment[] = [];
    fixture.componentInstance.segmentClick.subscribe((s) => clicked.push(s));

    const buttons = fixture.nativeElement.querySelectorAll('button.segbar__seg');
    expect(buttons.length).toBe(3);

    (buttons[1] as HTMLButtonElement).click();

    expect(clicked.length).toBe(1);
    expect(clicked[0].key).toBe('b');
  });

  it('renders an optional title and caption', () => {
    const fixture = createFixture(makeSegments(), { title: 'Roadmap coverage', caption: 'A one-line gloss.' });

    expect(fixture.nativeElement.querySelector('.segbar__title')?.textContent).toContain('Roadmap coverage');
    expect(fixture.nativeElement.querySelector('.segbar__caption')?.textContent).toContain('A one-line gloss.');
  });

  it('omits the title/caption elements when not provided', () => {
    const fixture = createFixture(makeSegments());

    expect(fixture.nativeElement.querySelector('.segbar__title')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.segbar__caption')).toBeFalsy();
  });

  it('sets a summarizing aria-label on the bar (role="img")', () => {
    const fixture = createFixture(makeSegments(), { title: 'Roadmap coverage' });

    const bar = fixture.nativeElement.querySelector('.segbar__bar');
    expect(bar.getAttribute('role')).toBe('img');
    const label = bar.getAttribute('aria-label');
    expect(label).toContain('Roadmap coverage');
    expect(label).toContain('Alpha: 30');
  });
});
