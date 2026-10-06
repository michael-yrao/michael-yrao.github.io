import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { InterviewSessionService } from '../interview-session.service';
import { PreparedInterviewsService, type PreparedLinks, type PreparedSummary } from '../prepared-interviews.service';
import { CandidateSeat, NO_MARKS, Participant } from '../session-message';
import { InterviewBarComponent } from './interview-bar.component';

const INVITE_URL = 'https://example.com/practice/1?repo=me/notes&join=abc';
const HOST_URL = 'https://example.com/practice/1?repo=me/notes&host=secret';
const NAME_INPUT = 'input[aria-label="Your name"]';
const SHARE_BUTTON = '[aria-label="Share invite link"]';
const EDIT_BUTTON = '[aria-label="Edit name"]';
const NAME_LABEL = '.interview-bar__name-label';
const EMAIL_TOGGLE = '[aria-label="Email links"]';
const CANDIDATE_EMAIL_INPUT = 'input[aria-label="Candidate email"]';
const CANDIDATE_EMAIL_LINK = '[aria-label="Email candidate link"]';
const SLOT = '.interview-bar__slot';
const SLOT_CHIP = '.interview-bar__chip';
const SELF_ID = 'me';
const PACKED_KEY = 'packed-key';
const CANDIDATE_CODE_URL = 'https://example.com/interview?code=K7QF2M9X';
const INTERVIEWER_URL = 'https://example.com/interview?code=4TPD8HNW3RXA';
const PREPARED_LINKS: PreparedLinks = { candidateUrl: CANDIDATE_CODE_URL, interviewerUrl: INTERVIEWER_URL };
const COPY_HOST_BUTTON = '[aria-label="Copy interviewer link"]';
const HOST_EMAIL_LINK = '[aria-label="Email interviewer link"]';

interface SetupOptions {
  readonly roster?: readonly Participant[];
  readonly role?: 'interviewer' | 'candidate';
  /** What `linksForKey` answers, in call order; the last one repeats. */
  readonly links?: readonly (Promise<PreparedLinks | null> | PreparedLinks | null)[];
}

