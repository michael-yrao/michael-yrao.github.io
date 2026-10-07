import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProgressService } from '../../../core/services/progress.service';
import { fileUrl } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProblemProgress, ScheduleItem, Technique } from '../../../core/models/progress.model';
import { todayLocalISO } from '../../../core/utils/local-date';
import { walkthroughRouteFor } from '../solution-link-mode';
import { PRACTICE_GLYPH } from '../practice-link';
import { SolutionLinkModeService } from '../solution-link-mode.service';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { BadgeGridComponent } from '../badge-grid/badge-grid.component';
import { TechniqueFocus, TechniqueListComponent } from '../technique-list/technique-list.component';
import { StreakCalendarComponent } from '../streak-calendar/streak-calendar.component';
import { TodayBoardComponent } from '../today-board/today-board.component';
import { RecognitionPanelComponent } from '../recognition-panel/recognition-panel.component';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SegmentedBarComponent, SegmentedBarSegment } from '../segmented-bar/segmented-bar.component';
import { WorkloadChartComponent } from '../workload-chart/workload-chart.component';
import { GrowthAreasComponent } from '../growth-areas/growth-areas.component';
import { GrowthArea } from '../growth-areas/growth-areas.data';
import { RoadmapCoverageComponent } from '../roadmap-coverage/roadmap-coverage.component';
import {
  COMFORT_FILTERS,
  ComfortFilter,
  Difficulty,
  ListFacet,
  ProgressTab,
  TAB_LABEL,
  TAB_ORDER,
  comfortForPipelineKey,
  dueLabel,
  isDueToday,
  nextTabIndex,
} from './progress-derivations';
import { PracticeNumbers } from './practice-numbers';
import { ProblemExplorer } from './problem-explorer';
import { RepoPicker } from './repo-picker';
import { SummaryView } from './summary-view';

@Component({
  selector: 'app-progress-page',
  templateUrl: './progress-page.component.html',
  styleUrls: ['./progress-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    ProblemTimelineComponent,
    BadgeGridComponent,
    TechniqueListComponent,
    StreakCalendarComponent,
    TodayBoardComponent,
    RecognitionPanelComponent,
    SegmentedBarComponent,
    RoadmapCoverageComponent,
    WorkloadChartComponent,
    GrowthAreasComponent,
    SettingsMenuComponent,
  ],
})
export class ProgressPageComponent {
  readonly status = this.progress.status;
  readonly error = this.progress.error;
  readonly data = this.progress.data;
  readonly repoSlug = this.progress.repoSlug;
  readonly repoRef = this.progress.repoRef;
  readonly refreshing = this.progress.refreshing;
  readonly refreshError = this.progress.refreshError;

  // Opt-in detail: the full `problems[]` array, fetched only when the Problems tab is
  // entered for the first time (loadDetails() itself no-ops on a redundant call).
  readonly detailsStatus = this.progress.detailsStatus;
  readonly detailsError = this.progress.detailsError;
  readonly detailsRefreshing = this.progress.detailsRefreshing;
  readonly details = this.progress.details;

  // The Overview board's archived weeks — opt-in, fetched only once the board steps back
  // past the week the summary already carries (see WeekNavigation.prevWeek()).
  readonly history = this.progress.history;
  readonly historyStatus = this.progress.historyStatus;

  readonly tabs = TAB_ORDER;
  readonly tabLabel = TAB_LABEL;
  readonly activeTab = signal<ProgressTab>('overview');
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  // The ONE Solution Links mode, shared by every problem list on the page (Overview schedule,
  // Mastery's technique list, the Problems tab) — the header's ⚙ Settings panel that sets it
  // now lives in <app-settings-menu>; the page keeps injecting this only for its own
  // `walkthroughRoute()` below.
  private readonly linkModeService = inject(SolutionLinkModeService);

  // Overview's growth-area toggle (DSA / System Design / AI Engineering) — not persisted.
  readonly growthArea = signal<GrowthArea>('dsa');

  // Problems-tab drill state (facet filter, expanded rows, the gauge's inline "Needs attention"
  // list) lives in ProblemExplorer; the aliases keep the template's member names.
  private readonly explorer = new ProblemExplorer({
    details: this.details,
    loadDetails: () => this.progress.loadDetails(),
  });
  readonly listFilter = this.explorer.listFilter;
  readonly attentionOpen = this.explorer.attentionOpen;
  readonly visibleProblems = this.explorer.visibleProblems;
  readonly attentionProblems = this.explorer.attentionProblems;
  readonly comfortFilters = COMFORT_FILTERS;

