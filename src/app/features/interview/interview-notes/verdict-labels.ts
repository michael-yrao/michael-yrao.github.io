import type { Verdict } from '../session/debrief';

/** The on-screen word for each verdict. */
export const VERDICT_LABELS: Readonly<Record<Verdict, string>> = {
  pass: 'Pass',
  partial: 'Partial',
  fail: 'Fail',
};
