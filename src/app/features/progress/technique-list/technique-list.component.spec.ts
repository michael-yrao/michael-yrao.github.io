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

  it('shows "needs N more" when the technique still needs more done problems to be covered', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    const chip = fixture.nativeElement.querySelector('.chip--needs-more');
    expect(chip?.textContent).toContain('needs 2 more');
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
  });

  it('shows a "covered" chip once done problems reach the threshold', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 2, problemCount: 2, plannedTotal: 2, planned: [] }),
    ]);
    expect(fixture.nativeElement.querySelector('.chip--covered')?.textContent).toContain('covered');
    expect(fixture.nativeElement.querySelector('.chip--needs-more')).toBeFalsy();
  });

  it('shows a "not started" chip (and no needs-more/covered/no-plan chip) for a not-started technique that still has something planned (y > 0)', () => {
    const fixture = createFixture([
      makeTechnique({ started: false, problemCount: 0, problems: [], plannedTotal: 2, planned: [] }),
    ]);

    expect(fixture.nativeElement.querySelector('.chip--not-started')?.textContent).toContain('not started');
    expect(fixture.nativeElement.querySelector('.chip--needs-more')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--no-plan')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__bar')).toBeTruthy();
  });

  // The y = 0 case (nothing planned at all) is only reachable for a NOT-started technique — a
  // started one always has problemCount >= 1, so plannedTotalOf(t) can never be 0 there. This
  // replaces an earlier version of this spec that (incorrectly) exercised it via a
  // contradictory started: true + problemCount: 0 + plannedTotal: 0 fixture; see
  // statusChipLabel's doc comment in technique-list.component.ts.
  it('shows "nothing planned yet" (not "not started"), ratio 0/0, and no bar for a not-started technique with nothing planned (y = 0)', () => {
    const fixture = createFixture([
      makeTechnique({ started: false, problemCount: 0, problems: [], minProblems: 2, plannedTotal: 0, planned: [] }),
    ]);

    const chip = fixture.nativeElement.querySelector('.chip--no-plan');
    expect(chip?.textContent).toContain('nothing planned yet');
    expect(fixture.nativeElement.querySelector('.chip--not-started')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__bar')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__ratio')?.textContent).toContain('0/0');
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

describe('TechniqueListComponent — done/planned bar', () => {
  afterEach(() => localStorage.clear());

  function bar(fixture: ReturnType<typeof createFixture>): HTMLElement {
    return fixture.nativeElement.querySelector('.tech-row__bar') as HTMLElement;
  }

  it('renders the bar with progressbar semantics, fill width, and tick position', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);

    const b = bar(fixture);
    expect(b.getAttribute('role')).toBe('progressbar');
    expect(b.getAttribute('aria-valuemin')).toBe('0');
    expect(b.getAttribute('aria-valuenow')).toBe('1');
    expect(b.getAttribute('aria-valuemax')).toBe('3');
    expect(b.getAttribute('aria-label')).toBe('1 of 3 planned problems done · 2 more to be covered (3 needed)');

    const fill = b.querySelector('.tech-row__bar-fill') as HTMLElement;
    const tick = b.querySelector('.tech-row__bar-tick') as HTMLElement;
    expect(parseFloat(fill.style.width)).toBeCloseTo(33.33, 1);
    expect(tick.style.left).toBe('100%');
  });

  it('no bar caption element exists any more — the same finding now lives only in the hover (coverageTitle)', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 0, plannedTotal: 2, planned: [] }),
    ]);

    const tick = bar(fixture).querySelector('.tech-row__bar-tick') as HTMLElement;
    expect(tick.style.left).toBe('100%');
    expect(fixture.nativeElement.querySelector('.tech-row__bar-caption')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__bar-wrap')?.getAttribute('data-tip'))
      .toContain('only 2 planned');
    // The finding now lives only in the data-tip attribute, never in the row's own rendered
    // text content (an attribute isn't text content, but assert it directly rather than by
    // implication).
    expect(fixture.nativeElement.querySelector('.tech-row__toggle')?.textContent)
      .not.toContain('only 2 planned');
  });

  it('the hover carries no "only N planned" clause when plannedTotal fits the threshold (x <= y)', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    expect(fixture.nativeElement.querySelector('.tech-row__bar-caption')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tech-row__bar-wrap')?.getAttribute('data-tip'))
      .not.toContain('only');
  });

  it('renders no bar at all when nothing is planned (y = 0)', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 2, problemCount: 0, plannedTotal: 0, planned: [] }),
    ]);
    expect(bar(fixture)).toBeFalsy();
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

  it('states the legend as "ratio and bar = done of planned" plus the colour key, so the ratio and the bar read the same way', () => {
    const fixture = createFixture([makeTechnique()]);
    expect(fixture.nativeElement.querySelector('.tech-list__legend-text')?.textContent)
      .toBe('ratio and bar = done of planned · tick = enough to call it covered · green = covered, amber = not yet');
  });

  it('the info popover explains the ratio, the bar/tick, and the colours', () => {
    const fixture = createFixture([makeTechnique()]);
    const button = fixture.nativeElement.querySelector('.tech-list__info') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('What do the ratio, bar and tick mean?');
    const bubbleText = fixture.nativeElement.querySelector('.tech-list__info-bubble')?.textContent;
    expect(bubbleText).toContain('The ratio and the bar both read as done of everything planned');
    expect(bubbleText).toContain("green");
    expect(bubbleText).toContain("amber");
  });
});

