import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TechniqueListComponent } from './technique-list.component';
import { ProblemProgress, Technique } from '../../../core/models/progress.model';

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

function makeProblem(overrides: Partial<ProblemProgress> = {}): ProblemProgress {
  return {
    lcNumber: 11,
    title: 'Container With Most Water',
    url: 'https://leetcode.com/problems/container-with-most-water/',
    difficulty: 'Medium',
    comfort: '🟡',
    level: 2,
    streak: 1,
    repDates: [],
    timeline: [],
    ...overrides,
  };
}

function createFixture(techniques: Technique[], details: ProblemProgress[] | null = null) {
  // Safe to call even before any module has been configured — lets a test create a second,
  // independent fixture (e.g. to check persistence across a fresh component instance).
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TechniqueListComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TechniqueListComponent);
  fixture.componentRef.setInput('techniques', techniques);
  fixture.componentRef.setInput('details', details);
  fixture.detectChanges();
  return fixture;
}

describe('TechniqueListComponent', () => {
  afterEach(() => localStorage.clear());

  it('shows the count/target ratio as problemCount/minProblems', () => {
    const fixture = createFixture([makeTechnique({ problemCount: 1, minProblems: 3 })]);

    const ratio = fixture.nativeElement.querySelector('.tech-row__ratio');
    expect(ratio?.textContent).toContain('1/3');
  });

  it('shows a "thin" chip when thin is true', () => {
    const fixture = createFixture([makeTechnique({ thin: true })]);
    expect(fixture.nativeElement.querySelector('.chip--thin')?.textContent).toContain('thin');
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
  });

  it('shows a "covered" chip when thin is false', () => {
    const fixture = createFixture([makeTechnique({ thin: false })]);
    expect(fixture.nativeElement.querySelector('.chip--covered')?.textContent).toContain('covered');
    expect(fixture.nativeElement.querySelector('.chip--thin')).toBeFalsy();
  });

  it('shows a "not started" chip (and no thin/covered chip) for a not-started technique', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);

    expect(fixture.nativeElement.querySelector('.chip--not-started')?.textContent).toContain('not started');
    expect(fixture.nativeElement.querySelector('.chip--thin')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
  });

  it('is collapsed by default: clicking the row toggles aria-expanded and reveals the detail panel', () => {
    const fixture = createFixture([makeTechnique()], [makeProblem()]);

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.tech-row__detail')).toBeFalsy();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.tech-row__detail')).toBeTruthy();
  });

  it('shows "Not started yet." for a not-started technique on expand, and never emits expand', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent).toContain('Not started yet.');
    expect(emitted.length).toBe(0);
  });

  it('emits expand exactly once when a started technique is expanded for the first time', () => {
    const fixture = createFixture([makeTechnique()], null);
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Two Pointers');

    // Collapsing and re-expanding does not re-emit (the parent's loadDetails() is idempotent
    // anyway, but the component itself only emits on the transition into "expanded").
    toggle.click();
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(2);
  });

  it('shows "Loading problems…" when details is null (not yet fetched)', () => {
    const fixture = createFixture([makeTechnique()], null);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent).toContain('Loading problems…');
  });

  it('shows "No matching problems found." when details is loaded but nothing joins', () => {
    const fixture = createFixture([makeTechnique({ problems: [999] })], [makeProblem({ lcNumber: 11 })]);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent)
      .toContain('No matching problems found.');
  });

  it('joins technique.problems against details[] to render title/comfort/difficulty', () => {
    const fixture = createFixture(
      [makeTechnique({ problems: [11] })],
      [makeProblem({ lcNumber: 11, title: 'Container With Most Water', difficulty: 'Medium', comfort: '🟡' })],
    );

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.tech-row__problem');
    expect(row?.textContent).toContain('Container With Most Water');
    expect(row?.textContent).toContain('#11');
    expect(row?.textContent).toContain('🟡');
    expect(fixture.nativeElement.querySelector('.tag--medium')?.textContent).toContain('Medium');

    // #11 (Container With Most Water) has a visualizer route, so the leading slot is the
    // `</>` link — and it's the row's first element child, leading the row.
    expect(row?.firstElementChild?.classList.contains('tech-row__problem-status')).toBe(true);
    expect(row?.firstElementChild?.classList.contains('tech-row__problem-status--link')).toBe(true);

    const link: HTMLAnchorElement | null = row?.querySelector('.tech-row__problem-links a') ?? null;
    expect(link?.textContent?.trim()).toBe('↗');
    expect(link?.getAttribute('aria-label')).toBe('Open on LeetCode');
  });
});

function clickViewButton(fixture: ReturnType<typeof createFixture>, label: 'List' | 'Tree'): void {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('.tech-viewbar__btn'),
  ) as HTMLButtonElement[];
  const button = buttons.find((b) => b.textContent?.trim() === label);
  button!.click();
  fixture.detectChanges();
}

function clickTreeNode(fixture: ReturnType<typeof createFixture>, name: string): void {
  const node = fixture.nativeElement.querySelector(
    `app-technique-tree .tech-tree__node[aria-label="${name}"]`,
  ) as Element;
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  fixture.detectChanges();
}

