import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';

import { InterviewRole, InterviewSessionService, SessionStatus } from '../interview-session.service';
import { NAME_MAX_LENGTH } from '../session-message';

const COPY_FEEDBACK_MS = 1500;

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

  protected readonly statusView = computed(() => STATUS_VIEWS[this.session.status()] ?? null);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
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

  protected onNameInput(event: Event): void {
    this.session.setMyName((event.target as HTMLInputElement).value);
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
