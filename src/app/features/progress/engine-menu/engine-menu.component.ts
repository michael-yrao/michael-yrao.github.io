import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom, from, of, switchMap } from 'rxjs';

import { isBuildDay } from '../../../core/engine/build-day';
import { BuildResult, ENGINE_DELAY, EngineService } from '../../../core/engine/engine.service';
import { EngineStatus, NO_ENGINE_RUN } from '../../../core/engine/engine-status';
import { EngineUpdate, EngineVersions, isNewerVersion } from '../../../core/engine/engine-update';
import { RepoRef } from '../../../core/services/github-file.service';
import { ProgressService } from '../../../core/services/progress.service';
import { shortMonthDay, todayLocalISO } from '../../../core/utils/local-date';
import { MenuComponent, MenuDotState } from '../../../shared/components/menu/menu.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

export const ENGINE_POLL_MS = 10_000;
export const ENGINE_POLL_MAX = 60;

const BUILD_DAY_META = 'today';
const OFF_BUILD_DAY_META = 'closes this week';
const MISSING_WEEK_META = 'missing';
const BUILD_LABEL = 'Build next week…';
const MISSING_WEEK_BUILD_LABEL = 'Build this week…';
const CONFIRM_HEADING = 'Build next week now?';
const MISSING_WEEK_CONFIRM_HEADING = 'Build this week now?';
const DRAFT_LINE = 'Lands as a draft for you to approve';
const CONFIRM_LINES: readonly string[] = [
  'Archives this week',
  'Re-seats what is left into next week',
  'Runs in your repo as a commit',
  DRAFT_LINE,
];
const MISSING_WEEK_CONFIRM_LINES: readonly string[] = [
  'Archives last week',
  'Re-seats what is left into this week',
  'Runs in your repo as a commit',
  DRAFT_LINE,
];
const REBUILD_LABEL = 'Rebuild draft…';
const REBUILD_CONFIRM_HEADING = 'Rebuild the draft now?';
const REBUILD_CONFIRM_LINES: readonly string[] = [
  'Discards the draft week',
  'Re-seats from your tracker',
  'Runs in your repo as a commit',
  DRAFT_LINE,
];
const NO_CONFIG_ROW = '✗ no cse.config.yml';
const RUN_ROWS: Readonly<Record<'running' | 'ok' | 'failed', string>> = {
  running: '⟳ running',
  ok: '✓ last run ok',
  failed: '✗ last run failed',
};
/** Build results that leave the menu open so the row they cause is seen. */
const REFUSALS: ReadonlySet<BuildResult> = new Set<BuildResult>(['no-config', 'refused']);

interface StatusRow {
  readonly text: string;
  /** The run on GitHub; absent for a refusal, which is never painted with the last run's link. */
  readonly url: string | null;
}

interface ResultSegment {
  readonly text: string;
  /** Present on the "kept" segment: the skipped paths its details body lists. */
  readonly paths?: readonly string[];
}