describe('TechniqueListComponent — coverage colour (Change 2) and hover (Change 3)', () => {
  afterEach(() => localStorage.clear());

  function fill(fixture: ReturnType<typeof createFixture>): HTMLElement {
    return fixture.nativeElement.querySelector('.tech-row__bar-fill') as HTMLElement;
  }

  it('a covered technique gets the --covered fill class and the covered chip', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 2, problemCount: 2, plannedTotal: 2, planned: [] }),
    ]);
    expect(fill(fixture).classList.contains('tech-row__bar-fill--covered')).toBe(true);
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeTruthy();
  });

  it('an in-progress technique gets the --in-progress fill class and the needs-more chip', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    expect(fill(fixture).classList.contains('tech-row__bar-fill--in-progress')).toBe(true);
    expect(fixture.nativeElement.querySelector('.chip--needs-more')).toBeTruthy();
  });

  it('a not-begun technique (y > 0, z = 0) gets neither fill modifier class', () => {
    const fixture = createFixture([
      makeTechnique({
        started: false, problemCount: 0, problems: [], minProblems: 2, plannedTotal: 2, planned: [],
      }),
    ]);
    const f = fill(fixture);
    expect(f.classList.contains('tech-row__bar-fill--covered')).toBe(false);
    expect(f.classList.contains('tech-row__bar-fill--in-progress')).toBe(false);
  });

  it("the chip class and the fill class never disagree — both derive from the same coverageState", () => {
    const covered = createFixture([
      makeTechnique({ minProblems: 2, problemCount: 2, plannedTotal: 2, planned: [] }),
    ]);
    expect(!!covered.nativeElement.querySelector('.chip--covered')).toBe(
      fill(covered).classList.contains('tech-row__bar-fill--covered'),
    );

    const inProgress = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    expect(!!inProgress.nativeElement.querySelector('.chip--needs-more')).toBe(
      fill(inProgress).classList.contains('tech-row__bar-fill--in-progress'),
    );
  });

  it('the row carries exactly one data-tip, and no element inside the toggle button has a tabindex', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    const row = fixture.nativeElement.querySelector('.tech-row') as HTMLElement;
    expect(row.querySelectorAll('[data-tip]').length).toBe(1);

    const toggle = row.querySelector('.tech-row__toggle') as HTMLElement;
    expect(toggle.querySelectorAll('[tabindex]').length).toBe(0);
  });

  it('the bar-wrap carries the coverage hover as data-tip, matching coverageTitle', () => {
    const fixture = createFixture([
      makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] }),
    ]);
    expect(fixture.nativeElement.querySelector('.tech-row__bar-wrap')?.getAttribute('data-tip'))
      .toBe('1 of 3 planned problems done · 2 more to be covered (3 needed)');
  });
});

function clickViewButton(fixture: ReturnType<typeof createFixture>, label: 'List' | 'Map'): void {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('.tech-viewbar__btn'),
  ) as HTMLButtonElement[];
  const button = buttons.find((b) => b.textContent?.trim() === label);
  button!.click();
  fixture.detectChanges();
}

function clickMapNode(fixture: ReturnType<typeof createFixture>, name: string): void {
  const node = fixture.nativeElement.querySelector(
    `app-technique-map .tech-map__node[aria-label="${name}"]`,
  ) as Element;
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  fixture.detectChanges();
}

