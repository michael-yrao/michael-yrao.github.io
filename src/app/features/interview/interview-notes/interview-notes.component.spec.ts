import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { InterviewSessionService } from '../session/interview-session.service';
import { loadNotes } from '../session/notes-store';
import { InterviewNotesComponent } from './interview-notes.component';

const SESSION_ID = 'session-1';
const START = 1_000_000;
const MS_PER_MINUTE = 60_000;
const ELAPSED_MINUTES = 34;
const THROWN = '.interview-notes__thrown';
const MINUTE = '.interview-notes__minute';
const VERDICT = '.interview-notes__verdict';
const MOVE = '.interview-notes__move';
const NOTES_FIELD = '.interview-notes__textarea';
const COLD = '.interview-notes__cold';

function setUp(startedAt: number | null) {
  const session = { sessionId: signal<string | null>(SESSION_ID), startedAt: signal<number | null>(startedAt) };
  TestBed.configureTestingModule({ providers: [{ provide: InterviewSessionService, useValue: session }] });
  const fixture = TestBed.createComponent(InterviewNotesComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, session };
}

function click(root: HTMLElement, selector: string): void {
  (root.querySelector(selector) as HTMLElement).click();
}

function chooseMove(root: HTMLElement): void {
  const select = root.querySelector(MOVE) as HTMLSelectElement;
  select.value = 'stream';
  select.dispatchEvent(new Event('change'));
}

const CHECK_SELECTORS = {
  restated: '.interview-notes__check-restated',
  survives: '.interview-notes__check-survives',
  tradeoff: '.interview-notes__check-tradeoff',
  approach: '.interview-notes__check-approach',
  coded: '.interview-notes__check-coded',
} as const;

const VERDICT_ROWS: readonly {
  name: string;
  hasMove: boolean;
  checked: readonly (keyof typeof CHECK_SELECTORS)[];
  mark: string | null;
}[] = [
  { name: 'no move chosen', hasMove: false, checked: ['approach', 'restated', 'survives', 'tradeoff'], mark: null },
  { name: 'approach and three others', hasMove: true, checked: ['approach', 'restated', 'survives', 'tradeoff'], mark: 'Pass' },
  { name: 'approach and two others', hasMove: true, checked: ['approach', 'restated', 'survives'], mark: 'Partial' },
  { name: 'three others without the approach', hasMove: true, checked: ['restated', 'survives', 'tradeoff'], mark: 'Partial' },
  { name: 'two others without the approach', hasMove: true, checked: ['restated', 'survives'], mark: 'Fail' },
];

describe('InterviewNotesComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('stamps the elapsed minute once, and is disabled before a candidate connects', () => {
    vi.useFakeTimers({ now: START + ELAPSED_MINUTES * MS_PER_MINUTE + 1_000 });
    const { fixture, root, session } = setUp(null);
    expect((root.querySelector(THROWN) as HTMLButtonElement).disabled).toBe(true);

    session.startedAt.set(START);
    fixture.detectChanges();
    expect((root.querySelector(THROWN) as HTMLButtonElement).disabled).toBe(false);
    click(root, THROWN);
    fixture.detectChanges();

    expect(root.querySelector(MINUTE)?.textContent?.trim()).toBe(`at ${ELAPSED_MINUTES} min`);
    expect((root.querySelector(THROWN) as HTMLButtonElement).disabled).toBe(true);
    expect(loadNotes(SESSION_ID)?.raiserMinute).toBe(ELAPSED_MINUTES);
  });

  it.each(VERDICT_ROWS)('the verdict mark follows the checkboxes: $name', (row) => {
    const { fixture, root } = setUp(START);
    if (row.hasMove) chooseMove(root);
    for (const key of row.checked) click(root, CHECK_SELECTORS[key]);
    fixture.detectChanges();
    expect(root.querySelector(VERDICT)?.textContent?.trim() ?? null).toBe(row.mark);
  });

  it('keeps its form across a reload from the notes store', () => {
    const first = setUp(START);
    click(first.root, COLD);
    chooseMove(first.root);
    click(first.root, CHECK_SELECTORS.approach);
    const field = first.root.querySelector(NOTES_FIELD) as HTMLTextAreaElement;
    field.value = 'solid';
    field.dispatchEvent(new Event('input'));
    TestBed.resetTestingModule();

    const second = setUp(START);
    expect((second.root.querySelector(COLD) as HTMLInputElement).checked).toBe(true);
    expect((second.root.querySelector(MOVE) as HTMLSelectElement).value).toBe('stream');
    expect((second.root.querySelector(CHECK_SELECTORS.approach) as HTMLInputElement).checked).toBe(true);
    expect((second.root.querySelector(NOTES_FIELD) as HTMLTextAreaElement).value).toBe('solid');
  });
});
