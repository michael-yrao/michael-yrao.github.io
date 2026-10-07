import { Signal, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {
  ALGORITHM_INDEX,
  AlgorithmIndexEntry,
  findByNumber,
} from '../../core/data/algorithms.data';
import { leetCodeUrlFor } from '../../core/data/lc-url';
import { loadMetaOrNull } from '../../core/data/load-meta';
import { AlgorithmMeta } from '../../core/models/algorithm.model';
import { PracticeProblem } from '../../core/models/practice.model';
import { LoadStatus, RepoRef } from '../../core/services/github-file.service';
import { PracticeService } from '../../core/services/practice.service';
import { ShowcaseService } from '../../core/services/showcase.service';
import { showcaseKey } from '../../core/showcase/showcase-key';
import { CatalogueNeighbors, buildCatalogue, neighborsOf } from './practice-catalogue';
import { injectPracticeContract } from '../../shared/utils/practice-contract';

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const NO_NEIGHBORS: CatalogueNeighbors = { prev: null, next: null };

/** The route's `:number` as a positive integer, or null (the not-found state). */
function parseProblemNumber(raw: string | null): number | null {
  if (raw === null || !POSITIVE_INTEGER.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** The problem a practice or solution page is about, from the route's `:number` and both sources. */
export interface PracticeProblemView {
  readonly ref: Signal<RepoRef | null>;
  readonly invalidSlug: Signal<string | null>;
  readonly rawNumber: Signal<string>;
  readonly contractStatus: Signal<LoadStatus>;
  readonly error: Signal<string | null>;
  /** The contract's own message (bad slug or failed load), as the list page shows it. */
  readonly contractMessage: Signal<string | null>;
  readonly number: Signal<number | null>;
  /** The contract's problem for the number, once the contract is ready. */
  readonly problem: Signal<PracticeProblem | null>;
  /** The number's index entry, when `ALGORITHM_INDEX` has it; known at once. */
  readonly entry: Signal<AlgorithmIndexEntry | null>;
  /** The entry's full algorithm: null until its chunk has loaded (and when there is no entry). */
  readonly meta: Signal<AlgorithmMeta | null>;
  /** Either source has the number, so the page can draw; a static-only number never waits for
   *  the contract. */
  readonly hasProblem: Signal<boolean>;
  /** The contract's title wins, as in the catalogue. */
  readonly title: Signal<string>;
  /** The contract's URL, else the showcase entry's for the first variant, else the number's. */
  readonly titleUrl: Signal<string | null>;
  readonly neighbors: Signal<CatalogueNeighbors>;
}

/**
 * Loads the contract (via `injectPracticeContract`) and the showcase, and derives the page's
 * problem from the route. Call from a component's injection context (a field initializer).
 */
export function injectPracticeProblem(): PracticeProblemView {
  const route = inject(ActivatedRoute);
  const practice = inject(PracticeService);
  const showcase = inject(ShowcaseService);
  const contract = injectPracticeContract();

  // Gold-standard only: a step generator is a hand-written trace of one attempt, so the
  // showcase cannot follow `?repo=`. A no-op if already loaded/loading this session.
  showcase.load();

  const params = toSignal(route.paramMap, { initialValue: route.snapshot.paramMap });
  const numberParam = computed(() => params().get('number'));
  const rawNumber = computed(() => numberParam() ?? '');
  const number = computed(() => parseProblemNumber(numberParam()));

  const contractMessage = computed(() => {
    const invalid = contract.invalidSlug();
    if (invalid) return invalid;
    return contract.status() === 'error' ? contract.error() : null;
  });

  const problem = computed(() => {
    const value = number();
    if (value === null || contract.status() !== 'ready') return null;
    return practice.problemFor(value);
  });

  const entry = computed(() => {
    const value = number();
    return value === null ? null : (findByNumber(value) ?? null);
  });

  // Idle (no value) while there is no entry; reloads from scratch when the number changes.
  const loadedMeta = resource({
    params: () => entry() ?? undefined,
    loader: ({ params }) => loadMetaOrNull(params),
  });
  const meta = computed(() => (loadedMeta.hasValue() ? loadedMeta.value() : null));

  const hasProblem = computed(() => problem() !== null || entry() !== null);
  const title = computed(() => problem()?.title ?? entry()?.title ?? '');

  const firstVariantEntryUrl = computed(() => {
    const algorithm = entry();
    const variant = algorithm?.variants[0];
    if (!algorithm || !variant || !showcase.data()) return undefined;
    return showcase.entryFor(showcaseKey(algorithm, variant))?.url;
  });
  const titleUrl = computed(() =>
    leetCodeUrlFor(problem()?.url ?? firstVariantEntryUrl(), entry()?.lcNumber),
  );

  const neighbors = computed(() => {
    const value = number();
    const problems = contract.status() === 'ready' ? (practice.data()?.problems ?? []) : [];
    if (value === null) return NO_NEIGHBORS;
    return neighborsOf(buildCatalogue(ALGORITHM_INDEX, problems), value);
  });

  return {
    ref: contract.ref,
    invalidSlug: contract.invalidSlug,
    rawNumber,
    contractStatus: contract.status,
    error: contract.error,
    contractMessage,
    number,
    problem,
    entry,
    meta,
    hasProblem,
    title,
    titleUrl,
    neighbors,
  };
}
