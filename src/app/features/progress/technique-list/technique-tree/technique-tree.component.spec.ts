import { TestBed } from '@angular/core/testing';

import { TechniqueTreeComponent } from './technique-tree.component';
import { ProblemProgress, Technique } from '../../../../core/models/progress.model';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'Arrays',
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
  TestBed.configureTestingModule({ imports: [TechniqueTreeComponent] });
  const fixture = TestBed.createComponent(TechniqueTreeComponent);
  fixture.componentRef.setInput('techniques', techniques);
  fixture.componentRef.setInput('details', details);
  fixture.componentRef.setInput('expandedName', expandedName);
  fixture.detectChanges();
  return fixture;
}

describe('TechniqueTreeComponent', () => {
  it('renders one node per technique', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A' }),
      makeTechnique({ name: 'B', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', buildsOn: ['A'] }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.tech-tree__node').length).toBe(3);
  });

  it('draws one edge per valid buildsOn pair, dropping one whose endpoint is missing', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A' }),
      makeTechnique({ name: 'B', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', buildsOn: ['A', 'Ghost'] }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.tech-tree__edge').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.tech-tree__footnote')?.textContent)
      .toContain('1 prerequisite link skipped');
  });

  it('marks a node --mastered once its graduatedCount reaches minProblems, and --started below it', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Mastered', minProblems: 2, graduatedCount: 2 }),
      makeTechnique({ name: 'Started', minProblems: 3, graduatedCount: 1 }),
    ]);

    const nodeFor = (name: string) =>
      fixture.nativeElement.querySelector(`.tech-tree__node[aria-label="${name}"]`) as HTMLElement;

    expect(nodeFor('Mastered').classList.contains('tech-tree__node--mastered')).toBe(true);
    expect(nodeFor('Started').classList.contains('tech-tree__node--mastered')).toBe(false);
    expect(nodeFor('Started').classList.contains('tech-tree__node--started')).toBe(true);
  });

  it('marks a not-started technique --not-started regardless of graduatedCount', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Fresh', started: false, problemCount: 0, problems: [], graduatedCount: 0 }),
    ]);

    const node = fixture.nativeElement.querySelector('.tech-tree__node') as HTMLElement;
    expect(node.classList.contains('tech-tree__node--not-started')).toBe(true);
    expect(node.classList.contains('tech-tree__node--mastered')).toBe(false);
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

    const node = fixture.nativeElement.querySelector('.tech-tree__node') as HTMLElement;
    expect(node.classList.contains('tech-tree__node--mastered')).toBe(true);
  });

  it('clicking a node emits select exactly once with that technique', () => {
    const fixture = createFixture([makeTechnique({ name: 'A' })]);
    const emitted: Technique[] = [];
    fixture.componentInstance.select.subscribe((t) => emitted.push(t));

    // SVG <g> is an SVGElement, not an HTMLElement — jsdom doesn't give it a .click(), so
    // dispatch the event the (click) binding actually listens for.
    fixture.nativeElement
      .querySelector('.tech-tree__node')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

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
      fixture.nativeElement.querySelector(`.tech-tree__node[aria-label="${name}"]`) as HTMLElement;

    expect(nodeFor('B').classList.contains('tech-tree__node--selected')).toBe(true);
    expect(nodeFor('B').getAttribute('aria-pressed')).toBe('true');
    expect(nodeFor('A').classList.contains('tech-tree__node--selected')).toBe(false);
    expect(nodeFor('A').getAttribute('aria-pressed')).toBe('false');
  });

  it('highlights an edge touching the selected node', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'A' }), makeTechnique({ name: 'B', buildsOn: ['A'] })],
      null,
      'A',
    );

    expect(fixture.nativeElement.querySelector('.tech-tree__edge--highlighted')).toBeTruthy();
  });

  it('renders no edges and every node as a root when no technique carries buildsOn (older contract)', () => {
    const fixture = createFixture([makeTechnique({ name: 'A' }), makeTechnique({ name: 'B' })]);

    expect(fixture.nativeElement.querySelectorAll('.tech-tree__edge').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.tech-tree__node').length).toBe(2);
  });
});
