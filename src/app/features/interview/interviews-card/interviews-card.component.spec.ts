import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { OFFLINE_MESSAGE } from '../interview-messages';
import { InterviewSessionService } from '../session/interview-session.service';
import { PreparedInterviewsService } from '../session/prepared-interviews.service';
import type { PreparedSummary } from '../session/prepared-summary';
import { InterviewsCardComponent } from './interviews-card.component';

const DELETE_BUTTON = 'button[aria-label="Delete interview"]';
const ROW = '.interviews__row';
const MESSAGE = '.practice__message';

const SUMMARY: PreparedSummary = {
  sessionId: 'session-1',
  title: 'Pair sum',
  createdAt: 1,
  publish: 'published',
  schedule: null,
};

/** Lets every pending promise settle (real timers only). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const CASES: readonly {
  readonly name: string;
  readonly isConfirmed: boolean;
  readonly removeResult: boolean;
  readonly removeCalls: number;
  readonly rowsAfter: number;
  readonly message: string | null;
}[] = [
  { name: 'declining the confirm keeps the row', isConfirmed: false, removeResult: true, removeCalls: 0, rowsAfter: 1, message: null },
  { name: 'a removed interview leaves the list', isConfirmed: true, removeResult: true, removeCalls: 1, rowsAfter: 0, message: null },
  { name: 'an unreachable server keeps the row and says so', isConfirmed: true, removeResult: false, removeCalls: 1, rowsAfter: 1, message: OFFLINE_MESSAGE },
];

describe('InterviewsCardComponent delete', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(CASES)('$name', async ({ isConfirmed, removeResult, removeCalls, rowsAfter, message }) => {
    const list = signal<readonly PreparedSummary[]>([SUMMARY]);
    const remove = vi.fn(async () => {
      if (removeResult) list.set([]);
      return removeResult;
    });
    const prepared = {
      list,
      remove,
      retryUnpublished: vi.fn().mockResolvedValue(undefined),
      codesOf: vi.fn().mockReturnValue(null),
      packedOf: vi.fn().mockReturnValue(null),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PreparedInterviewsService, useValue: prepared },
        { provide: InterviewSessionService, useValue: { resume: vi.fn() } },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(isConfirmed);
    const fixture = TestBed.createComponent(InterviewsCardComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    root.querySelector<HTMLButtonElement>(DELETE_BUTTON)!.click();
    await flush();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledTimes(removeCalls);
    expect(root.querySelectorAll(ROW)).toHaveLength(rowsAfter);
    expect(root.querySelector(MESSAGE)?.textContent?.trim() ?? null).toBe(message);
  });
});
