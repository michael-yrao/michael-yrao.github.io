import { TestBed } from '@angular/core/testing';

import { TechniqueMapComponent } from './technique-map.component';
import { ProblemProgress, Technique } from '../../../../core/models/progress.model';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'two_pointers',
    tier: 'core',
    started: true,
    minProblems: 3,
    problemCount: 1,
    problems: [11],
    bestComfort: '🟡',
    hasGreen: false,
    thin: true,
    hasVariantGap: false,
    ...overrides,
  };
}

function createFixture(
  techniques: Technique[],
  details: ProblemProgress[] | null = null,
  expandedName: string | null = null,
) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TechniqueMapComponent] });
  const fixture = TestBed.createComponent(TechniqueMapComponent);
  fixture.componentRef.setInput('techniques', techniques);
  fixture.componentRef.setInput('details', details);
  fixture.componentRef.setInput('expandedName', expandedName);
  fixture.detectChanges();
  return fixture;
}

describe('TechniqueMapComponent', () => {
  it('renders the node text as done/planned, not graduatedCount/minProblems', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A', problemCount: 1, minProblems: 3, plannedTotal: 3, graduatedCount: 0 }),
    ]);

    const ratio = fixture.nativeElement.querySelector('.tech-map__ratio');
    expect(ratio?.textContent?.trim()).toBe('1/3');
  });

  it("each node carries an SVG <title> with the same coverageTitle sentence as the list row's hover", () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A', problemCount: 1, minProblems: 3, plannedTotal: 3 }),
    ]);

    const title = fixture.nativeElement.querySelector('.tech-map__node title');
    expect(title?.textContent?.trim()).toBe('1 of 3 planned problems done · 2 more to be covered (3 needed)');
  });

  it('renders one node per technique', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A', family: 'heap' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', family: 'heap', buildsOn: ['A'] }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.tech-map__node').length).toBe(3);
  });

  it('draws one edge per valid buildsOn pair, dropping one whose endpoint is missing', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A', family: 'heap' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', family: 'heap', buildsOn: ['A', 'Ghost'] }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.tech-map__edge').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.tech-map__footnote')?.textContent)
      .toContain('1 prerequisite link skipped');
  });

  it('marks a node --mastered once its graduatedCount reaches minProblems, and --started below it', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Mastered', minProblems: 2, graduatedCount: 2 }),
      makeTechnique({ name: 'Started', minProblems: 3, graduatedCount: 1 }),
    ]);

    const nodeFor = (name: string) =>
      fixture.nativeElement.querySelector(`.tech-map__node[aria-label="${name}"]`) as HTMLElement;

    expect(nodeFor('Mastered').classList.contains('tech-map__node--mastered')).toBe(true);
    expect(nodeFor('Started').classList.contains('tech-map__node--mastered')).toBe(false);
    expect(nodeFor('Started').classList.contains('tech-map__node--started')).toBe(true);
  });

  it('marks a not-started technique --not-started regardless of graduatedCount', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Fresh', started: false, problemCount: 0, problems: [], graduatedCount: 0 }),
    ]);

    const node = fixture.nativeElement.querySelector('.tech-map__node') as HTMLElement;
    expect(node.classList.contains('tech-map__node--not-started')).toBe(true);
    expect(node.classList.contains('tech-map__node--mastered')).toBe(false);
  });

  it('derives mastery from details when graduatedCount is absent (older contract)', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Legacy', minProblems: 1, graduatedCount: undefined, problems: [11] })],
      [
        {
          lcNumber: 11,
          title: 'x',
          comfort: '🎓',
          level: 4,
          streak: 3,
          repDates: ['2026-01-01'],
          timeline: [],
        },
      ],
    );

    const node = fixture.nativeElement.querySelector('.tech-map__node') as HTMLElement;
    expect(node.classList.contains('tech-map__node--mastered')).toBe(true);
  });

  it('clicking a node emits select exactly once with that technique', () => {
    const fixture = createFixture([makeTechnique({ name: 'A' })]);
    const emitted: Technique[] = [];
    fixture.componentInstance.select.subscribe((t) => emitted.push(t));

    // SVG <g> is an SVGElement, not an HTMLElement — jsdom doesn't give it a .click(), so
    // dispatch the event the (click) binding actually listens for.
    fixture.nativeElement
      .querySelector('.tech-map__node')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('A');
  });

  it('pressing Enter on a node emits select', () => {
    const fixture = createFixture([makeTechnique({ name: 'A' })]);
    const emitted: Technique[] = [];
    fixture.componentInstance.select.subscribe((t) => emitted.push(t));

    fixture.nativeElement
      .querySelector('.tech-map__node')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('A');
  });

  it('marks the expanded node --selected and aria-pressed true', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'A' }), makeTechnique({ name: 'B' })],
      null,
      'B',
    );

    const nodeFor = (name: string) =>
      fixture.nativeElement.querySelector(`.tech-map__node[aria-label="${name}"]`) as HTMLElement;

    expect(nodeFor('B').classList.contains('tech-map__node--selected')).toBe(true);
    expect(nodeFor('B').getAttribute('aria-pressed')).toBe('true');
    expect(nodeFor('A').classList.contains('tech-map__node--selected')).toBe(false);
    expect(nodeFor('A').getAttribute('aria-pressed')).toBe('false');
  });

  it('renders no edges and every node as a root when no technique carries buildsOn (older contract)', () => {
    const fixture = createFixture([makeTechnique({ name: 'A' }), makeTechnique({ name: 'B' })]);

    expect(fixture.nativeElement.querySelectorAll('.tech-map__edge').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.tech-map__node').length).toBe(2);
  });

  describe('lane labels', () => {
    it('renders one lane label per lane, in order, with the human-readable family name', () => {
      const fixture = createFixture([
        makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
        makeTechnique({ name: 'B', family: 'heap' }),
      ]);

      const labels = Array.from(fixture.nativeElement.querySelectorAll('.tech-map__lane-label')) as HTMLElement[];
      expect(labels.map((l) => l.textContent?.trim())).toEqual(['Arrays & Hashing', 'Heap']);
    });

    it("a label's height matches its band's height, and --alt marks the second lane", () => {
      const fixture = createFixture([
        makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
        makeTechnique({ name: 'B', family: 'heap' }),
        makeTechnique({ name: 'C', family: 'heap', buildsOn: ['B'] }),
      ]);

      const labels = Array.from(fixture.nativeElement.querySelectorAll('.tech-map__lane-label')) as HTMLElement[];
      const bands = Array.from(fixture.nativeElement.querySelectorAll('.tech-map__band')) as SVGRectElement[];

      expect(labels[0].style.height).toBe(bands[0].getAttribute('height') + 'px');
      expect(labels[1].style.height).toBe(bands[1].getAttribute('height') + 'px');
      expect(labels[0].classList.contains('tech-map__lane-label--alt')).toBe(false);
      expect(labels[1].classList.contains('tech-map__lane-label--alt')).toBe(true);
      expect(bands[1].classList.contains('tech-map__band--alt')).toBe(true);
    });
  });

  describe('cross-lane edges and selection dimming', () => {
    it('marks an edge crossing families --cross, highlights it (with the accent marker) on selection, and marks the wrapper --has-selection', () => {
      const fixture = createFixture(
        [
          makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
          makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
        ],
        null,
        'A',
      );

      const edge = fixture.nativeElement.querySelector('.tech-map__edge') as SVGPathElement;
      expect(edge.classList.contains('tech-map__edge--cross')).toBe(true);
      expect(edge.classList.contains('tech-map__edge--highlighted')).toBe(true);
      expect(edge.getAttribute('marker-end')).toBe('url(#map-arrow-hi)');
      expect(
        fixture.nativeElement.querySelector('.tech-map__scroll')!.classList.contains('tech-map__scroll--has-selection'),
      ).toBe(true);
    });

    it('an edge not touching the selection is not --highlighted, and the wrapper carries no --has-selection with no selection', () => {
      const fixture = createFixture([
        makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
        makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      ]);

      const edge = fixture.nativeElement.querySelector('.tech-map__edge') as SVGPathElement;
      expect(edge.classList.contains('tech-map__edge--highlighted')).toBe(false);
      expect(
        fixture.nativeElement.querySelector('.tech-map__scroll')!.classList.contains('tech-map__scroll--has-selection'),
      ).toBe(false);
    });
  });

  describe('expansion toggle', () => {
    it('is collapsed by default: no expansion nodes/edges, and the toggle reads "Show tier 1–3 (N)"', () => {
      const fixture = createFixture([
        makeTechnique({ name: 'A', family: 'heap' }),
        makeTechnique({ name: 'B', family: 'expansion' }),
        makeTechnique({ name: 'C', family: 'expansion', buildsOn: ['A'] }),
      ]);

      expect(fixture.nativeElement.querySelector('.tech-map__node[aria-label="B"]')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.tech-map__node[aria-label="C"]')).toBeFalsy();
      expect(fixture.nativeElement.querySelectorAll('.tech-map__edge').length).toBe(0);

      const toggle = fixture.nativeElement.querySelector('.tech-map__toggle') as HTMLButtonElement;
      expect(toggle.textContent?.trim()).toBe('Show tier 1–3 (2)');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });

    it('toggling shows the expansion techniques and flips the label/aria-pressed', () => {
      const fixture = createFixture([
        makeTechnique({ name: 'A', family: 'heap' }),
        makeTechnique({ name: 'B', family: 'expansion' }),
      ]);

      const toggle = fixture.nativeElement.querySelector('.tech-map__toggle') as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tech-map__node[aria-label="B"]')).toBeTruthy();
      expect(toggle.textContent?.trim()).toBe('Hide tier 1–3 (1)');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('the toggle is absent when there are no expansion techniques', () => {
      const fixture = createFixture([makeTechnique({ name: 'A', family: 'heap' })]);
      expect(fixture.nativeElement.querySelector('.tech-map__toggle')).toBeFalsy();
    });
  });
});
