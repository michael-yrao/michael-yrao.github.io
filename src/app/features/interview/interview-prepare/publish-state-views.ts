import type { PublishState } from '../session/prepared-interviews.service';

export type StateTone = 'waiting' | 'open' | 'closed';

export interface StateView {
  readonly label: string;
  readonly tone: StateTone;
}

/** The approved words and dot colour for each publish state. */
export const STATE_VIEWS: Readonly<Record<PublishState, StateView>> = {
  published: { label: 'Published', tone: 'open' },
  pending: { label: 'Not published', tone: 'waiting' },
  local: { label: 'This browser only', tone: 'closed' },
};
