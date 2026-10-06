import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PublishState } from '../session/prepared-summary';

type StateTone = 'waiting' | 'open' | 'closed';

interface StateView {
  readonly label: string;
  readonly tone: StateTone;
}

/** The approved words and dot colour for each publish state. */
const STATE_VIEWS: Readonly<Record<PublishState, StateView>> = {
  published: { label: 'Published', tone: 'open' },
  pending: { label: 'Not published', tone: 'waiting' },
  local: { label: 'This browser only', tone: 'closed' },
};

/** A dot coloured by, and the words for, whether the server holds an interview. */
@Component({
  selector: 'app-publish-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="publish-state">
      <span class="publish-state__dot" [class]="'publish-state__dot--' + view().tone"></span>
      {{ view().label }}
    </span>
  `,
  styles: `
    $dot-size: 0.6rem;
    .publish-state {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
    .publish-state__dot {
      width: $dot-size;
      height: $dot-size;
      border-radius: 50%;
      background: var(--color-text-muted);
    }
    .publish-state__dot--waiting { background: var(--color-medium); }
    .publish-state__dot--open { background: var(--color-found); }
    .publish-state__dot--closed { background: var(--color-text-muted); }
  `,
})
export class PublishStateComponent {
  readonly state = input.required<PublishState>();

  protected readonly view = computed(() => STATE_VIEWS[this.state()]);
}
