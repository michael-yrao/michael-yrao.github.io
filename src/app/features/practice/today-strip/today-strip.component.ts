import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PracticeService } from '../../../core/services/practice.service';
import { TodaySessionService } from '../../../core/today-session/today-session.service';

interface StripDot {
  readonly number: number;
  readonly label: string;
  readonly isDone: boolean;
  readonly isPage: boolean;
}

/** One dot per problem in today's run-through: an empty circle, or a green filled one when done. */
@Component({
  selector: 'app-today-strip',
  templateUrl: './today-strip.component.html',
  styleUrls: ['./today-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class TodayStripComponent {
  readonly number = input.required<number | null>();

  private readonly session = inject(TodaySessionService);
  private readonly practice = inject(PracticeService);

  protected readonly isShown = computed(() => {
    const n = this.number();
    return n !== null && this.session.isRunning(n);
  });

  protected readonly dots = computed<readonly StripDot[]>(() =>
    this.session.queue().map((m) => {
      const title = this.practice.problemFor(m)?.title;
      return {
        number: m,
        label: title ? `#${m} ${title}` : `#${m}`,
        isDone: this.session.isDone(m),
        isPage: m === this.number(),
      };
    }),
  );
}
