import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, ViewChild } from '@angular/core';

import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import type { CompareMode, PracticeCase } from '../../../core/models/practice.model';
import { isPracticeCase } from '../../../core/practice/practice-validation';
import { PracticeService } from '../../../core/services/practice.service';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { injectPracticeContract } from '../../practice/practice-contract';
import { entryFromStarter, importProblem } from '../problem-import';
import {
  CASES_MAX,
  STARTER_MAX_LENGTH,
  STATEMENT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type InterviewProblem,
} from '../session/interview-problem';

type CaseField = 'args' | 'expected' | 'ops';

/** One case's field texts as the form shows them. */
interface CaseRow {
  readonly args: string;
  readonly expected: string;
  readonly ops: string;
}

/** Raw field texts the person typed, valid for the `base` problem only. */
interface LocalFields {
  readonly base: InterviewProblem | null;
  readonly texts: Readonly<Record<string, string>>;
  readonly invalid: readonly string[];
}

const NO_LOCAL_FIELDS: LocalFields = { base: null, texts: {}, invalid: [] };
const UNORDERED_NESTED: CompareMode = 'unordered-nested';
const BASE_COMPARE_MODES: readonly CompareMode[] = ['exact', 'unordered'];
const EMPTY_JSON_ARRAY = '[]';
const NULL_JSON = 'null';

const METHOD_CASE_FIELDS: readonly CaseField[] = ['args', 'expected'];
const OPS_CASE_FIELDS: readonly CaseField[] = ['args', 'expected', 'ops'];

