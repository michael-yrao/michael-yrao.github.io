import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, input, signal } from '@angular/core';

import { hostEmailHref, inviteEmailHref, inviteTitle } from '../invite-share';
import { InterviewSessionService, SessionStatus } from '../interview-session.service';
import { CandidateSeat, NAME_MAX_LENGTH, NO_MARKS } from '../session-message';

const COPY_FEEDBACK_MS = 1500;

const NAME_INPUT_SELECTOR = '.interview-bar__name';
const EMAIL_STORAGE_KEY = 'po-interview-email';

type CopyMark = 'ok' | 'fail';

interface ParticipantSlot extends CandidateSeat {
  /** The participant's id, or a fixed key for a slot nobody holds yet. */
  readonly key: string;
  readonly label: 'Interviewer' | 'Candidate';
  readonly isMine: boolean;
  readonly name: string;
}

const EMPTY_INTERVIEWER_KEY = 'interviewer';
const EMPTY_CANDIDATE_KEY = 'candidate';

function loadEmail(): string {
  try {
    return localStorage.getItem(EMAIL_STORAGE_KEY)?.trim() ?? '';
  } catch (err) {
    console.error(`Interview email: could not read ${EMAIL_STORAGE_KEY}`, err);
    return '';
  }
}

function saveEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch (err) {
    console.error(`Interview email: could not save ${EMAIL_STORAGE_KEY}`, err);
  }
}

type StatusTone = 'waiting' | 'open' | 'closed' | 'error';

interface StatusView {
  readonly label: string;
  readonly tone: StatusTone;
}

/** The approved words for each connection status. `idle` has no entry: no label, no dot. */
const STATUS_VIEWS: Readonly<Partial<Record<SessionStatus, StatusView>>> = {
  connecting: { label: 'Waiting', tone: 'waiting' },
  waiting: { label: 'Waiting', tone: 'waiting' },
  open: { label: 'Connected', tone: 'open' },
  reconnecting: { label: 'Reconnecting', tone: 'waiting' },
  closed: { label: 'Ended', tone: 'closed' },
  error: { label: 'Connection failed', tone: 'error' },
};

/** The header's interview controls, shown in a session: the participant slots (role chip and name),
 *  the invite link (interviewer), the connection status and End (interviewer). */
