import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Subscription, map } from 'rxjs';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import {
  LoadStatus,
  invalidSlugMessage,
  parseRepoSlug,
  sameRef,
} from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../practice-draft';
import { countPassed, toResultRow } from '../practice-results';

const DRAFT_SAVE_DELAY_MS = 500;
const COPY_FEEDBACK_MS = 1500;
const COPY_OK_MARK = '✓';
const COPY_FAIL_MARK = '✗';
const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** The route's `:number` as a positive integer, or null (the not-found state). */
function parseProblemNumber(raw: string | null): number | null {
  if (raw === null || !POSITIVE_INTEGER.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice-page.component.html',
  styleUrls: ['./practice-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent],
})
export class PracticePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly practice = inject(PracticeService);
  private readonly runner = inject(PythonRunnerService);
  private readonly destroyRef = inject(DestroyRef);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild('editor') private editor?: CodeEditorComponent;

  private readonly repoParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('repo'))),
    { initialValue: this.route.snapshot.queryParamMap.get('repo') },
  );
  private readonly numberParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('number'))),
    { initialValue: this.route.snapshot.paramMap.get('number') },
  );

  readonly ref = computed(() => parseRepoSlug(this.repoParam()));
  readonly invalidSlug = computed(() =>
    this.ref() ? null : invalidSlugMessage(this.repoParam()),
  );
  readonly rawNumber = computed(() => this.numberParam() ?? '');
  /** The root-scoped service may still hold another ref's state (the Progress page shares
   *  it) until this page's `load(ref)` lands; until then this page is loading. */
  readonly contractStatus = computed<LoadStatus>(() =>
    sameRef(this.practice.ref(), this.ref()) ? this.practice.status() : 'loading',
  );
  readonly error = this.practice.error;

  readonly problem = computed(() => {
    const number = parseProblemNumber(this.numberParam());
    if (number === null || this.contractStatus() !== 'ready') return null;
    return this.practice.problemFor(number);
  });

  private readonly key = computed(() => {
    const ref = this.ref();
    const problem = this.problem();
    return ref && problem ? draftKey(ref, problem.number) : null;
  });

  /** Read once per problem by the editor: a saved draft wins over the stub. */
  readonly initialText = computed(() => {
    const problem = this.problem();
    if (!problem) return '';
    const key = this.key();
    return (key ? loadDraft(key) : null) ?? problem.stub;
  });

  /** What the learner has typed (or Reset to) for one problem; null until they do. Tagged
   *  with its problem so it never leaks onto another problem. */
  private readonly edited = signal<{ number: number; text: string } | null>(null);

  /** The editor's current text. */
  private readonly text = computed(() => {
    const edited = this.edited();
    return edited && edited.number === this.problem()?.number ? edited.text : this.initialText();
  });

  readonly runState = signal<RunState | null>(null);
  readonly isBusy = computed(() => {
    const state = this.runState()?.status;
    return state === 'loading' || state === 'running';
  });
  readonly isLoadingPython = computed(() => this.runState()?.status === 'loading');
  readonly rows = computed(() => {
    const cases = this.problem()?.cases ?? [];
    return (this.runState()?.results ?? []).map((result) => toResultRow(result, cases));
  });
  readonly passedCount = computed(() => countPassed(this.runState()?.results ?? []));
  readonly copyMark = signal<string | null>(null);

  private runSubscription: Subscription | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const ref = this.ref();
      if (!ref) return;
      untracked(() => this.practice.load(ref));
    });
    this.destroyRef.onDestroy(() => this.flushPendingSave());
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.runSubscription?.unsubscribe();
    });
  }

  onTextChange(text: string): void {
    const problem = this.problem();
    if (!problem || text === this.text()) return;
    this.edited.set({ number: problem.number, text });
    this.cancelPendingSave();
    this.saveTimer = setTimeout(() => this.flushPendingSave(), DRAFT_SAVE_DELAY_MS);
  }

  run(): void {
    const problem = this.problem();
    if (!problem || this.isBusy()) return;
    this.runSubscription?.unsubscribe();
    this.runSubscription = this.runner.run(this.text(), problem).subscribe({
      next: (state) => this.runState.set(state),
      error: (err: unknown) => {
        console.error(`Practice run failed for #${problem.number}`, err);
        const message = err instanceof Error ? err.message : String(err);
        this.runState.set({ status: 'done', results: [], runError: message });
      },
    });
  }

  reset(): void {
    const problem = this.problem();
    if (!problem) return;
    this.cancelPendingSave();
    this.edited.set({ number: problem.number, text: problem.stub });
    this.editor?.setText(problem.stub);
    const key = this.key();
    if (key) clearDraft(key);
  }

  copy(): void {
    const failCopy = (err: unknown): void => {
      console.error('Practice copy: clipboard write failed', err);
      this.showCopyMark(COPY_FAIL_MARK);
    };
    // `navigator.clipboard` is undefined in an insecure context or an unsupported browser.
    if (!navigator.clipboard) {
      failCopy(new Error('navigator.clipboard is unavailable'));
      return;
    }
    navigator.clipboard.writeText(this.text()).then(() => this.showCopyMark(COPY_OK_MARK), failCopy);
  }

  private showCopyMark(mark: string): void {
    this.copyMark.set(mark);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copyMark.set(null), COPY_FEEDBACK_MS);
  }

  private cancelPendingSave(): void {
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  /** Writes the draft now if a debounced save is waiting (also run when the page is left). */
  private flushPendingSave(): void {
    if (this.saveTimer === null) return;
    this.cancelPendingSave();
    const key = this.key();
    if (key) saveDraft(key, this.text());
  }
}