  // Summary-derived bars, labels and the on-schedule gauge live in SummaryView; the aliases
  // keep the template's member names.
  private readonly summaryView = new SummaryView(this.data, this.details);
  readonly pipelineSegments = this.summaryView.pipelineSegments;
  readonly difficultySegments = this.summaryView.difficultySegments;
  readonly refreshTitle = this.summaryView.refreshTitle;
  readonly refreshAriaLabel = this.summaryView.refreshAriaLabel;
  readonly generatedAtLabel = this.summaryView.generatedAtLabel;
  readonly onScheduleView = this.summaryView.onScheduleView;
  readonly onSchedulePct = this.summaryView.onSchedulePct;
  readonly roadmapLevels = this.summaryView.roadmapLevels;

  /** The technique the roadmap card's last tile click named; `at` lets the same tile be clicked
   *  twice (the technique list re-focuses on every new value). */
  readonly focusedTechnique = signal<TechniqueFocus | null>(null);

  focusTechnique(name: string): void {
    this.focusedTechnique.set({ name, at: Date.now() });
  }

  private readonly repoParam;

  // Which rows get a Run link — PracticeNumbers also owns the practice-index load effect.
  protected readonly practiceGlyph = PRACTICE_GLYPH;
  readonly practiceNumbers = new PracticeNumbers(inject(PracticeService), this.repoRef).numbers;