@Component({
  selector: 'app-interview-bar',
  templateUrl: './interview-bar.component.html',
  styleUrls: ['./interview-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewBarComponent {
  protected readonly session = inject(InterviewSessionService);
  /** The problem's title, for the share title and the email subject. */
  readonly problemLabel = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly statusView = computed(() => STATUS_VIEWS[this.session.status()] ?? null);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  /** The Share button needs the browser's share sheet; absent on e.g. Firefox desktop. */
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly isEmailPanelOpen = signal(false);
  protected readonly candidateEmail = signal('');
  protected readonly isCandidateEmailValid = signal(true);
  protected readonly hostEmail = signal(loadEmail());
  protected readonly isHostEmailValid = signal(true);
  /** Null (no href) while the typed address is invalid. */
  protected readonly candidateEmailHref = computed(() => {
    const url = this.session.inviteUrl();
    if (!url || !this.isCandidateEmailValid()) return null;
    return inviteEmailHref(url, this.problemLabel(), this.candidateEmail());
  });
  protected readonly hostEmailLink = computed(() => {
    const hostUrl = this.session.hostUrl();
    const inviteUrl = this.session.inviteUrl();
    if (!hostUrl || !inviteUrl || !this.isHostEmailValid()) return null;
    return hostEmailHref(hostUrl, inviteUrl, this.problemLabel(), this.hostEmail());
  });
  /** A stored name shows as a label; no name yet starts in the editing field. */
  protected readonly isEditingName = signal(!this.session.myName());
  protected readonly copyMark = signal<CopyMark | null>(null);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * One slot per interviewer in the roster, then the candidate. The slot whose participant is this tab
   * holds the name input. Before the roster arrives it is this tab's own slot plus the other role's.
   */
  protected readonly slots = computed<readonly ParticipantSlot[]>(() => {
    const roster = this.session.roster();
    const selfId = this.session.selfId;
    const role = this.session.role();
    const interviewers = roster.filter((participant) => participant.role === 'interviewer');
    const candidate = roster.find((participant) => participant.role === 'candidate');
    const interviewerSlots: readonly ParticipantSlot[] =
      interviewers.length > 0
        ? interviewers.map((participant) => ({
            key: participant.id,
            label: 'Interviewer',
            isMine: participant.id === selfId,
            name: participant.name,
            ...NO_MARKS,
          }))
        : [{ key: EMPTY_INTERVIEWER_KEY, label: 'Interviewer', isMine: role === 'interviewer', name: '', ...NO_MARKS }];
    const candidateSlot: ParticipantSlot = {
      key: candidate?.id ?? EMPTY_CANDIDATE_KEY,
      label: 'Candidate',
      isMine: candidate === undefined ? role === 'candidate' : candidate.id === selfId,
      name: candidate?.name ?? '',
      isAway: candidate?.isAway ?? NO_MARKS.isAway,
      awayCount: candidate?.awayCount ?? NO_MARKS.awayCount,
      pasteCount: candidate?.pasteCount ?? NO_MARKS.pasteCount,
    };
    return [...interviewerSlots, candidateSlot];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
    });
  }

  /** Enter or blur: stores the name and shows the label; an empty name stays in the field. */
  protected commitName(event: Event): void {
    if (!this.isEditingName()) return;
    const value = (event.target as HTMLInputElement).value;
    if (!value.trim()) return;
    this.session.setMyName(value);
    this.isEditingName.set(false);
  }

  /** Escape: puts the last stored name back and shows the label, if there is a name. */
  protected cancelNameEdit(event: Event): void {
    (event.target as HTMLInputElement).value = this.session.myName();
    if (this.session.myName()) this.isEditingName.set(false);
  }

  /** Ends the session for everyone; the service resets and drops `?host=` from the address. */
  protected endSession(): void {
    this.session.end();
  }

  protected toggleEmailPanel(): void {
    this.isEmailPanelOpen.update((isOpen) => !isOpen);
  }

  protected onCandidateEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.candidateEmail.set(input.value);
    this.isCandidateEmailValid.set(input.validity.valid);
  }

  protected onHostEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.hostEmail.set(input.value);
    this.isHostEmailValid.set(input.validity.valid);
  }

  /** Remembers the interviewer's address once the field settles on a valid value. */
  protected saveHostEmail(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.validity.valid) saveEmail(input.value.trim());
  }

  protected startNameEdit(): void {
    this.isEditingName.set(true);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLInputElement>(NAME_INPUT_SELECTOR)?.select(),
      { injector: this.injector },
    );
  }

  protected shareInvite(): void {
    const url = this.session.inviteUrl();
    if (!url) return;
    navigator.share({ title: inviteTitle(this.problemLabel()), url }).catch((err: unknown) => {
      // AbortError: the person closed the share menu.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Interview share: navigator.share failed', err);
      this.showCopyMark('fail');
    });
  }

  protected copyInvite(): void {
    const url = this.session.inviteUrl();
    if (!url) return;
    // `navigator.clipboard` is undefined in an insecure context or an unsupported browser.
    if (!navigator.clipboard) {
      console.error('Interview copy: navigator.clipboard is unavailable');
      this.showCopyMark('fail');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => this.showCopyMark('ok'),
      (err: unknown) => {
        console.error('Interview copy: clipboard write failed', err);
        this.showCopyMark('fail');
      },
    );
  }

  private showCopyMark(mark: CopyMark): void {
    this.copyMark.set(mark);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copyMark.set(null), COPY_FEEDBACK_MS);
  }
}
