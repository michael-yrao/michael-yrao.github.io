import { Signal, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import {
  LoadStatus,
  RepoRef,
  invalidSlugMessage,
  parseRepoSlug,
  sameRef,
} from '../../core/services/github-file.service';
import { PracticeService } from '../../core/services/practice.service';

/** What a practice page needs to know about the contract for the repo in `?repo=`. */
export interface PracticeContractView {
  readonly ref: Signal<RepoRef | null>;
  readonly invalidSlug: Signal<string | null>;
  readonly status: Signal<LoadStatus>;
  readonly error: Signal<string | null>;
}

/**
 * Loads the practice contract for the repo in `?repo=` and exposes its state. Call from a
 * component's injection context (a field initializer or the constructor).
 */
export function injectPracticeContract(): PracticeContractView {
  const route = inject(ActivatedRoute);
  const practice = inject(PracticeService);

  const repoParam = toSignal(route.queryParamMap.pipe(map((params) => params.get('repo'))), {
    initialValue: route.snapshot.queryParamMap.get('repo'),
  });
  const ref = computed(() => parseRepoSlug(repoParam()));
  const invalidSlug = computed(() => (ref() ? null : invalidSlugMessage(repoParam())));
  // The root-scoped service may still hold another ref's state (the Progress page shares it)
  // until this page's `load(ref)` lands; until then this page is loading.
  const status = computed<LoadStatus>(() =>
    sameRef(practice.ref(), ref()) ? practice.status() : 'loading',
  );

  effect(() => {
    const current = ref();
    if (!current) return;
    untracked(() => practice.load(current));
  });

  return { ref, invalidSlug, status, error: practice.error };
}
