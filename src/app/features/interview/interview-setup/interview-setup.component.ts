import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { CopyButtonComponent } from '../copy-button/copy-button.component';
import { formatCode } from '../directory/interview-code';
import { scheduleWhen } from '../interview-page/interview-format';
import { INTERVIEW_REFUSED_MESSAGE } from '../interview-messages';
import { PublishStateComponent } from '../publish-state/publish-state.component';
import type { InterviewProblem } from '../session/interview-problem';
import { DEFAULT_DURATION_MIN, DURATION_PRESETS_MIN } from '../session/interview-schedule';
import { inviteEmailHref } from '../session/invite-share';
import { PreparedInterviewsService } from '../session/prepared-interviews.service';
import { loadName, saveName } from '../session/session-support';
import { SETUP_ERROR_TEXT, defaultStart, parseSetupForm, toDateTimeLocal, type SetupInput, type SetupSchedule } from './setup-form';

interface CreatedInterview {
  readonly sessionId: string;
  readonly schedule: SetupSchedule;
}

function readFormInput(form: HTMLFormElement): SetupInput {
  const data = new FormData(form);
  const text = (name: keyof SetupInput): string => String(data.get(name) ?? '');
  return {
    when: text('when'),
    durationMin: text('durationMin'),
    candidateName: text('candidateName'),
    candidateEmail: text('candidateEmail'),
    interviewerName: text('interviewerName'),
    notes: text('notes'),
  };
}

/** The form that turns a saved problem into an interview, then shows the two codes. */
@Component({
  selector: 'app-interview-setup',
  templateUrl: './interview-setup.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CopyButtonComponent, PublishStateComponent],
})
export class InterviewSetupComponent {
  readonly problemId = input.required<string>();
  readonly problem = input.required<InterviewProblem>();
  readonly done = output<void>();

  private readonly prepared = inject(PreparedInterviewsService);

  protected readonly durations = DURATION_PRESETS_MIN;
  protected readonly defaultDuration = DEFAULT_DURATION_MIN;
  protected readonly defaultWhen = toDateTimeLocal(defaultStart(Date.now()));
  protected readonly defaultInterviewerName = loadName();
  protected readonly errors = signal<readonly string[]>([]);
  protected readonly isBusy = signal(false);

  private readonly created = signal<CreatedInterview | null>(null);

  /** What the created view shows; reads `list()` so the codes and the publish state follow the server. */
  protected readonly createdView = computed(() => {
    const created = this.created();
    if (created === null) {
      return null;
    }
    const codes = this.prepared.codesOf(created.sessionId, window.location.href);
    const { schedule } = created;
    const when = scheduleWhen(schedule);
    return {
      candidateName: schedule.candidateName,
      when,
      candidateCode: codes === null ? null : formatCode(codes.candidateCode),
      interviewerCode: codes === null ? null : formatCode(codes.interviewerCode),
      candidateUrl: codes?.candidateUrl ?? null,
      interviewerUrl: codes?.interviewerUrl ?? null,
      inviteHref: codes === null ? null : inviteEmailHref(codes.candidateUrl, this.problem().title, schedule.candidateEmail, when),
      publish: this.prepared.list().find((summary) => summary.sessionId === created.sessionId)?.publish ?? null,
    };
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const input = readFormInput(event.target as HTMLFormElement);
    const parsed = parseSetupForm(input, Date.now());
    if ('errors' in parsed) {
      this.errors.set(parsed.errors.map((error) => SETUP_ERROR_TEXT[error]));
      return;
    }
    this.errors.set([]);
    if (parsed.schedule.interviewerName !== '') {
      saveName(parsed.schedule.interviewerName);
    }
    this.isBusy.set(true);
    const sessionId = await this.prepared.prepare(this.problem(), { ...parsed.schedule, problemId: this.problemId() });
    this.isBusy.set(false);
    if (sessionId === null) {
      this.errors.set([INTERVIEW_REFUSED_MESSAGE]);
      return;
    }
    this.created.set({ sessionId, schedule: parsed.schedule });
  }
}
