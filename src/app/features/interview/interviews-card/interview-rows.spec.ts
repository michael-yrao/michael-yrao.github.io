import type { InterviewSchedule } from '../session/interview-schedule';
import type { PreparedSummary } from '../session/prepared-summary';
import { upcomingInterviews } from './interview-rows';

const scheduleAt = (scheduledAt: number): InterviewSchedule => ({
  problemId: 'p',
  scheduledAt,
  durationMin: 45,
  candidateName: 'Ada',
  candidateEmail: '',
  interviewerName: 'Me',
  notes: '',
});

const summary = (sessionId: string, createdAt: number, scheduledAt: number | null): PreparedSummary => ({
  sessionId,
  title: sessionId,
  createdAt,
  publish: 'published',
  schedule: scheduledAt === null ? null : scheduleAt(scheduledAt),
});

const CASES: readonly {
  readonly name: string;
  readonly input: readonly PreparedSummary[];
  readonly debriefed: readonly string[];
  readonly order: readonly string[];
}[] = [
  {
    name: 'scheduled sorted soonest first',
    input: [summary('late', 1, 300), summary('soon', 2, 100), summary('mid', 3, 200)],
    debriefed: [],
    order: ['soon', 'mid', 'late'],
  },
  {
    name: 'unscheduled after scheduled, newest created first',
    input: [summary('old', 10, null), summary('sched', 1, 500), summary('new', 20, null)],
    debriefed: [],
    order: ['sched', 'new', 'old'],
  },
  {
    name: 'debriefed ids hidden',
    input: [summary('done', 1, 100), summary('open', 2, 200)],
    debriefed: ['done'],
    order: ['open'],
  },
];

describe('upcomingInterviews', () => {
  it.each(CASES)('$name', ({ input, debriefed, order }) => {
    const before = input.map((item) => item.sessionId);

    const rows = upcomingInterviews(input, new Set(debriefed));

    expect(rows.map((row) => row.sessionId)).toEqual(order);
    expect(input.map((item) => item.sessionId)).toEqual(before);
  });
});
