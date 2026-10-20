import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom, of, switchMap } from 'rxjs';

import { ENGINE_DELAY, EngineService } from '../../../core/engine/engine.service';
import { EngineState, EngineStatus, NO_ENGINE_RUN } from '../../../core/engine/engine-status';
import { RepoRef } from '../../../core/services/github-file.service';
import { ProgressService } from '../../../core/services/progress.service';

export const ENGINE_POLL_MS = 10_000;
export const ENGINE_POLL_MAX = 24;

const GLYPHS: Readonly<Record<EngineState, string>> = {
  running: '⟳',
  ok: '✓',
  failed: '✗',
  none: '',
};

const LABELS: Readonly<Record<EngineState, string>> = {
  running: 'engine running',
  ok: 'last run ok',
  failed: 'last run failed',
  none: '',
};

/** The engine's last GitHub Actions run as a mark, with the button that dispatches next week's build. */
@Component({
  selector: 'app-engine-mark',
  templateUrl: './engine-mark.component.html',
  styleUrl: './engine-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineMarkComponent {
  readonly repoRef = input<RepoRef | null>(null);
  /** False when the repo has no config to build from: the mark stays, the button goes. */
  readonly canBuild = input(true);

  private readonly engine = inject(EngineService);
  private readonly progress = inject(ProgressService);
  private readonly delay = inject(ENGINE_DELAY);
  private readonly destroyRef = inject(DestroyRef);
  private isDestroyed = false;

  protected readonly status = signal<EngineStatus>(NO_ENGINE_RUN);
  protected readonly isBuilding = signal(false);
  protected readonly isRefused = signal(false);
  protected readonly glyph = computed(() => GLYPHS[this.status().state]);
  protected readonly label = computed(() => LABELS[this.status().state]);

  constructor() {
    this.destroyRef.onDestroy(() => (this.isDestroyed = true));
    toObservable(this.repoRef)
      .pipe(
        switchMap((ref) => (ref === null ? of(NO_ENGINE_RUN) : this.engine.status$(ref))),
        takeUntilDestroyed(),
      )
      .subscribe((status) => this.status.set(status));
  }

  protected async build(): Promise<void> {
    const ref = this.repoRef();
    if (ref === null || this.isBuilding()) return;
    this.isBuilding.set(true);
    this.isRefused.set(false);
    const previousRunId = this.status().runId;
    const result = await this.engine.buildNextWeek(ref);
    if (result === 'refused') this.isRefused.set(true);
    if (result === 'dispatched') {
      this.status.set({ state: 'running', runId: previousRunId, htmlUrl: null });
      await this.awaitNewRun(ref, previousRunId);
    }
    this.isBuilding.set(false);
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
