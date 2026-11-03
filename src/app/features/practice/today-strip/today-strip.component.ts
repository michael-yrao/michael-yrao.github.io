import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PracticeService } from '../../../core/services/practice.service';
import { FINALE_STAGGER_MS, TodaySessionService } from '../../../core/today-session/today-session.service';

interface StripDot {
  readonly number: number;
  readonly label: string;
  readonly isDone: boolean;
  readonly isPage: boolean;
  readonly isCelebrating: boolean;
  /** The completed dot of a hand-off: it pops and its ring fades. */
  readonly isLanding: boolean;
  /** The next problem's dot of a hand-off: the ring arrives on it. */
  readonly isReceiving: boolean;
  /** The day's last problem was just completed: every dot pulses in turn. */
  readonly isFinale: boolean;
  readonly finaleDelayMs: number;
}

/** One dot per problem in today's run-through: an empty circle, or a green filled one when done, ringed on the problem being viewed. */
@Component({
  selector: 'app-today-strip',
  templateUrl: './today-strip.component.html',
  styleUrls: ['./today-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class TodayStripComponent {
  readonly number = input.required<number | null>();
  /** True while a fresh pass is celebrated: the current dot fills green and ripples. */
  readonly isCelebrating = input(false);

  private readonly session = inject(TodaySessionService);
  private readonly practice = inject(PracticeService);

  protected readonly isShown = computed(() => {
    const n = this.number();
    if (n === null) return false;
    // The finale completes every problem, so the run is no longer active; the beat keeps the strip up.
    return this.session.isRunning(n) || this.session.handoff()?.from === n;
  });

  protected readonly dots = computed<readonly StripDot[]>(() => {
    const handoff = this.session.handoff();
    return this.session.queue().map((m, index) => {
      const title = this.practice.problemFor(m)?.title;
      const isPage = m === this.number();
      return {
        number: m,
        label: title ? `#${m} ${title}` : `#${m}`,
        isDone: this.session.isDone(m),
        isPage,
        isCelebrating: isPage && this.isCelebrating(),
        isLanding: handoff?.from === m,
        isReceiving: handoff?.to === m,
        isFinale: handoff !== null && handoff.to === null,
        finaleDelayMs: index * FINALE_STAGGER_MS,
      };
    });
  });
}