/** Lets the effect run, the mocked service answer and the view settle. */
async function settle(fixture: ComponentFixture<InterviewBarComponent>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

function setup(storedName: string, hasShare: boolean, options: SetupOptions = {}) {
  const { roster = [], role = 'interviewer', links = [null] } = options;
  TestBed.resetTestingModule();
  const myName = signal(storedName);
  const setMyName = vi.fn((name: string) => myName.set(name.trim()));
  const stub = {
    role: signal(role),
    status: signal('open'),
    startedAt: signal<number | null>(null),
    inviteUrl: signal<string | null>(INVITE_URL),
    hostUrl: signal<string | null>(HOST_URL),
    roster: signal<readonly Participant[]>(roster),
    selfId: SELF_ID,
    myName,
    setMyName,
    end: vi.fn(),
    problem: signal<object | null>({}),
    linkParams: () => ({ host: PACKED_KEY }),
  };
  let call = 0;
  const preparedService = {
    list: signal<readonly PreparedSummary[]>([]),
    linksForKey: vi.fn(() => Promise.resolve(links[Math.min(call++, links.length - 1)])),
  };
  Object.defineProperty(navigator, 'share', { value: hasShare ? () => Promise.resolve() : undefined, configurable: true });
  TestBed.configureTestingModule({
    providers: [
      { provide: InterviewSessionService, useValue: stub },
      { provide: PreparedInterviewsService, useValue: preparedService },
    ],
  });
  const fixture = TestBed.createComponent(InterviewBarComponent);
  fixture.detectChanges();
  return { fixture, setMyName, end: stub.end, problem: stub.problem, preparedService };
}

const query = (fixture: ComponentFixture<InterviewBarComponent>, selector: string): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector(selector);

const ROSTER_CASES: readonly {
  name: string;
  roster: readonly Participant[];
  chips: readonly string[];
  inputSlot: number;
}[] = [
  {
    name: '1 interviewer and no candidate',
    roster: [{ id: SELF_ID, role: 'interviewer', name: 'Alex', ...NO_MARKS }],
    chips: ['Interviewer', 'Candidate'],
    inputSlot: 0,
  },
  {
    name: '3 interviewers and a candidate',
    roster: [
      { id: 'a', role: 'interviewer', name: 'Ann', ...NO_MARKS },
      { id: SELF_ID, role: 'interviewer', name: 'Alex', ...NO_MARKS },
      { id: 'b', role: 'interviewer', name: 'Bo', ...NO_MARKS },
      { id: 'c', role: 'candidate', name: 'Cy', ...NO_MARKS },
    ],
    chips: ['Interviewer', 'Interviewer', 'Interviewer', 'Candidate'],
    inputSlot: 1,
  },
];

const AWAY_MARK = '[aria-label="Times away"]';
const PASTE_MARK = '[aria-label="Large pastes"]';
const ACTIVE_MARK_CLASS = 'interview-bar__mark--active';

const MARK_CASES: readonly {
  name: string;
  seat: CandidateSeat;
  away: string | null;
  paste: string | null;
  isAwayActive: boolean;
}[] = [
  { name: 'all-zero marks show neither', seat: NO_MARKS, away: null, paste: null, isAwayActive: false },
  { name: 'awayCount 2 shows only the away mark', seat: { ...NO_MARKS, awayCount: 2 }, away: '2', paste: null, isAwayActive: false },
  { name: 'pasteCount 3 shows only the paste mark', seat: { ...NO_MARKS, pasteCount: 3 }, away: null, paste: '3', isAwayActive: false },
  { name: 'isAway puts the away mark in the accent', seat: { isAway: true, awayCount: 1, pasteCount: 0 }, away: '1', paste: null, isAwayActive: true },
];

describe('InterviewBarComponent', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'share'));

  it('shows Share only when the browser supports it', () => {
    expect(query(setup('', true).fixture, SHARE_BUTTON)).not.toBeNull();
    expect(query(setup('', false).fixture, SHARE_BUTTON)).toBeNull();
  });

  it('starts in editing with no stored name and as a label with one', () => {
    expect(query(setup('', false).fixture, NAME_INPUT)).not.toBeNull();
    const { fixture } = setup('Alex', false);
    expect(query(fixture, NAME_INPUT)).toBeNull();
    expect(query(fixture, NAME_LABEL)?.textContent?.trim()).toBe('Alex');
    expect(query(fixture, EDIT_BUTTON)).not.toBeNull();
  });

  it('edits from the pencil, commits on Enter and turns back into a label', () => {
    const { fixture, setMyName } = setup('Alex', false);
    query(fixture, EDIT_BUTTON)!.click();
    fixture.detectChanges();
    const input = query(fixture, NAME_INPUT) as HTMLInputElement;
    input.value = 'Sam';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(setMyName).toHaveBeenCalledExactlyOnceWith('Sam');
    expect(query(fixture, NAME_INPUT)).toBeNull();
    expect(query(fixture, NAME_LABEL)?.textContent?.trim()).toBe('Sam');
  });

  it('stays in editing and stores nothing when the name is only spaces', () => {
    const { fixture, setMyName } = setup('', false);
    const input = query(fixture, NAME_INPUT) as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(setMyName).not.toHaveBeenCalled();
    expect(query(fixture, NAME_INPUT)).not.toBeNull();
  });

  it.each(ROSTER_CASES)('the roster renders N interviewer slots plus the candidate slot: $name', ({ roster, chips, inputSlot }) => {
    const { fixture } = setup('', false, { roster });
    const slots = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(SLOT));

    expect(slots.map((slot) => slot.querySelector(SLOT_CHIP)?.textContent?.trim())).toEqual(chips);
    expect(slots.map((slot) => slot.querySelector(NAME_INPUT) !== null)).toEqual(slots.map((_, index) => index === inputSlot));
  });

  it.each(MARK_CASES)('the candidate slot draws its marks: $name', ({ seat, away, paste, isAwayActive }) => {
    const { fixture } = setup('', false, { roster: [{ id: 'c', role: 'candidate', name: 'Cy', ...seat }] });

    const awayMark = query(fixture, AWAY_MARK);
    expect(awayMark?.textContent?.trim() ?? null).toBe(away);
    expect(query(fixture, PASTE_MARK)?.textContent?.trim() ?? null).toBe(paste);
    expect(awayMark?.classList.contains(ACTIVE_MARK_CLASS) ?? false).toBe(isAwayActive);
  });

  it('gives an invalid email address no href and aria-disabled, and a valid or blank one a mailto', () => {
    const { fixture } = setup('Alex', false);
    query(fixture, EMAIL_TOGGLE)!.click();
    fixture.detectChanges();
    const input = query(fixture, CANDIDATE_EMAIL_INPUT) as HTMLInputElement;
    const link = () => query(fixture, CANDIDATE_EMAIL_LINK)!;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    type('not-an-email');
    expect(link().getAttribute('href')).toBeNull();
    expect(link().getAttribute('aria-disabled')).toBe('true');

    type('sam@example.com');
    expect(link().getAttribute('href')).toMatch(/^mailto:sam%40example\.com\?/);

    type('');
    expect(link().getAttribute('href')).toMatch(/^mailto:\?/);
  });

  describe('prepared interviews', () => {
    const copy = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());

    beforeEach(() => {
      copy.mockClear();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: copy }, configurable: true });
    });
    afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

    it.each([
      { name: 'a prepared entry copies the code link', links: PREPARED_LINKS, copied: INTERVIEWER_URL },
      { name: 'no entry copies the key-only host link', links: null, copied: HOST_URL },
    ])('Copy interviewer link: $name', async ({ links, copied }) => {
      const { fixture } = setup('Alex', false, { links: [links] });
      await settle(fixture);
      query(fixture, COPY_HOST_BUTTON)!.click();
      expect(copy).toHaveBeenCalledExactlyOnceWith(copied);
    });

    it('Copy interviewer link: the candidate has no button', async () => {
      const { fixture } = setup('Cy', false, { role: 'candidate' });
      await settle(fixture);
      expect(query(fixture, COPY_HOST_BUTTON)).toBeNull();
    });

    it.each([
      { name: 'prepared carries the code link', links: PREPARED_LINKS, body: encodeURIComponent(INTERVIEWER_URL) },
      { name: 'no entry keeps the host link', links: null, body: encodeURIComponent(HOST_URL) },
    ])('Email interviewer link: $name', async ({ links, body }) => {
      const { fixture } = setup('Alex', false, { links: [links] });
      query(fixture, EMAIL_TOGGLE)!.click();
      await settle(fixture);
      const link = query(fixture, HOST_EMAIL_LINK)!;

      expect(link.getAttribute('aria-disabled')).toBeNull();
      expect(link.getAttribute('href')).toContain(body);
    });
  });
});
