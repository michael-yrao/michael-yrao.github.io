import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CopyButtonComponent } from '../copy-button/copy-button.component';
import { formatScheduledAt, scheduleWhen } from '../interview-page/interview-format';
import { OFFLINE_MESSAGE } from '../interview-messages';
import { PublishStateComponent } from '../publish-state/publish-state.component';
import { listDebriefs } from '../session/store/debrief-store';
import { InterviewSessionService } from '../session/interview-session.service';
import { inviteEmailHref } from '../session/invite-share';
import { PreparedInterviewsService } from '../session/prepared-interviews.service';
import type { PreparedCodes, PreparedSummary } from '../session/prepared-summary';
import { upcomingInterviews } from './interview-rows';

const DELETE_CONFIRM = 'Delete this interview? Its codes will stop working.';
const NOT_SCHEDULED = 'Not scheduled';
const NO_CANDIDATE = 'No candidate';

/** One interview as the card shows it. */
interface InterviewRow {
  readonly summary: PreparedSummary;
  readonly codes: PreparedCodes | null;
  readonly when: string;
  readonly candidate: string;
  readonly inviteHref: string | null;
}

function toRow(summary: PreparedSummary, codes: PreparedCodes | null): InterviewRow {
  const { schedule } = summary;
  return {
    summary,
    codes,
    when: schedule ? formatScheduledAt(schedule.scheduledAt) : NOT_SCHEDULED,
    candidate: schedule?.candidateName || NO_CANDIDATE,
    inviteHref: codes
      ? inviteEmailHref(codes.candidateUrl, summary.title, schedule?.candidateEmail ?? '', schedule ? scheduleWhen(schedule) : '')
      : null,
  };
}

/** The landing's list of interviews still to run, each with its links, Open and Delete. */
@Component({
  selector: 'app-interviews-card',
  templateUrl: './interviews-card.component.html',
  styleUrls: ['./interviews-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CopyButtonComponent, PublishStateComponent],
})
export class InterviewsCardComponent {
  private readonly prepared = inject(PreparedInterviewsService);
  private readonly session = inject(InterviewSessionService);
  private readonly debriefedIds: ReadonlySet<string> = new Set(listDebriefs().map((debrief) => debrief.sessionId));

  protected readonly message = signal<string | null>(null);
  protected readonly rows = computed<readonly InterviewRow[]>(() =>
    upcomingInterviews(this.prepared.list(), this.debriefedIds).map((summary) =>
      toRow(summary, this.prepared.codesOf(summary.sessionId, window.location.href)),
    ),
  );

  constructor() {
    this.prepared.retryUnpublished().catch((err: unknown) => console.error('Interviews: retrying unpublished failed', err));
  }

  protected open(sessionId: string): void {
    const packed = this.prepared.packedOf(sessionId);
    if (packed === null) {
      console.error('Interviews: no stored key for the interview to open');
      return;
    }
    this.session.resume(packed).catch((err: unknown) => console.error('Interviews: resume failed', err));
  }

  protected async remove(sessionId: string): Promise<void> {
    if (!window.confirm(DELETE_CONFIRM)) {
      return;
    }
    const isRemoved = await this.prepared.remove(sessionId);
    this.message.set(isRemoved ? null : OFFLINE_MESSAGE);
  }
}
