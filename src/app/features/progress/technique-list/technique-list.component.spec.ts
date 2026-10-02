import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TechniqueListComponent } from './technique-list.component';
import { PlannedProblem, ProblemProgress, Technique } from '../../../core/models/progress.model';
import { RepoRef } from '../../../core/services/github-file.service';

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

function makePlanned(overrides: Partial<PlannedProblem> = {}): PlannedProblem {
  return {
    lcNumber: 9001,
    title: 'Single Source Shortest Path, Negative Weights',
    url: 'https://open.kattis.com/problems/shortestpath3',
    difficulty: 'Easy',
    trigger: 'surplus>=1',
    ...overrides,
  };
}

function createFixture(
  techniques: Technique[],
  details: ProblemProgress[] | null = null,
  repoRef: RepoRef | null = null,
) {
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
  fixture.componentRef.setInput('repoRef', repoRef);
  fixture.detectChanges();
  return fixture;
}

describe('TechniqueListComponent', () => {
  afterEach(() => localStorage.clear());

  it('shows the done/planned ratio as problemCount/plannedTotal', () => {
    const fixture = createFixture([
      makeTechnique({ problemCount: 1, minProblems: 3, plannedTotal: 3, planned: [] }),
    ]);

    const ratio = fixture.nativeElement.querySelector('.tech-row__ratio');
    expect(ratio?.textContent).toContain('1/3');
  });

  it('falls back to problemCount + planned.length when plannedTotal is absent', () => {
    const fixture = createFixture([
      makeTechnique({
        problemCount: 1,
        plannedTotal: undefined,
        planned: [makePlanned({ lcNumber: 9001 }), makePlanned({ lcNumber: 9002 })],
      }),
    ]);

    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.textContent).toContain('1/3');
  });

  it('falls back to problemCount alone when both plannedTotal and planned are absent (older contract)', () => {
    const fixture = createFixture([
      makeTechnique({ problemCount: 4, plannedTotal: undefined, planned: undefined }),
    ]);

    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.textContent).toContain('4/4');
  });

  it('shows a "not started" chip (and no needs-more/covered/no-plan chip) for a not-started technique that still has something planned (y > 0)', () => {
    const fixture = createFixture([
      makeTechnique({ started: false, problemCount: 0, problems: [], plannedTotal: 2, planned: [] }),
    ]);

    expect(fixture.nativeElement.querySelector('.chip--not-started')?.textContent).toContain('not started');
    expect(fixture.nativeElement.querySelector('.chip--needs-more')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--no-plan')).toBeFalsy();
  });

  // The y = 0 case (nothing planned at all) is only reachable for a NOT-started technique — a
  // started one always has problemCount >= 1, so plannedTotalOf(t) can never be 0 there. This
  // replaces an earlier version of this spec that (incorrectly) exercised it via a
  // contradictory started: true + problemCount: 0 + plannedTotal: 0 fixture.
  //
  // The ratio itself reads 0/2 (not 0/0): `ratioDenominatorOf` raises the denominator to the
  // technique's own threshold (minProblems) whenever nothing is planned, so the ratio never
  // implies less is expected of the technique than really is — the chip stays keyed on
  // `plannedTotalOf` alone, unaffected.
  it('shows "nothing planned yet" (not "not started") and ratio 0/threshold for a not-started technique with nothing planned (y = 0)', () => {
    const fixture = createFixture([
      makeTechnique({ started: false, problemCount: 0, problems: [], minProblems: 2, plannedTotal: 0, planned: [] }),
    ]);

    const chip = fixture.nativeElement.querySelector('.chip--no-plan');
    expect(chip?.textContent).toContain('nothing planned yet');
    expect(fixture.nativeElement.querySelector('.chip--not-started')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.textContent).toContain('0/2');
  });

  it('the ratio carries no native title (the coverage hover lives on the bar-wrap instead, so only one bubble ever shows)', () => {
    const fixture = createFixture([
      makeTechnique({ problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);

    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.getAttribute('title')).toBeNull();
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

  it('draws one problem link per row: Run when the number is in practiceNumbers, else the external link', () => {
    const fixture = createFixture(
      [makeTechnique({ problems: [11, 12] })],
      [makeProblem({ lcNumber: 11 }), makeProblem({ lcNumber: 12, title: 'Other', url: 'https://leetcode.com/problems/other/' })],
    );
    fixture.componentRef.setInput('practiceNumbers', new Set([11]));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.tech-row__problems li'));
    const [practiced, external] = rows;
    const run = practiced.querySelector('a[title="Run code"]');
    expect(run?.textContent?.trim()).toBe('Run');
    expect(run?.getAttribute('href')).toBe('/practice/11');
    expect(practiced.querySelector('a[title="LeetCode"]')).toBeFalsy();
    expect(external.querySelector('a[title="LeetCode"]')).toBeTruthy();
    expect(external.querySelector('a[title="Run code"]')).toBeFalsy();
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

  // #9999 is deliberately unregistered — same convention as today-board.component.spec.ts's
  // makeSchedule() — so vizRoute(9999) is null and the GitHub-fallback branch is exercised.
  it('renders a GitHub fallback link for a problem with no walkthrough route but a `file`, when a repo ref is set', () => {
    const ref: RepoRef = { owner: 'someone', repo: 'their-log', branch: 'dev' };
    const fixture = createFixture(
      [makeTechnique({ problems: [9999] })],
      [makeProblem({
        lcNumber: 9999,
        title: 'Unvisualized Problem',
        file: 'dsa/leetcode/backtracking/9999_unvisualized_problem.py',
      })],
      ref,
    );

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '.tech-row__problem-status--github',
    );
    expect(link).toBeTruthy();
    expect(link?.tagName).toBe('A');
    expect(link?.getAttribute('href')).toBe(
      'https://github.com/someone/their-log/blob/dev/dsa/leetcode/backtracking/9999_unvisualized_problem.py',
    );
    expect(link?.textContent?.trim()).toBe('○');
    expect(link?.getAttribute('title')).toBe('Solution on GitHub');
    expect(link?.getAttribute('aria-label')).toBe('Solution source for #9999 on GitHub');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('renders the spacer (no GitHub link) for the same problem when repoRef is null', () => {
    const fixture = createFixture(
      [makeTechnique({ problems: [9999] })],
      [makeProblem({
        lcNumber: 9999,
        title: 'Unvisualized Problem',
        file: 'dsa/leetcode/backtracking/9999_unvisualized_problem.py',
      })],
      null,
    );

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__problem-status--github')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__problem-status--spacer')).toBeTruthy();
  });

  it('still renders the `</>` walkthrough link (never the GitHub fallback) for a problem with a registered viz route, even with a `file` and a repo ref', () => {
    const ref: RepoRef = { owner: 'someone', repo: 'their-log', branch: 'dev' };
    const fixture = createFixture(
      [makeTechnique({ problems: [11] })],
      [makeProblem({ lcNumber: 11, file: 'dsa/leetcode/arrays/11_container_with_most_water.py' })],
      ref,
    );

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.tech-row__problem-status--link');
    expect(link?.textContent).toContain('</>');
    expect(fixture.nativeElement.querySelector('.tech-row__problem-status--github')).toBeFalsy();
  });
});

describe('TechniqueListComponent — planned problems', () => {
  afterEach(() => localStorage.clear());

  it('has no row-level "+N planned" chip (removed — the ratio itself says y), and both titles show once expanded', () => {
    const fixture = createFixture([
      makeTechnique({
        problemCount: 1,
        planned: [
          makePlanned({ lcNumber: 9001, title: 'Single Source Shortest Path, Negative Weights' }),
          makePlanned({ lcNumber: 9002, title: 'Currency Exchange' }),
        ],
      }),
    ]);

    expect(fixture.nativeElement.querySelector('.tech-row__toggle')?.textContent).not.toContain('planned');
    // No plannedTotal on the fixture -> fallback problemCount(1) + planned.length(2) = 3.
    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.textContent).toContain('1/3');

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detailText = fixture.nativeElement.querySelector('.tech-row__detail')?.textContent;
    expect(detailText).toContain('Single Source Shortest Path, Negative Weights');
    expect(detailText).toContain('Currency Exchange');
  });

  it('renders exactly as before when the technique carries no planned field (older contract)', () => {
    const fixture = createFixture([makeTechnique()]);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__planned')).toBeFalsy();
  });

  it('a not-started technique with a planned problem shows it on expand, and loads no details', () => {
    const fixture = createFixture([
      makeTechnique({
        started: false,
        problemCount: 0,
        problems: [],
        planned: [makePlanned({ lcNumber: 753, title: 'Cracking the Safe' })],
      }),
    ]);
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.tech-row__detail');
    expect(detail?.textContent).toContain('Not started yet.');
    expect(detail?.textContent).toContain('Cracking the Safe');
    expect(emitted.length).toBe(0);
  });

  it('a planned problem with a null title renders its number without throwing', () => {
    expect(() => {
      const fixture = createFixture([
        makeTechnique({ planned: [makePlanned({ lcNumber: 981, title: null, url: null, difficulty: null })] }),
      ]);
      (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent).toContain('#981');
    }).not.toThrow();
  });

  it('a planned row with a null trigger (declared but not queued) renders identically to one with a trigger — the trigger is never displayed', () => {
    // Each fixture's DOM is captured as a plain string before the next createFixture() call —
    // TestBed.resetTestingModule() (inside createFixture) destroys earlier fixtures, so their
    // nativeElement can't be queried again afterward (same constraint the Map-view "persists
    // across a fresh fixture" spec above already works around).
    const withTrigger = createFixture([
      makeTechnique({ planned: [makePlanned({ lcNumber: 700, title: 'Has A Trigger', trigger: 'surplus>=1' })] }),
    ]);
    (withTrigger.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    withTrigger.detectChanges();
    const withTriggerRow = withTrigger.nativeElement.querySelector('.tech-row__problem--planned')?.textContent;

    const withoutTrigger = createFixture([
      makeTechnique({ planned: [makePlanned({ lcNumber: 700, title: 'Has A Trigger', trigger: null })] }),
    ]);
    (withoutTrigger.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    withoutTrigger.detectChanges();
    const withoutTriggerRow = withoutTrigger.nativeElement.querySelector('.tech-row__problem--planned')?.textContent;

    expect(withTriggerRow).toBe(withoutTriggerRow);
    expect(withoutTriggerRow).not.toContain('surplus');
  });

  it('judgeLabel maps known judge hosts, strips a leading www., and falls back safely', () => {
    const fixture = createFixture([makeTechnique()]);
    const { componentInstance: c } = fixture;

    expect(c.judgeLabel('https://leetcode.com/problems/x/')).toBe('LC');
    expect(c.judgeLabel('https://neetcode.io/problems/x')).toBe('NC');
    expect(c.judgeLabel('https://open.kattis.com/problems/shortestpath3')).toBe('Kattis');
    expect(c.judgeLabel('https://cses.fi/problemset/task/1673')).toBe('CSES');
    expect(c.judgeLabel('https://www.hellointerview.com/learn/code/intervals/can-attend-meetings')).toBe('HelloInterview');
    expect(c.judgeLabel('https://www.leetcode.com/problems/x/')).toBe('LC');
    expect(c.judgeLabel('https://www.codeforces.com/problemset/x')).toBe('codeforces.com');
    expect(c.judgeLabel(null)).toBe('');
    expect(c.judgeLabel('not a url')).toBe('');
  });

  it('a non-LeetCode planned problem shows the judge label instead of #<number>', () => {
    const fixture = createFixture([
      makeTechnique({
        planned: [makePlanned({ lcNumber: 9001, url: 'https://open.kattis.com/problems/shortestpath3' })],
      }),
    ]);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.tech-row__problem--planned');
    expect(row?.textContent).toContain('Kattis');
    expect(row?.textContent).not.toContain('#9001');
  });
});

describe('TechniqueListComponent — coverage boxes', () => {
  afterEach(() => localStorage.clear());

  it('renders each box\'s fill (clean/shaky) independently of its white counted-toward-covered border', () => {
    const fixture = createFixture([
      makeTechnique({
        name: 'Greedy', minProblems: 8, problemCount: 6, plannedTotal: 8, planned: [], uncleanCount: 4,
      }),
    ]);

    const row = fixture.nativeElement.querySelector('.tech-row') as HTMLElement;
    const boxes = row.querySelector('.tech-row__boxes') as HTMLElement;
    expect(boxes.querySelectorAll('.tech-row__box--clean').length).toBe(2);
    expect(boxes.querySelectorAll('.tech-row__box--shaky').length).toBe(4);
    expect(boxes.querySelectorAll('.tech-row__box--counted').length).toBe(8);
  });

  it('shows a single named untried variation', () => {
    const fixture = createFixture([makeTechnique({ untriedVariations: ['iterative'], hasVariantGap: true })]);
    expect(fixture.nativeElement.querySelector('.chip--variation')?.textContent).toContain('1 variation not tried');
  });

  it('shows the count for several named untried variations', () => {
    const fixture = createFixture([
      makeTechnique({ untriedVariations: ['iterative', 'recursive'], hasVariantGap: true }),
    ]);
    expect(fixture.nativeElement.querySelector('.chip--variation')?.textContent)
      .toContain('2 variations not tried');
  });

  it('falls back to the generic "a variation not tried" chip (no count, no names) when hasVariantGap is true but untriedVariations is absent (older contract)', () => {
    const fixture = createFixture([
      makeTechnique({ hasVariantGap: true, untriedVariations: undefined }),
    ]);
    expect(fixture.nativeElement.querySelector('.chip--variation')?.textContent)
      .toContain('a variation not tried');
  });

  it('shows no variation chip when hasVariantGap is false and untriedVariations is absent', () => {
    const fixture = createFixture([makeTechnique({ hasVariantGap: false, untriedVariations: undefined })]);
    expect(fixture.nativeElement.querySelector('.chip--variation')).toBeFalsy();
  });

  it('the expanded detail no longer states the "Covered at" sentence, but still names untried variations', () => {
    const fixture = createFixture([
      makeTechnique({
        minProblems: 3,
        problemCount: 1,
        plannedTotal: 3,
        planned: [],
        untriedVariations: ['iterative'],
      }),
    ]);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detailText = fixture.nativeElement.querySelector('.tech-row__detail')?.textContent;
    expect(detailText).not.toContain('Covered at');
    expect(fixture.nativeElement.querySelector('.tech-row__summary')).toBeFalsy();
    expect(detailText).toContain('Not tried yet: iterative');
  });

});

function clickViewButton(fixture: ReturnType<typeof createFixture>, label: 'List' | 'Board'): void {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('.tech-viewbar__btn'),
  ) as HTMLButtonElement[];
  const button = buttons.find((b) => b.textContent?.trim() === label);
  button!.click();
  fixture.detectChanges();
}

function clickBoardCard(fixture: ReturnType<typeof createFixture>, name: string): void {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('.tech-board__card'),
  ) as HTMLButtonElement[];
  const card = buttons.find((b) => b.textContent?.includes(name));
  card!.click();
  fixture.detectChanges();
}

describe('TechniqueListComponent — Board view', () => {
  afterEach(() => localStorage.clear());

  it('clicking a card opens the detail panel below the board and emits expand', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Two Pointers', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Board');

    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickBoardCard(fixture, 'Two Pointers');

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-board__detail-title')?.textContent)
      .toContain('Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-row__problem')?.textContent)
      .toContain('Container With Most Water');
  });

  it('the horizon toggle is off by default (tier2/tier3 hidden) and showing it reveals those cards', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Core Technique', tier: 'core' }),
      makeTechnique({ name: 'Horizon Technique', tier: 'tier2', problemCount: 0, problems: [], started: false }),
    ]);
    clickViewButton(fixture, 'Board');

    const cardNames = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.tech-board__card-name') as NodeListOf<HTMLElement>)
        .map((el) => el.textContent?.trim());

    expect(cardNames()).toEqual(['Core Technique']);

    const toggle = Array.from(
      fixture.nativeElement.querySelectorAll('.tech-board__controls .tech-viewbar__btn'),
    ).find((b) => (b as HTMLElement).textContent?.includes('Show advanced')) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(cardNames().sort()).toEqual(['Core Technique', 'Horizon Technique']);
  });

  it('when details is not yet loaded, switching to Board primes with the first started technique exactly once', () => {
    const fixture = createFixture(
      [
        makeTechnique({ name: 'Two Pointers', started: false, problemCount: 0, problems: [] }),
        makeTechnique({ name: 'Sliding Window', started: true, problems: [3] }),
      ],
      null,
    );
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickViewButton(fixture, 'Board');
    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Sliding Window');

    // Switching away and back does not re-emit — the priming is a one-shot per component
    // lifetime, guarded by the `primed` flag.
    clickViewButton(fixture, 'List');
    clickViewButton(fixture, 'Board');
    expect(emitted.length).toBe(1);
  });

  type BoardFixture = ReturnType<typeof createFixture>;
  const clearsSelectionCases: [string, (fixture: BoardFixture) => void][] = [
    [
      'changing Family',
      (fixture) => {
        const familySelect = fixture.nativeElement.querySelectorAll('.tech-board__select')[1] as HTMLSelectElement;
        familySelect.value = 'Arrays';
        familySelect.dispatchEvent(new Event('change'));
        fixture.detectChanges();
      },
    ],
    [
      'toggling the horizon',
      (fixture) => {
        const toggle = Array.from(
          fixture.nativeElement.querySelectorAll('.tech-board__controls .tech-viewbar__btn'),
        ).find((b) => (b as HTMLElement).textContent?.includes('Show advanced')) as HTMLButtonElement;
        toggle.click();
        fixture.detectChanges();
      },
    ],
    [
      'switching to List and back to Board',
      (fixture) => {
        clickViewButton(fixture, 'List');
        clickViewButton(fixture, 'Board');
      },
    ],
  ];

  it.each(clearsSelectionCases)('%s clears a selected board card\'s detail panel', (_label, act) => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Two Pointers', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Board');
    clickBoardCard(fixture, 'Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-board__detail')).toBeTruthy();

    act(fixture);

    expect(fixture.nativeElement.querySelector('.tech-board__detail')).toBeFalsy();
  });

  it('turning off the horizon resets a Family filter that only existed among tier2/tier3 techniques, and the board shows techniques again', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Core Technique', family: 'Core Family', tier: 'core' }),
      makeTechnique({
        name: 'Horizon Technique', family: 'Horizon Family', tier: 'tier2',
        problemCount: 0, problems: [], started: false,
      }),
    ]);
    clickViewButton(fixture, 'Board');

    const horizonToggle = Array.from(
      fixture.nativeElement.querySelectorAll('.tech-board__controls .tech-viewbar__btn'),
    ).find((b) => (b as HTMLElement).textContent?.includes('Show advanced')) as HTMLButtonElement;
    horizonToggle.click();
    fixture.detectChanges();

    const familySelect = fixture.nativeElement.querySelectorAll('.tech-board__select')[1] as HTMLSelectElement;
    familySelect.value = 'Horizon Family';
    familySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const cardNames = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.tech-board__card-name') as NodeListOf<HTMLElement>)
        .map((el) => el.textContent?.trim());
    expect(cardNames()).toEqual(['Horizon Technique']);

    horizonToggle.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.boardFamily()).toBeNull();
    expect(cardNames()).toEqual(['Core Technique']);
  });
});
