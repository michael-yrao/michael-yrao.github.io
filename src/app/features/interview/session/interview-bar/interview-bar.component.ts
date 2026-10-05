import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, untracked, type WritableSignal } from '@angular/core';

import { COPY_FEEDBACK_MS, copyText, type CopyMark } from '../../copy-text';
import { HOST_PARAM } from '../interview-params';
import { hostEmailHref, inviteEmailHref, inviteTitle } from '../invite-share';
import { InterviewSessionService, SessionStatus } from '../interview-session.service';
import { PreparedInterviewsService, type PreparedLinks } from '../prepared-interviews.service';
import { CandidateSeat, NAME_MAX_LENGTH, NO_MARKS } from '../session-message';

const NAME_INPUT_SELECTOR = '.interview-bar__name';
const EMAIL_STORAGE_KEY = 'po-interview-email';

/** What this browser holds for the session's key: still loading, no entry, or the entry's links. */
type PreparedState =
  | { readonly status: 'loading' }
  | { readonly status: 'none' }
  | { readonly status: 'prepared'; readonly links: PreparedLinks };

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
    const url = this.candidateLink();
    if (!url || !this.isCandidateEmailValid()) return null;
    return inviteEmailHref(url, this.problemLabel(), this.candidateEmail());
  });
  private readonly prepared = inject(PreparedInterviewsService);
  private readonly preparedState = signal<PreparedState>({ status: 'loading' });
  /** The prepared candidate code link, else the key-only join link. */
  protected readonly candidateLink = computed(() => {
    const state = this.preparedState();
    return state.status === 'prepared' ? state.links.candidateUrl : this.session.inviteUrl();
  });
  /** The prepared interviewer code link, else the key-only one; null while the prepared links load. */
  protected readonly interviewerLink = computed(() => {
    const state = this.preparedState();
    if (state.status === 'loading') return null;
    return state.status === 'prepared' ? state.links.interviewerUrl : this.session.hostUrl();
  });
  /** Null (no href) while the address is invalid. */
  protected readonly hostEmailLink = computed(() => {
    const interviewerLink = this.interviewerLink();
    const candidateLink = this.candidateLink();
    if (!interviewerLink || !candidateLink || !this.isHostEmailValid()) return null;
    return hostEmailHref(interviewerLink, candidateLink, this.problemLabel(), this.hostEmail());
  });
  /** A stored name shows as a label; no name yet starts in the editing field. */
  protected readonly isEditingName = signal(!this.session.myName());
  protected readonly copyMark = signal<CopyMark | null>(null);
  protected readonly hostCopyMark = signal<CopyMark | null>(null);
  private readonly markTimers = new Map<WritableSignal<CopyMark | null>, ReturnType<typeof setTimeout>>();
  /** Counts the loads, so a slow answer for an earlier problem is ignored. */
  private loadCount = 0;
  /** The key of the last resolved state; undefined until a load resolves. */
  private resolvedKey: { readonly packed: string | undefined } | undefined;

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
    inject(DestroyRef).onDestroy(() => this.markTimers.forEach((timer) => clearTimeout(timer)));
    effect(() => {
      // The code links do not change with the problem: reload only for a new key or a changed entry.
      this.prepared.list();
      const packed = this.session.linkParams()[HOST_PARAM];
      untracked(() => void this.loadPreparedLinks(packed));
    });
  }

  /** Reads the prepared links for the session's key; only the newest load may set the state. */
  private async loadPreparedLinks(packed: string | undefined): Promise<void> {
    const load = ++this.loadCount;
    if (this.resolvedKey === undefined || this.resolvedKey.packed !== packed) {
      this.preparedState.set({ status: 'loading' });
    }
    let links: PreparedLinks | null = null;
    try {
      links = packed === undefined ? null : await this.prepared.linksForKey(packed, window.location.href);
    } catch (error) {
      console.error('Interview bar: could not load the prepared interview links', error);
    }
    if (load !== this.loadCount) return;
    this.resolvedKey = { packed };
    this.preparedState.set(links ? { status: 'prepared', links } : { status: 'none' });
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
    const url = this.candidateLink();
    if (!url) return;
    navigator.share({ title: inviteTitle(this.problemLabel()), url }).catch((err: unknown) => {
      // AbortError: the person closed the share menu.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Interview share: navigator.share failed', err);
      this.showCopyMark('fail');
    });
  }

  protected copyInvite(): void {
    const url = this.candidateLink();
    if (!url) return;
    copyText(url).then((isCopied) => this.showCopyMark(isCopied ? 'ok' : 'fail'));
  }

  /** Copies the held interviewer link; the click calls `copyText` with no await before it. */
  protected copyInterviewerLink(): void {
    const link = this.interviewerLink();
    if (!link) return;
    copyText(link).then((isCopied) => this.showCopyMark(isCopied ? 'ok' : 'fail', this.hostCopyMark));
  }

  private showCopyMark(mark: CopyMark, target: WritableSignal<CopyMark | null> = this.copyMark): void {
    target.set(mark);
    const timer = this.markTimers.get(target);
    if (timer) clearTimeout(timer);
    this.markTimers.set(target, setTimeout(() => target.set(null), COPY_FEEDBACK_MS));
  }
}
