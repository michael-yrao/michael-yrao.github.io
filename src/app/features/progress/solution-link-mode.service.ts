import { Injectable, signal } from '@angular/core';

import { readStoredMode, SolutionLinkMode, writeStoredMode } from './solution-link-mode';

/** The single, page-header-level Solution Links setting (settings-menu.component.ts's ⚙
 *  Settings panel) — replaces each problem list keeping its own mode. Every list
 *  (today-board, technique-list, progress-page's Problems tab) injects this ONE service and
 *  reads `mode()` rather than owning a signal of its own. */
@Injectable({ providedIn: 'root' })
export class SolutionLinkModeService {
  private readonly modeSignal = signal<SolutionLinkMode>(readStoredMode());
  readonly mode = this.modeSignal.asReadonly();

  set(mode: SolutionLinkMode): void {
    this.modeSignal.set(mode);
    writeStoredMode(mode);
  }
}
