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
import { todayLocalISO } from '../../../core/utils/local-date';
import { MenuComponent, MenuDotState } from '../../../shared/components/menu/menu.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

export const ENGINE_POLL_MS = 10_000;
export const ENGINE_POLL_MAX = 24;

const BUILD_DAY_META = 'today';
const OFF_BUILD_DAY_META = 'closes this week';
const OFF_ROW = '⏻ weekly build off';
const NO_CONFIG_ROW = '✗ no cse.config.yml';
const RUN_ROWS: Readonly<Record<'running' | 'ok' | 'failed', string>> = {
  running: '⟳ running',
  ok: '✓ last run ok',
  failed: '✗ last run failed',
};
/** Build results that leave the menu open so the row they cause is seen. */
const REFUSALS: ReadonlySet<BuildResult> = new Set<BuildResult>(['off', 'no-config', 'refused']);

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
  /** False when the repo has no config to build from: the Build item is disabled. */
  readonly canBuild = input(true);

  private readonly engine = inject(EngineService);
  private readonly progress = inject(ProgressService);
  private readonly delay = inject(ENGINE_DELAY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menu = viewChild.required(MenuComponent);
  private isDestroyed = false;

  protected readonly status = signal<EngineStatus>(NO_ENGINE_RUN);
  protected readonly isBuilding = signal(false);
  protected readonly isRefused = signal(false);
  protected readonly lastBuild = signal<BuildResult | null>(null);
  protected readonly isConfirming = signal(false);

  protected readonly versions = signal<EngineVersions | null>(null);
  protected readonly result = signal<EngineUpdate | null>(null);
  protected readonly isUpdating = signal(false);
  protected readonly isUpdateAvailable = computed(() => {
    const versions = this.versions();
    if (versions === null || versions.repo === null || versions.template === null) return false;
    return isNewerVersion(versions.template, versions.repo);
  });

  protected readonly dotState = computed<MenuDotState>(() => {
    if (this.lastBuild() === 'off') return 'off';
    if (this.lastBuild() === 'no-config') return 'failed';
    if (this.isBuilding() || this.status().state === 'running') return 'running';
    return this.status().state === 'failed' ? 'failed' : 'none';
  });
  protected readonly buildMeta = computed(() => (isBuildDay(todayLocalISO()) ? BUILD_DAY_META : OFF_BUILD_DAY_META));
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

  protected confirmBuild(): void {
    this.isConfirming.set(false);
    void this.build();
  }

  protected async build(): Promise<void> {
    const ref = this.repoRef();
    if (ref === null || this.isBuilding()) return;
    this.isBuilding.set(true);
    this.isRefused.set(false);
    this.lastBuild.set(null);
    const previousRunId = this.status().runId;
    const result = await this.engine.buildNextWeek(ref);
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
    if (last === 'off') return { text: OFF_ROW, url: null };
    if (last === 'no-config') return { text: NO_CONFIG_ROW, url: null };
    const { state, htmlUrl } = this.status();
    if (this.isBuilding() || state === 'running') return { text: RUN_ROWS.running, url: htmlUrl };
    if (state === 'none') return null;
    return { text: RUN_ROWS[state], url: htmlUrl };
  }

  private buildResultSegments(): readonly ResultSegment[] {
    const done = this.result();
    if (done === null) return [];
    const segments: ResultSegment[] = [];
    if (done.updated.length > 0) segments.push({ text: `✓ ${done.updated.length} updated` });
    if (done.skipped.length > 0) {
      segments.push({ text: `⚠ ${done.skipped.length} kept`, paths: done.skipped.map((file) => file.path) });
    }
    if (done.notice !== undefined) {
      segments.push({ text: '⛔ workflow files need one new permission' });
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

  /** Polls the runs list until a run other than `previousRunId` has finished. */
  private async awaitNewRun(ref: RepoRef, previousRunId: number | null): Promise<void> {
    for (let attempt = 0; attempt < ENGINE_POLL_MAX; attempt++) {
      await this.delay(ENGINE_POLL_MS);
      if (this.isDestroyed) return;
      const latest = await firstValueFrom(this.engine.status$(ref, true));
      if (latest.runId === previousRunId) continue;
      this.status.set(latest);
      if (latest.state === 'running') continue;
      this.progress.refresh();
      return;
    }
  }
}
