import { FOCUS_NOTES_MAX_LENGTH, InterviewSchedule, parseSchedule } from './interview-schedule';
import { NAME_MAX_LENGTH } from './session-message';

const SCHEDULE: InterviewSchedule = {
  problemId: 'problem-1',
  scheduledAt: 1_800_000_000_000,
  durationMin: 45,
  candidateName: 'Ada',
  candidateEmail: 'ada@example.test',
  interviewerName: 'Grace',
  notes: 'Focus on graphs.',
};

describe('parseSchedule', () => {
  it.each<{ name: string; value: unknown; expected: InterviewSchedule | null }>([
    { name: 'a valid schedule, with no extra keys carried', value: { ...SCHEDULE, extra: 'x' }, expected: SCHEDULE },
    { name: 'a missing candidate name', value: { ...SCHEDULE, candidateName: '' }, expected: null },
    { name: 'a duration below the minimum', value: { ...SCHEDULE, durationMin: 14 }, expected: null },
    { name: 'a fractional duration', value: { ...SCHEDULE, durationMin: 45.5 }, expected: null },
    { name: 'a name over the cap', value: { ...SCHEDULE, interviewerName: 'a'.repeat(NAME_MAX_LENGTH + 1) }, expected: null },
    { name: 'notes over the cap', value: { ...SCHEDULE, notes: 'a'.repeat(FOCUS_NOTES_MAX_LENGTH + 1) }, expected: null },
    { name: 'a non-finite scheduledAt', value: { ...SCHEDULE, scheduledAt: Infinity }, expected: null },
    { name: 'not an object', value: 'schedule', expected: null },
  ])('$name', ({ value, expected }) => {
    expect(parseSchedule(value)).toEqual(expected);
  });
});
