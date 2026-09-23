import { TestBed } from '@angular/core/testing';

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

  it("renders .recognition__date immediately after .recognition__title, then .recognition__links as the row's last child", () => {
    const fixture = createFixture(makeProbes());

    const rows = fixture.nativeElement.querySelectorAll('.recognition__row');
    for (const row of Array.from(rows) as HTMLElement[]) {
      const children = Array.from(row.children) as HTMLElement[];
      const titleIndex = children.findIndex((el) => el.classList.contains('recognition__title'));
      expect(titleIndex).toBeGreaterThan(-1);

      const dateEl = children[titleIndex + 1];
      expect(dateEl.classList.contains('recognition__date')).toBe(true);

      const linksEl = children[titleIndex + 2];
      expect(linksEl.classList.contains('recognition__links')).toBe(true);
      expect(children.length).toBe(titleIndex + 3);
    }
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