  // Inline `?repo=` picker — state and submit rule live in RepoPicker; the aliases keep the
  // template's member names. `parseRepo('')` resolves to the default repo rather than `null`,
  // so the picker rejects blank itself and asks parseRepo only about non-blank entries.
  private readonly repoPicker = new RepoPicker({
    isValid: (raw) => this.progress.parseRepo(raw) !== null,
    navigate: (raw) =>
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { repo: raw },
        queryParamsHandling: 'merge',
      }),
  });
  readonly repoInputValue = this.repoPicker.inputValue;
  readonly repoInputInvalid = this.repoPicker.isInvalid;
  readonly isRepoPickerOpen = this.repoPicker.isOpen;

  constructor(
    private readonly progress: ProgressService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    // React to ?repo=owner/name (the service supplies the default when it is null). Seed the
    // initial value from the route SNAPSHOT so the first effect run already has the real param
    // — otherwise it would fire once with null (loading the default) and again with the param,
    // a double fetch whose responses can race.
    this.repoParam = toSignal(route.queryParamMap.pipe(map((p) => p.get('repo'))), {
      initialValue: route.snapshot.queryParamMap.get('repo'),
    });
    // (Re)load the lightweight summary whenever the repo param changes. The landing never
    // fetches the full problems[] file on its own — that is the Problems-tab opt-in.
    //
    // ⚠️ loadSummary() reads/writes `source`/`status` signals internally. If those reads
    // happened INSIDE this effect's reactive tracking, the effect would depend on them too —
    // and since loadSummary writes a brand-new `source` object on every call, that write
    // would always look like a change, re-triggering the effect in an infinite loop (and
    // spamming HTTP). `untracked` confines this effect's dependency to `repoParam()` alone;
    // everything loadSummary reads/writes is invisible to it.
    effect(() => {
      const repo = this.repoParam();
      untracked(() => {
        this.explorer.reset();
        this.progress.loadSummary(repo);
      });
    });
  }

  /** The status badge's GitHub fallback link: the learner's own solution file (progress.json's
   *  `file`) on GitHub, in the repo/branch this page is rendering — never the gold standard,
   *  since a `?repo=` viewer's paths belong to THEIR checkout. Null until the repo ref is known. */
  solutionUrl(file: string | null | undefined): string | null {
    const ref = this.repoRef();
    return file && ref ? fileUrl(ref, file) : null;
  }

  /** The status badge's walkthrough-route candidate — delegates to the shared
   *  walkthroughRouteFor() rule (solution-link-mode.ts) using the page-header setting's
   *  current mode. Shared by the Problems tab AND the "Needs attention" list, since both
   *  render through `#problemRowTpl`. */
  walkthroughRoute(p: ProblemProgress): string | null {
    return walkthroughRouteFor(this.linkModeService.mode(), p.lcNumber, this.solutionUrl(p.file));
  }

  /** The status badge's aria-label when it's the GitHub solution-file link (no walkthrough
   *  route, but the row carries a `file` and the repo ref is known). Round 7: the glyph no
   *  longer encodes comfort (always ○ — see the template), so neither does the label. */
  githubAriaLabel(p: ProblemProgress): string {
    return `Solution source for #${p.lcNumber} on GitHub`;
  }

  retry(): void {
    this.progress.loadSummary(this.repoParam());
  }

  refresh(): void {
    this.progress.refresh();
  }

  onRepoInputChange(value: string): void {
    this.repoPicker.onInputChange(value);
  }

  toggleRepoPicker(): void {
    this.repoPicker.toggle();
  }

  submitRepoPicker(): void {
    this.repoPicker.submit();
  }

  /** Selects a tab; entering Problems or Activity fires loadDetails() (idempotent — it
   *  no-ops if details are already loaded, per ProgressService). Activity needs the rows so
   *  the On-schedule gauge recounts against today instead of the exporter's stale snapshot. */
  selectTab(tab: ProgressTab): void {
    this.activeTab.set(tab);
    this.explorer.collapseAllRows();
    if (tab === 'problems' || tab === 'activity') this.progress.loadDetails();
  }

  isTabActive(tab: ProgressTab): boolean {
    return this.activeTab() === tab;
  }

  /** Roving tabindex keyboard nav for the tablist (ArrowLeft/Right wrap, Home/End jump). */
  onTabKeydown(event: KeyboardEvent, index: number): void {
    const next = nextTabIndex(event.key, index, TAB_ORDER.length);
    if (next === null) return;
    event.preventDefault();
    this.selectTab(TAB_ORDER[next]);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  exploreProblems(): void {
    this.progress.loadDetails();
  }

  /** A technique row expanded to its problems (Techniques tab, round 3) — same on-demand,
   *  idempotent loadDetails() as the Problems tab; TechniqueListComponent only emits this
   *  for a STARTED technique (a not-started one has nothing to join). */
  onTechniqueExpand(_t: Technique): void {
    this.progress.loadDetails();
  }

  /** A today-board row's trend panel opened (Overview tab) — same on-demand, idempotent
   *  loadDetails() as onTechniqueExpand/the Problems tab; the Overview stays summary-only
   *  until a row's title is actually clicked open. */
  onTrendExpand(_item: ScheduleItem): void {
    this.progress.loadDetails();
  }

  /** The Overview board's ◀ stepped back to a week it doesn't have yet — same on-demand,
   *  idempotent fetch pattern as onTrendExpand/loadDetails(), for schedule-history.json
   *  instead. */
  loadHistory(): void {
    this.progress.loadHistory();
  }

  setComfortFilter(f: ComfortFilter): void {
    this.explorer.setComfortFilter(f);
  }

  isComfortFilterActive(f: ComfortFilter): boolean {
    return this.explorer.isComfortFilterActive(f);
  }

  /** A headline-metric drill: a pipeline tier or a difficulty count. Sets the Explore list's
   *  facet, fetches details (once, cached), and switches to the Problems tab. */
  drill(facet: ListFacet): void {
    this.listFilter.set(facet);
    this.progress.loadDetails();
    this.selectTab('problems');
  }

  toggleAttention(): void {
    this.explorer.toggleAttention();
  }

  /** The inline attention list's Retry button (details load failed). */
  retryAttention(): void {
    this.progress.loadDetails();
  }

  isDueToday(p: ProblemProgress): boolean {
    return isDueToday(p, todayLocalISO());
  }

  dueLabel(p: ProblemProgress): string {
    return dueLabel(p, todayLocalISO());
  }

  /** Pipeline segment click: every tier except 🏆 Retired drills into the Problems tab.
   *  Retired rows are never in details().problems[] (retired rows leave the tracker
   *  entirely — see cse-progress's parse_retired()), so that segment is a no-op — no fetch,
   *  no facet, no tab switch (the Trophy Case it used to jump to was removed Sep 26, 2026). */
  pipelineSegmentClick(seg: SegmentedBarSegment): void {
    if (seg.key === 'retired') {
      return;
    }
    const comfort = comfortForPipelineKey(seg.key);
    if (!comfort) return; // defensive — every real pipeline segment key has a mapping
    this.drill({ kind: 'comfort', value: comfort });
  }

  /** Difficulty segment click — same drill the old chip row fired, now via the shared bar. */
  difficultySegmentClick(seg: SegmentedBarSegment): void {
    this.drill({ kind: 'difficulty', value: seg.key as Difficulty });
  }

  toggle(p: ProblemProgress): void {
    this.explorer.toggle(p);
  }

  isExpanded(p: ProblemProgress): boolean {
    return this.explorer.isExpanded(p);
  }
}
