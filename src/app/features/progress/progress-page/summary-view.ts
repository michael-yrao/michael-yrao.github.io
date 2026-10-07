// Owns the summary-derived view model the page binds: pipeline/difficulty bars, freshness labels, the on-schedule gauge, roadmap levels.
import { Signal, computed } from '@angular/core';

import { OnSchedule, ProblemProgress, ProgressSummary } from '../../../core/models/progress.model';
import { todayLocalISO } from '../../../core/utils/local-date';
import { SegmentedBarSegment } from '../segmented-bar/segmented-bar.component';
import { groupRoadmapLevels } from '../roadmap-coverage/roadmap-levels';
import {
  asOfLine,
  countOnSchedule,
  difficultySegments,
  generatedAtLabel,
  onSchedulePct,
  pipelineSegments,
} from './progress-derivations';

export class SummaryView {
  // Pipeline as ordered segments for the shared segmented bar — each a drill into the Problems
  // tab filtered to that comfort tier. The bar's own segments AND its legend row are click targets.
  readonly pipelineSegments = computed<SegmentedBarSegment[]>(() => {
    const d = this.data();
    return d ? pipelineSegments(d.pipeline) : [];
  });

  // Difficulty mix — folded into the Mastery tab's pipeline card, rendered by the same shared
  // segmented bar, still the third heavy drill (Easy/Medium/Hard -> filtered list).
  readonly difficultySegments = computed<SegmentedBarSegment[]>(() => {
    const diff = this.data()?.difficulty;
    return diff ? difficultySegments(diff) : [];
  });

  // Refresh button's title/aria-label — hoisted so the OnPush button doesn't re-read
  // `data()?.generatedAt` inline on every CD pass; they only recompute when `data()` changes.
  readonly refreshTitle = computed(() => `Data ${asOfLine(this.data()?.generatedAt)}`);
  readonly refreshAriaLabel = computed(() => `Refresh — data ${asOfLine(this.data()?.generatedAt)}`);

  // The always-visible counterpart to the Refresh button's hover-only freshness line.
  readonly generatedAtLabel = computed(() => generatedAtLabel(this.data()?.generatedAt));

  // The gauge's counts. The exported `onSchedule` is frozen at the exporter's session date
  // (cse-progress keeps a past-midnight session on its START date), so viewed the next
  // morning it can say "0 due today" while the inline attention list — filtered by the
  // browser's own date — shows five. Once details are loaded the gauge recounts from the
  // same rows the list uses, with the same `today`, so the two can never disagree; before
  // that, the exported snapshot stands in.
  readonly onScheduleView = computed<OnSchedule | null>(() => {
    const details = this.details();
    if (!details) return this.data()?.onSchedule ?? null;
    return countOnSchedule(details, todayLocalISO());
  });

  readonly onSchedulePct = computed(() => onSchedulePct(this.onScheduleView()));

  // Roadmap coverage: techniques counted per level (core / intermediate / advanced), each
  // with how many are started - see roadmap-levels.ts for the tier-to-level map.
  readonly roadmapLevels = computed(() => groupRoadmapLevels(this.data()?.techniques ?? []));

  constructor(
    private readonly data: Signal<ProgressSummary | null>,
    private readonly details: Signal<ProblemProgress[] | null>,
  ) {}
}