describe('TechniqueListComponent — Map view', () => {
  afterEach(() => localStorage.clear());

  it('renders a List/Map viewbar defaulting to List, with aria-pressed state', () => {
    const fixture = createFixture([makeTechnique()]);

    const buttons = fixture.nativeElement.querySelectorAll('.tech-viewbar__btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('List');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].textContent.trim()).toBe('Map');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('switching to Map shows exactly one app-technique-map and hides the list rows', () => {
    const fixture = createFixture([makeTechnique()]);

    clickViewButton(fixture, 'Map');

    expect(fixture.nativeElement.querySelectorAll('app-technique-map').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.tech-row__toggle')).toBeFalsy();
  });

  it('renders one map node per technique, across families, as a single graph (not per family)', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Two Pointers', family: 'Arrays' }),
      makeTechnique({ name: 'Sliding Window', family: 'Arrays', problems: [3] }),
      makeTechnique({ name: 'BFS', family: 'Graphs', problems: [200] }),
    ]);

    clickViewButton(fixture, 'Map');

    expect(fixture.nativeElement.querySelectorAll('.tech-map__node').length).toBe(3);
  });

  it('a technique whose graduatedCount reaches minProblems renders --mastered; one below does not', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'Mastered', minProblems: 2, graduatedCount: 2 }),
      makeTechnique({ name: 'Below', minProblems: 3, graduatedCount: 1 }),
    ]);

    clickViewButton(fixture, 'Map');

    const nodeFor = (name: string) =>
      fixture.nativeElement.querySelector(`.tech-map__node[aria-label="${name}"]`);
    expect(nodeFor('Mastered').classList.contains('tech-map__node--mastered')).toBe(true);
    expect(nodeFor('Below').classList.contains('tech-map__node--mastered')).toBe(false);
  });

  it("the Map detail heading's ratio matches the List view's done/planned ratio", () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Two Pointers', problemCount: 1, minProblems: 3, plannedTotal: 3, problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Map');
    clickMapNode(fixture, 'Two Pointers');

    expect(fixture.nativeElement.querySelector('.tech-map__detail-ratio')?.textContent).toContain('1/3');
  });

  it('a not-started technique renders --not-started', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);

    clickViewButton(fixture, 'Map');

    const node = fixture.nativeElement.querySelector('.tech-map__node');
    expect(node.classList.contains('tech-map__node--not-started')).toBe(true);
  });

  it('selecting a started node emits expand once and shows the detail heading', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'Two Pointers', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Map');

    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickMapNode(fixture, 'Two Pointers');

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Two Pointers');
    expect(fixture.nativeElement.querySelector('.tech-map__detail-title')?.textContent)
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
    clickViewButton(fixture, 'Map');

    clickMapNode(fixture, 'A');
    clickMapNode(fixture, 'B');
    expect(fixture.nativeElement.querySelector('.tech-map__detail-title')?.textContent)
      .toContain('B');

    // Selecting B again (the currently-selected node) must close the panel entirely — not
    // fall back to A, which was expanded earlier but is no longer the current selection.
    clickMapNode(fixture, 'B');
    expect(fixture.nativeElement.querySelector('.tech-map__detail-title')).toBeFalsy();
  });

  it('a selection that no longer exists in techniques() (e.g. a ?repo= switch) closes the panel without throwing', () => {
    const fixture = createFixture(
      [makeTechnique({ name: 'A', problems: [11] })],
      [makeProblem({ lcNumber: 11 })],
    );
    clickViewButton(fixture, 'Map');

    clickMapNode(fixture, 'A');
    expect(fixture.nativeElement.querySelector('.tech-map__detail-title')?.textContent)
      .toContain('A');

    expect(() => {
      fixture.componentRef.setInput('techniques', [makeTechnique({ name: 'B' })]);
      fixture.detectChanges();
    }).not.toThrow();

    expect(fixture.nativeElement.querySelector('.tech-map__detail-title')).toBeFalsy();
  });

  it('edges count equals the number of valid buildsOn pairs', () => {
    const fixture = createFixture([
      makeTechnique({ name: 'A' }),
      makeTechnique({ name: 'B', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', buildsOn: ['A', 'Ghost'] }),
    ]);

    clickViewButton(fixture, 'Map');

    expect(fixture.nativeElement.querySelectorAll('.tech-map__edge').length).toBe(2);
  });

  it('when details is not yet loaded, switching to Map primes with the first started technique exactly once', () => {
    const fixture = createFixture(
      [
        makeTechnique({ name: 'Two Pointers', started: false, problemCount: 0, problems: [] }),
        makeTechnique({ name: 'Sliding Window', started: true, problems: [3] }),
      ],
      null,
    );
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    clickViewButton(fixture, 'Map');
    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Sliding Window');

    // Switching away and back does not re-emit — the priming is a one-shot per component
    // lifetime, guarded by the `primed` flag.
    clickViewButton(fixture, 'List');
    clickViewButton(fixture, 'Map');
    expect(emitted.length).toBe(1);
  });

  it("a stored 'tree' (the retired skill tree) reads as Map", () => {
    localStorage.setItem('po.progress.techniqueView', 'tree');
    const fixture = createFixture([makeTechnique()]);

    expect(fixture.componentInstance.view()).toBe('map');
    expect(fixture.nativeElement.querySelector('app-technique-map')).toBeTruthy();
  });

  it("setView('map') persists across a fresh fixture", () => {
    const fixture = createFixture([makeTechnique()]);

    fixture.componentInstance.setView('map');
    fixture.detectChanges();

    const fresh = createFixture([makeTechnique()]);
    expect(fresh.componentInstance.view()).toBe('map');
    expect(fresh.nativeElement.querySelector('app-technique-map')).toBeTruthy();
  });
});
