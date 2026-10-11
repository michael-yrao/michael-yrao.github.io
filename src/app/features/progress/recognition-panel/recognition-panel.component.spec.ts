import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RecognitionPanelComponent } from './recognition-panel.component';
import { Probes } from '../../../core/models/progress.model';

function makeProbes(overrides: Partial<Probes> = {}): Probes {
  return {
    total: 8,
    cleanRate: 0.5,
    items: [
      { date: '2026-09-01', lcNumber: 1, title: 'Two Sum', technique: 'Hash Map', result: '🟢' },
      { date: '2026-09-08', lcNumber: 200, title: 'Number of Islands', technique: 'Graph-DFS', result: '🔴' },
    ],
    ...overrides,
  };
}

function createFixture(probes: Probes | null | undefined) {
  TestBed.configureTestingModule({ imports: [RecognitionPanelComponent] });
  const fixture = TestBed.createComponent(RecognitionPanelComponent);
  fixture.componentRef.setInput('probes', probes);
  fixture.detectChanges();
  return fixture;
}

describe('RecognitionPanelComponent', () => {
  it('renders the headline as "N probes · X% clean cold" from a stub', () => {
    const fixture = createFixture(makeProbes({ total: 8, cleanRate: 0.5 }));

    const headline = fixture.nativeElement.querySelector('.recognition__headline');
    expect(headline?.textContent).toContain('8 probes');
    expect(headline?.textContent).toContain('50% clean cold');
  });

  it('renders a gentle diagnostic gloss (never framed as failure)', () => {
    const fixture = createFixture(makeProbes({ cleanRate: 0.5 }));

    const gloss = fixture.nativeElement.querySelector('.recognition__gloss')?.textContent ?? '';
    expect(gloss.length).toBeGreaterThan(0);
    expect(gloss.toLowerCase()).not.toContain('fail');
  });

  it('renders the recent list with an LC link for each item that has an lcNumber', () => {
    const fixture = createFixture(makeProbes());

    const rows = fixture.nativeElement.querySelectorAll('.recognition__row');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Two Sum');
    expect(fixture.nativeElement.textContent).toContain('Number of Islands');

    const link = fixture.nativeElement.querySelector('.recognition__link');
    expect(link?.getAttribute('href')).toContain('leetcode.com');
  });

  it('draws the external link on every probe row, and Run beside it when the number is in practiceNumbers', () => {
    TestBed.configureTestingModule({ imports: [RecognitionPanelComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RecognitionPanelComponent);
    fixture.componentRef.setInput('probes', makeProbes());
    fixture.componentRef.setInput('practiceNumbers', new Set([1]));
    fixture.detectChanges();

    // recent() lists newest first: #200 then #1.
    const [external, practiced]: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.recognition__row'),
    );
    const run = practiced.querySelector('a[title="Run code"]');
    expect(run?.textContent?.trim()).toBe('>_');
    expect(run?.getAttribute('href')).toBe('/practice/1');
    expect(practiced.querySelector('a[title="External"]')).toBeTruthy();
    expect(external.querySelector('a[title="External"]')).toBeTruthy();
    expect(external.querySelector('a[title="Run code"]')).toBeFalsy();
  });

  it('shows the disposable/cold/counted-only-here note when there are probes', () => {
    const fixture = createFixture(makeProbes());

    expect(fixture.nativeElement.querySelector('.recognition__note')?.textContent).toContain('cold');
  });

  // ── The technique field is dropped from every row (recognition-gate spoiler) ───────
  it('renders no technique anywhere, even though items carry a technique field', () => {
    const fixture = createFixture(makeProbes());

    const rows = fixture.nativeElement.querySelectorAll('.recognition__row');
    for (const row of Array.from(rows) as HTMLElement[]) {
      expect(row.textContent).not.toContain('Hash Map');
      expect(row.textContent).not.toContain('Graph-DFS');
    }
  });

  it('renders a GitHub link to the probe file in the leading status badge', () => {
    TestBed.configureTestingModule({ imports: [RecognitionPanelComponent] });
    const fixture = TestBed.createComponent(RecognitionPanelComponent);
    fixture.componentRef.setInput(
      'probes',
      makeProbes({
        items: [{ date: '2026-09-01', lcNumber: 1, title: 'Two Sum', technique: 'Hash Map', result: '🟢', file: 'dsa/probes/1_two_sum.py' }],
      }),
    );
    fixture.componentRef.setInput('repoRef', { owner: 'o', repo: 'r', branch: 'main' });
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.recognition__row a.recognition__status--link');
    expect(link.getAttribute('href')?.endsWith('dsa/probes/1_two_sum.py')).toBe(true);
  });

  it("renders status, num, title, date, result, then .recognition__links as the row's last child", () => {
    const fixture = createFixture(makeProbes());

    const rows = fixture.nativeElement.querySelectorAll('.recognition__row');
    for (const row of Array.from(rows) as HTMLElement[]) {
      const classes = Array.from(row.children).map((el) => el.className.split(' ')[0]);
      expect(classes).toEqual([
        'recognition__status',
        'recognition__num',
        'recognition__title',
        'recognition__date',
        'recognition__result',
        'recognition__links',
      ]);
    }
  });

  it('renders the difficulty tag right after the title when a probe has a difficulty', () => {
    const fixture = createFixture(
      makeProbes({
        items: [{ date: '2026-09-01', lcNumber: 1, title: 'Two Sum', technique: 'Hash Map', result: '🟢', difficulty: 'Easy' }],
      }),
    );

    const row: HTMLElement = fixture.nativeElement.querySelector('.recognition__row');
    const children = Array.from(row.children) as HTMLElement[];
    const titleIndex = children.findIndex((el) => el.classList.contains('recognition__title'));
    const tag = children[titleIndex + 1];
    expect(tag.classList.contains('tag--easy')).toBe(true);
    expect(tag.textContent?.trim()).toBe('Easy');
  });

  it('shows a friendly hint and no crash when probes is null', () => {
    const fixture = createFixture(null);

    expect(fixture.nativeElement.querySelector('.recognition__hint')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.recognition__headline')).toBeFalsy();
  });

  it('shows a friendly hint and no crash when probes is undefined', () => {
    const fixture = createFixture(undefined);

    expect(fixture.nativeElement.querySelector('.recognition__hint')).toBeTruthy();
  });

  it('shows a friendly hint when probes.total is 0', () => {
    const fixture = createFixture(makeProbes({ total: 0, items: [] }));

    expect(fixture.nativeElement.querySelector('.recognition__hint')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.recognition__headline')).toBeFalsy();
  });
});
