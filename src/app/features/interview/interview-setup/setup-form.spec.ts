import { DEFAULT_DURATION_MIN } from '../session/interview-schedule';
import { SCHEDULE_MAX_AHEAD_DAYS, parseSetupForm, toDateTimeLocal, type SetupInput } from './setup-form';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const NOW = new Date(2026, 9, 5, 12, 0).getTime();
const TOMORROW_AT_THREE_THIRTY = '2026-10-06T15:30';
const ONE_OVER_MAX_DAYS = SCHEDULE_MAX_AHEAD_DAYS + 1;

const at = (offsetMs: number): string => toDateTimeLocal(NOW + offsetMs);

const VALID: SetupInput = {
  when: TOMORROW_AT_THREE_THIRTY,
  durationMin: '60',
  candidateName: 'Sam',
  candidateEmail: '',
  interviewerName: '',
  notes: '',
};

const CASES: readonly { readonly name: string; readonly input: SetupInput; readonly expected: unknown }[] = [
  {
    name: 'a valid form is trimmed, read as local time, and an unknown duration falls back to the default',
    input: { ...VALID, durationMin: '50', candidateName: '  Sam  ', candidateEmail: ' sam@example.com ', interviewerName: ' Alex ', notes: ' arrays ' },
    expected: {
      schedule: {
        scheduledAt: new Date(2026, 9, 6, 15, 30).getTime(),
        durationMin: DEFAULT_DURATION_MIN,
        candidateName: 'Sam',
        candidateEmail: 'sam@example.com',
        interviewerName: 'Alex',
        notes: 'arrays',
      },
    },
  },
  { name: 'an empty time is missing', input: { ...VALID, when: '' }, expected: { errors: ['when-missing'] } },
  { name: 'a time that is not a real date is missing', input: { ...VALID, when: '2026-13-40T25:00' }, expected: { errors: ['when-missing'] } },
  { name: '6 minutes ago is past', input: { ...VALID, when: at(-6 * MS_PER_MINUTE) }, expected: { errors: ['when-past'] } },
  { name: '4 minutes ago is accepted', input: { ...VALID, when: at(-4 * MS_PER_MINUTE) }, expected: { schedule: expect.objectContaining({ candidateName: 'Sam' }) } },
  { name: '91 days ahead is too far', input: { ...VALID, when: at(ONE_OVER_MAX_DAYS * MS_PER_DAY) }, expected: { errors: ['when-too-far'] } },
  { name: 'a spaces-only candidate name is missing', input: { ...VALID, candidateName: '   ' }, expected: { errors: ['candidate-name-missing'] } },
  { name: 'an email without a dot after the @ is invalid', input: { ...VALID, candidateEmail: 'a@b' }, expected: { errors: ['email-invalid'] } },
  {
    name: 'every error is returned at once, in field order',
    input: { ...VALID, when: '', candidateName: '', candidateEmail: 'a@b' },
    expected: { errors: ['when-missing', 'candidate-name-missing', 'email-invalid'] },
  },
];

describe('parseSetupForm', () => {
  it.each(CASES)('$name', ({ input, expected }) => {
    expect(parseSetupForm(input, NOW)).toEqual(expected);
  });
});
