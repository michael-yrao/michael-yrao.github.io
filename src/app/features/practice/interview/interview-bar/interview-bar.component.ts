import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';

import { inviteEmailHref, inviteTitle } from '../invite-share';
import { InterviewRole, InterviewSessionService, SessionStatus } from '../interview-session.service';
import { NAME_MAX_LENGTH } from '../session-message';

const COPY_FEEDBACK_MS = 1500;

const NAME_INPUT_SELECTOR = '.interview-bar__name';

type CopyMark = 'ok' | 'fail';

interface ParticipantSlot {
  readonly role: Exclude<InterviewRole, 'none'>;
  readonly label: string;
  readonly isMine: boolean;
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
  closed: { label: 'Ended', tone: 'closed' },
  error: { label: 'Connection failed', tone: 'error' },
};

/** The header's interview controls: the Interview button, then in a session the two participant
 *  slots (role chip and name), the invite link (interviewer), the connection status and End (interviewer). */
@Component({
  selector: 'app-interview-bar',
  templateUrl: './interview-bar.component.html',
  styleUrls: ['./interview-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewBarComponent {
  protected readonly session = inject(InterviewSessionService);
  /** The Interview button was pressed; the page owns what starting a session needs. */
  readonly startRequested = output<void>();
  /** The problem's number and title, for the share title and the email subject. */
  readonly problemLabel = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly statusView = computed(() => STATUS_VIEWS[this.session.status()] ?? null);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  /** The Share button needs the browser's share sheet; absent on e.g. Firefox desktop. */
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly emailHref = computed(() => {
    const url = this.session.inviteUrl();
    return url ? inviteEmailHref(url, this.problemLabel()) : null;
  });
  /** A stored name shows as a label; no name yet starts in the editing field. */
  protected readonly isEditingName = signal(!this.session.myName());
  protected readonly copyMark = signal<CopyMark | null>(null);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Interviewer first, then candidate; the slot of this side's own role holds the name input. */
  protected readonly slots = computed<readonly ParticipantSlot[]>(() => {
    const role = this.session.role();
    return [
      { role: 'interviewer', label: 'Interviewer', isMine: role === 'interviewer' },
      { role: 'candidate', label: 'Candidate', isMine: role === 'candidate' },
    ];
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