describe('TechniqueListComponent — Tree view', () => {
  afterEach(() => localStorage.clear());

  it('renders a List/Tree viewbar defaulting to List, with aria-pressed state', () => {
    const fixture = createFixture([makeTechnique()]);

    const buttons = fixture.nativeElement.querySelectorAll('.tech-viewbar__btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('List');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].textContent.trim()).toBe('Tree');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('switching to Tree shows exactly one app-technique-tree and hides the list rows', () => {
    const fixture = createFixture([makeTechnique()]);

    clickViewButton(fixture, 'Tree');

    expect(fixture.nativeElement.querySelectorAll('app-technique-tree').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.tech-row__toggle')).toBeFalsy();
  });

  it('renders one tree node per technique, across families, as a single graph (not per family)', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Two Pointers', family: 'Arrays' }),
      makeTechnique({ name: 'Sliding Window', family: 'Arrays', problems: [3] }),
      makeTechnique({ name: 'BFS', family: 'Graphs', problems: [200] }),
    ]);

    clickViewButton(fixture, 'Tree');

    expect(fixture.nativeElement.querySelectorAll('.tech-tree__node').length).toBe(3);
  });

  it('a technique whose graduatedCount reaches minProblems renders --mastered; one below does not', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Mastered', minProblems: 2, graduatedCount: 2 }),
      makeTechnique({ name: 'Below', minProblems: 3, graduatedCount: 1 }),
    ]);

    clickViewButton(fixture, 'Tree');

    const nodeFor = (name: string) =>
      fixture.nativeElement.querySelector(`.tech-tree__node[aria-label="${name}"]`);
    expect(nodeFor('Mastered').classList.contains('tech-tree__node--mastered')).toBe(true);
    expect(nodeFor('Below').classList.contains('tech-tree__node--mastered')).toBe(false);
  });

  it('a not-started technique renders --not-started', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);

    clickViewButton(fixture, 'Tree');

    const node = fixture.nativeElement.querySelector('.tech-tree__node');
    expect(node.classList.contains('tech-tree__node--not-started')).toBe(true);
  });

  it('selecting a started node emits expand once and shows the detail heading', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Two Pointers', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Tree');

    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickTreeNode(fixture, 'Two Pointers');

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-tree__detail-title')?.textContent)
      .toContain('Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-row__problem')?.textContent)
      .toContain('Container With Most Water');
  });

  it('selecting the already-selected node deselects it (no detail panel), rather than falling back to an earlier selection', () => {
    const fixture = createFixture(
      [
        makeTechnique({ name: 'A', problems: [11] }),
        makeTechnique({ name: 'B', problems: [22] }),
      ],
      [makeProblem({ lcNumber: 11 }), makeProblem({ lcNumber: 22, title: 'Other' })],
    );
    clickViewButton(fixture, 'Tree');

    clickTreeNode(fixture, 'A');
    clickTreeNode(fixture, 'B');
    expect(fixture.nativeElement.querySelector('.tech-tree__detail-title')?.textContent)
      .toContain('B');

    // Selecting B again (the currently-selected node) must close the panel entirely — not
    // fall back to A, which was expanded earlier but is no longer the current selection.
    clickTreeNode(fixture, 'B');
    expect(fixture.nativeElement.querySelector('.tech-tree__detail-title')).toBeFalsy();
  });

  it('a selection that no longer exists in techniques() (e.g. a ?repo= switch) closes the panel without throwing', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'A', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Tree');

    clickTreeNode(fixture, 'A');
    expect(fixture.nativeElement.querySelector('.tech-tree__detail-title')?.textContent)
      .toContain('A');

    expect(() => {
      fixture.componentRef.setInput('techniques', [makeTechnique({ name: 'B' })]);
      fixture.detectChanges();
    }).not.toThrow();

    expect(fixture.nativeElement.querySelector('.tech-tree__detail-title')).toBeFalsy();
  });

  it('edges count equals the number of valid buildsOn pairs', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A' }),
      makeTechnique({ name: 'B', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', buildsOn: ['A', 'Ghost'] }),
    ]);

    clickViewButton(fixture, 'Tree');

    expect(fixture.nativeElement.querySelectorAll('.tech-tree__edge').length).toBe(2);
  });

  it('when details is not yet loaded, switching to Tree primes with the first started technique exactly once', () => {
    const fixture = createFixture(
      [
        makeTechnique({ name: 'Two Pointers', started: false, problemCount: 0, problems: [] }),
        makeTechnique({ name: 'Sliding Window', started: true, problems: [3] }),
      ],
      null,
    );
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickViewButton(fixture, 'Tree');
    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Sliding Window');

    // Switching away and back does not re-emit — the priming is a one-shot per component
    // lifetime, guarded by the `primed` flag.
    clickViewButton(fixture, 'List');
    clickViewButton(fixture, 'Tree');
    expect(emitted.length).toBe(1);
  });

  it("a stored 'map' (the retired view) reads as List", () => {
    localStorage.setItem('po.progress.techniqueView', 'map');
    const fixture = createFixture([makeTechnique()]);

    expect(fixture.componentInstance.view()).toBe('list');
    expect(fixture.nativeElement.querySelector('.tech-row__toggle')).toBeTruthy();
  });

  it("setView('tree') persists across a fresh fixture", () => {
    const fixture = createFixture([makeTechnique()]);

    fixture.componentInstance.setView('tree');
    fixture.detectChanges();

    const fresh = createFixture([makeTechnique()]);
    expect(fresh.componentInstance.view()).toBe('tree');
    expect(fresh.nativeElement.querySelector('app-technique-tree')).toBeTruthy();
  });
});