const fieldKey = (index: number, field: CaseField): string => `${index}:${field}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The field's parsed value, or null when the text is not valid for it. */
function parseCaseField(field: CaseField, text: string): { readonly value: unknown } | null {
  try {
    const value: unknown = JSON.parse(text);
    if (field === 'args' && !Array.isArray(value)) return null;
    if (field === 'ops' && !isStringArray(value)) return null;
    return { value };
  } catch {
    // Half-typed JSON is the normal state of the field, so it is shown as invalid, not logged.
    return null;
  }
}

/** The case with one field replaced. */
function withField(testCase: PracticeCase, field: CaseField, value: unknown): PracticeCase {
  if (field === 'args') return { ...testCase, args: value as unknown[] };
  if (field === 'ops') return { ...testCase, ops: value as string[] };
  return { ...testCase, expected: value };
}

/** The case rebuilt from the typed texts, and the keys of the texts that do not parse. A field with no text keeps its value. */
function buildCandidate(
  testCase: PracticeCase,
  index: number,
  caseFields: readonly CaseField[],
  texts: Readonly<Record<string, string>>,
): { readonly candidate: PracticeCase; readonly failed: readonly string[] } {
  return caseFields.reduce<{ candidate: PracticeCase; failed: readonly string[] }>(
    (acc, field) => {
      const key = fieldKey(index, field);
      const text = texts[key];
      if (text === undefined) return acc;
      const parsed = parseCaseField(field, text);
      if (!parsed) return { ...acc, failed: [...acc.failed, key] };
      return { ...acc, candidate: withField(acc.candidate, field, parsed.value) };
    },
    { candidate: testCase, failed: [] },
  );
}

function toRow(testCase: PracticeCase): CaseRow {
  return {
    args: JSON.stringify(testCase.args),
    expected: JSON.stringify(testCase.expected) ?? NULL_JSON,
    ops: JSON.stringify(testCase.ops ?? []) ?? EMPTY_JSON_ARRAY,
  };
}

/** The interviewer's problem as a form. It knows nothing about sessions and emits only on user input. */
@Component({
  selector: 'app-problem-editor',
  templateUrl: './problem-editor.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './problem-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent],
})
export class ProblemEditorComponent {
  /** The problem the form shows. The parent sets it to each emitted value (that same object); any other value is a replacement from outside and drops the form's local field texts. */
  readonly problem = input.required<InterviewProblem>();
  /** Each edit as a new problem value. A case field holding invalid JSON never emits. */
  readonly problemChange = output<InterviewProblem>();
  /** True while the parent holds a problem the session would reject. */
  readonly isRejected = input(false);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild('starterEditor') private starterEditor?: CodeEditorComponent;

  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly statementMaxLength = STATEMENT_MAX_LENGTH;
  protected readonly casesMax = CASES_MAX;

  private readonly practice = inject(PracticeService);

  /** The site problems the Import select offers. */
  protected readonly importable = computed(() => this.practice.data()?.problems ?? []);

  /** The starter the editor is created with; read once, so a later starter goes through `setText`. */
  protected readonly initialStarter = computed(() => untracked(this.problem).starter);

  private readonly cases = computed(() => this.problem().cases);
  /** The cases' field texts; a keystroke elsewhere keeps the same `cases`, so nothing is stringified again. */
  protected readonly rows = computed(() => this.cases().map(toRow));

  protected readonly compareModes = computed<readonly CompareMode[]>(() =>
    this.problem().compare === UNORDERED_NESTED ? [...BASE_COMPARE_MODES, UNORDERED_NESTED] : BASE_COMPARE_MODES,
  );
  protected readonly isOps = computed(() => this.problem().entry?.kind === 'ops');
  protected readonly isAtCasesMax = computed(() => this.cases().length >= CASES_MAX);
  protected readonly isStarterTooLong = computed(() => this.problem().starter.length > STARTER_MAX_LENGTH);
  /** A rejected problem whose starter is fine is rejected for its size, which the cases carry. */
  protected readonly isCasesRejected = computed(() => this.isRejected() && !this.isStarterTooLong());

  private readonly local = signal<LocalFields>(NO_LOCAL_FIELDS);
  /** The local fields, effective only while they belong to the problem being shown. */
  private readonly fields = computed(() => (this.local().base === this.problem() ? this.local() : NO_LOCAL_FIELDS));

  /** True while a case field holds text that is not valid for it. */
  readonly hasInvalidField = computed(() => this.fields().invalid.length > 0);

  /** The starter the editor holds; null until the first sync. */
  private editorText: string | null = null;

  constructor() {
    // Loads the contract so `practice.data()` fills.
    injectPracticeContract();
    // A starter that changed from outside (an import, an adopted problem) goes into the editor.
    effect(() => {
      const starter = this.problem().starter;
      untracked(() => {
        if (starter === this.editorText) return;
        this.editorText = starter;
        this.starterEditor?.setText(starter);
      });
    });
  }

  protected displayed(index: number, field: CaseField, fallback: string): string {
    return this.fields().texts[fieldKey(index, field)] ?? fallback;
  }

  protected isInvalid(index: number, field: CaseField): boolean {
    return this.fields().invalid.includes(fieldKey(index, field));
  }

  protected onImport(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const site = this.importable().find((candidate) => candidate.number === Number(select.value));
    select.value = '';
    if (!site) return;
    const meta = ALL_ALGORITHMS.find((algorithm) => algorithm.lcNumber === site.number) ?? null;
    this.publish(importProblem(site, meta));
  }

  protected onTitleInput(event: Event): void {
    this.publish({ ...this.problem(), title: (event.target as HTMLInputElement).value }, this.fields());
  }

  protected onStatementInput(event: Event): void {
    this.publish({ ...this.problem(), statement: (event.target as HTMLTextAreaElement).value }, this.fields());
  }

  protected onStarterChange(starter: string): void {
    const problem = this.problem();
    if (starter === problem.starter) return;
    this.editorText = starter;
    const entry = problem.source === null ? entryFromStarter(starter) : problem.entry;
    this.publish({ ...problem, starter, entry }, this.fields());
  }

  protected onCompareChange(event: Event): void {
    const compare = (event.target as HTMLSelectElement).value as CompareMode;
    this.publish({ ...this.problem(), compare }, this.fields());
  }

  protected onCaseInput(index: number, field: CaseField, event: Event): void {
    const current = this.fields();
    const texts = { ...current.texts, [fieldKey(index, field)]: (event.target as HTMLInputElement).value };
    const problem = this.problem();
    const isOps = this.isOps();
    const caseFields = isOps ? OPS_CASE_FIELDS : METHOD_CASE_FIELDS;
    const caseKeys = caseFields.map((f) => fieldKey(index, f));
    const { candidate, failed } = buildCandidate(problem.cases[index], index, caseFields, texts);
    const markInvalid = (keys: readonly string[]): void =>
      this.local.set({ base: problem, texts, invalid: [...current.invalid.filter((k) => !caseKeys.includes(k)), ...keys] });
    if (failed.length > 0) return markInvalid(failed);
    // The whole case must hold together (an ops case needs one args list per op), not just each field.
    if (!isPracticeCase(candidate, isOps)) return markInvalid(caseKeys.filter((k) => !k.endsWith(':expected')));
    const cases = problem.cases.map((testCase, i) => (i === index ? candidate : testCase));
    this.publish({ ...problem, cases }, { texts, invalid: current.invalid.filter((k) => !caseKeys.includes(k)) });
  }

  protected addCase(): void {
    const problem = this.problem();
    if (problem.cases.length >= CASES_MAX) return;
    // An ops entry carries `ops` in every case, so a new case for one starts with none.
    const added: PracticeCase = { args: [], expected: null, example: false, ...(this.isOps() ? { ops: [] } : {}) };
    this.publish({ ...problem, cases: [...problem.cases, added] });
  }

  protected removeCase(index: number): void {
    const problem = this.problem();
    this.publish({ ...problem, cases: problem.cases.filter((_, i) => i !== index) });
  }

  /** Every emit goes through here: the local fields move to the emitted value, which the parent sets back. */
  private publish(next: InterviewProblem, kept?: Pick<LocalFields, 'texts' | 'invalid'>): void {
    this.local.set({ base: next, texts: kept?.texts ?? {}, invalid: kept?.invalid ?? [] });
    this.problemChange.emit(next);
  }
}