/** The engine's menu: build next week, update the engine, and the last run's status as a dot and a row. */
@Component({
  selector: 'app-engine-menu',
  templateUrl: './engine-menu.component.html',
  styleUrl: './engine-menu.component.scss',
  imports: [MenuComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineMenuComponent {
  readonly repoRef = input<RepoRef | null>(null);
  /** True when the current week has no schedule: Build then builds this week, not next. */
  readonly isWeekMissing = input(false);
  /** The Monday of the untouched draft week that may be rebuilt; null hides the Rebuild item. */
  readonly rebuildWeekOf = input<string | null>(null);

  private readonly engine = inject(EngineService);
  private readonly progress = inject(ProgressService);
  private readonly delay = inject(ENGINE_DELAY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menu = viewChild.required(MenuComponent);
  private isDestroyed = false;

  protected readonly status = signal<EngineStatus>(NO_ENGINE_RUN);
  protected readonly step = signal<string | null>(null);
  protected readonly isBuilding = signal(false);
  protected readonly isRefused = signal(false);
  protected readonly lastBuild = signal<BuildResult | null>(null);
  protected readonly isConfirming = signal(false);
  /** True while the open confirm is the draft rebuild, not the ordinary build. */
  protected readonly isRebuildConfirm = signal(false);

  protected readonly versions = signal<EngineVersions | null>(null);
  protected readonly result = signal<EngineUpdate | null>(null);
  protected readonly isUpdating = signal(false);
  protected readonly isUpdateAvailable = computed(() => {
    const versions = this.versions();
    if (versions === null || versions.repo === null || versions.template === null) return false;
    return isNewerVersion(versions.template, versions.repo);
  });

  protected readonly dotState = computed<MenuDotState>(() => {
    if (this.lastBuild() === 'no-config') return 'failed';
    if (this.isBuilding() || this.status().state === 'running') return 'running';
    return this.status().state === 'failed' ? 'failed' : 'none';
  });
  protected readonly buildMeta = computed(() => {
    if (this.isWeekMissing()) return MISSING_WEEK_META;
    return isBuildDay(todayLocalISO()) ? BUILD_DAY_META : OFF_BUILD_DAY_META;
  });
  protected readonly buildLabel = computed(() => (this.isWeekMissing() ? MISSING_WEEK_BUILD_LABEL : BUILD_LABEL));
  protected readonly rebuildMeta = computed(() => shortMonthDay(this.rebuildWeekOf() ?? ''));
  protected readonly confirmHeading = computed(() => {
    if (this.isRebuildConfirm()) return REBUILD_CONFIRM_HEADING;
    return this.isWeekMissing() ? MISSING_WEEK_CONFIRM_HEADING : CONFIRM_HEADING;
  });
  protected readonly confirmLines = computed(() => {
    if (this.isRebuildConfirm()) return REBUILD_CONFIRM_LINES;
    return this.isWeekMissing() ? MISSING_WEEK_CONFIRM_LINES : CONFIRM_LINES;
  });
  protected readonly updateMeta = computed(() => {
    const versions = this.versions();
    if (versions === null || versions.repo === null) return '';
    return this.isUpdateAvailable() ? `v${versions.repo} → v${versions.template}` : `v${versions.repo}`;
  });
  protected readonly statusRow = computed<StatusRow | null>(() => this.buildStatusRow());
  protected readonly resultSegments = computed(() => this.buildResultSegments());

  constructor() {
    this.destroyRef.onDestroy(() => (this.isDestroyed = true));
    toObservable(this.repoRef)
      .pipe(
        switchMap((ref) => (ref === null ? of(null) : from(this.engine.versions(ref)))),
        takeUntilDestroyed(),
      )
      .subscribe((versions) => {
        this.versions.set(versions);
        this.result.set(null);
      });
    toObservable(this.repoRef)
      .pipe(
        switchMap((ref) => (ref === null ? of(NO_ENGINE_RUN) : this.engine.status$(ref))),
        takeUntilDestroyed(),
      )
      .subscribe((status) => this.status.set(status));
  }

  protected readonly rebuildLabel = REBUILD_LABEL;

  protected openConfirm(isRebuild: boolean): void {
    this.isRebuildConfirm.set(isRebuild);
    this.isConfirming.set(true);
  }

  protected confirmBuild(): void {
    this.isConfirming.set(false);
    const rebuildWeek = this.isRebuildConfirm() ? this.rebuildWeekOf() : null;
    void this.build(rebuildWeek ?? undefined);
  }

  protected async build(rebuildWeek?: string): Promise<void> {
    const ref = this.repoRef();
    if (ref === null || this.isBuilding()) return;
    this.isBuilding.set(true);
    this.isRefused.set(false);
    this.lastBuild.set(null);
    this.step.set(null);
    const previousRunId = this.status().runId;
    const result = await this.engine.buildNextWeek(ref, rebuildWeek);
    this.lastBuild.set(result);
    if (result === 'refused') this.isRefused.set(true);
    if (REFUSALS.has(result)) this.menu().open();
    if (result === 'dispatched') {
      this.status.set({ state: 'running', runId: previousRunId, htmlUrl: null });
      await this.awaitNewRun(ref, previousRunId);
    }
    this.isBuilding.set(false);
  }

  private buildStatusRow(): StatusRow | null {
    const last = this.lastBuild();
    if (last === 'no-config') return { text: NO_CONFIG_ROW, url: null };
    const { state, htmlUrl } = this.status();
    if (this.isBuilding() || state === 'running') {
      const step = this.step();
      return { text: step === null ? RUN_ROWS.running : `⟳ ${step}`, url: htmlUrl };
    }
    if (state === 'none') return null;
    return { text: RUN_ROWS[state], url: htmlUrl };
  }

  private buildResultSegments(): readonly ResultSegment[] {
    const done = this.result();
    if (done === null) return [];
    const segments: ResultSegment[] = [];
    if (done.updated.length > 0) segments.push({ text: `✓ ${done.updated.length} updated` });
    if (done.skipped.length > 0) {
      segments.push({ text: `△ ${done.skipped.length} kept`, paths: done.skipped.map((file) => file.path) });
    }
    if (done.notice !== undefined) {
      segments.push({ text: '⊘ workflow files need one new permission' });
    }
    return segments;
  }

  protected async updateEngine(): Promise<void> {
    const ref = this.repoRef();
    if (ref === null || this.isUpdating()) return;
    this.isUpdating.set(true);
    const done = await this.engine.update(ref, { dryRun: false });
    if (done !== null) {
      this.versions.set(done.version);
      this.result.set(done);
    }
    this.isUpdating.set(false);
  }

  /**
   * Polls the weekly-build runs until a run other than `previousRunId` has finished.
   * A read with no run never ends the wait; on budget exhaustion the last real read stands.
   */
  private async awaitNewRun(ref: RepoRef, previousRunId: number | null): Promise<void> {
    let lastRead: EngineStatus = NO_ENGINE_RUN;
    for (let attempt = 0; attempt < ENGINE_POLL_MAX; attempt++) {
      await this.delay(ENGINE_POLL_MS);
      if (this.isDestroyed) return;
      const latest = await firstValueFrom(this.engine.status$(ref, true));
      if (latest.runId === null) continue;
      lastRead = latest;
      if (latest.runId === previousRunId) continue;
      this.status.set(latest);
      if (latest.state === 'running') {
        await this.showStep(ref, latest.runId);
        continue;
      }
      this.step.set(null);
      this.progress.refresh();
      return;
    }
    this.step.set(null);
    this.status.set(lastRead);
  }

  /** Shows the run's current step; the previous step stays when the read finds none. */
  private async showStep(ref: RepoRef, runId: number): Promise<void> {
    const name = await firstValueFrom(this.engine.step$(ref, runId));
    if (name !== null) this.step.set(name);
  }
}
