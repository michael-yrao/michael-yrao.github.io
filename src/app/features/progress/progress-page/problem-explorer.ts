// Owns the Activity tab's drill state: which rows are expanded, and the gauge's inline "Needs attention" list.
import { Signal, computed, signal } from '@angular/core';

import { ProblemProgress } from '../../../core/models/progress.model';
import { todayLocalISO } from '../../../core/utils/local-date';
import { attentionProblems } from '../problem-progress';
import { problemRowKey, toggledKeys } from './progress-derivations';

export interface ProblemExplorerDeps {
  /** The full problems[] — null until the opt-in details fetch has resolved. */
  readonly details: Signal<ProblemProgress[] | null>;
  /** The idempotent opt-in details fetch. */
  readonly loadDetails: () => void;
}

export class ProblemExplorer {
  // The On-schedule gauge's "Needs attention" disclosure — expands in place under the gauge;
  // opening it fires the same idempotent loadDetails() the old Problems-tab drill did.
  readonly attentionOpen = signal(false);

  // Which rows are expanded — only an expanded row mounts <app-problem-timeline>, so at most
  // a handful of per-problem SVGs ever exist at once (the 132-at-once mount can never recur).
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  readonly attentionProblems = computed<ProblemProgress[]>(() =>
    attentionProblems(this.deps.details() ?? [], todayLocalISO()),
  );

  constructor(private readonly deps: ProblemExplorerDeps) {}

  /** The "Needs attention" toggle — opening fetches details (idempotent); collapsing needs no
   *  fetch but closes any expanded row. */
  toggleAttention(): void {
    const next = !this.attentionOpen();
    this.attentionOpen.set(next);
    if (next) {
      this.deps.loadDetails();
    } else {
      this.collapseAllRows();
    }
  }

  toggle(p: ProblemProgress): void {
    this.expandedKeys.set(toggledKeys(this.expandedKeys(), problemRowKey(p)));
  }

  isExpanded(p: ProblemProgress): boolean {
    return this.expandedKeys().has(problemRowKey(p));
  }

  /** A repo swap starts from a clean slate: nothing expanded, attention closed. */
  reset(): void {
    this.collapseAllRows();
    this.attentionOpen.set(false);
  }

  /** Collapses every expanded row — called whenever the list itself is about to change
   *  underneath it (a tab switch, a repo swap), so a stale expanded row never lingers. */
  collapseAllRows(): void {
    this.expandedKeys.set(new Set());
  }
}
