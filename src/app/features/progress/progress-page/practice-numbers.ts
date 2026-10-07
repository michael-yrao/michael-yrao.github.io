// Owns which LeetCode numbers have a practice entry (the Run link): loads the practice index for the rendered repo and resolves the set.
import { Signal, computed, effect, untracked } from '@angular/core';

import { PracticeService } from '../../../core/services/practice.service';
import { RepoRef, sameRef } from '../../../core/services/github-file.service';

/** Must be constructed in an injection context (it registers the index-load effect).
 *
 *  Only the practice index (the list of numbers) rides along on the page; if the index is
 *  unavailable the full contract is used instead, and a failed load simply leaves the set
 *  empty and surfaces nothing. */
export class PracticeNumbers {
  readonly numbers = computed<ReadonlySet<number>>(() => {
    const indexed = this.practice.indexNumbers();
    if (indexed) return indexed;
    const isThisRepo = sameRef(this.practice.ref(), this.repoRef());
    const problems = isThisRepo ? (this.practice.data()?.problems ?? []) : [];
    return new Set(problems.map((problem) => problem.number));
  });

  constructor(
    private readonly practice: PracticeService,
    private readonly repoRef: Signal<RepoRef | null>,
  ) {
    // Load the practice index for the resolved repo. The same-ref guard holds whatever the
    // status, so a 404 is not refetched in a loop (PracticeService.load itself refetches a
    // same-ref errored load); `untracked` keeps loadIndex()'s own signal writes out of the effect.
    effect(() => {
      const ref = this.repoRef();
      if (!ref) return;
      untracked(() => {
        if (sameRef(ref, this.practice.indexRef())) return;
        this.practice.loadIndex(ref);
      });
    });
  }
}
