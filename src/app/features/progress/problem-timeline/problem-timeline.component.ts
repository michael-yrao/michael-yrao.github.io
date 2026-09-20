import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProblemProgress, TimelinePoint } from '../../../core/models/progress.model';

interface PlotPoint {
  x: number;
  y: number;
  date: string;
  comfort: string | null;
  known: boolean;
}

const LEVELS = 5; // 🔴0 🟡1 🟢2 🎓3 🏆4
const COMFORT_COLOR: Record<number, string> = {
  0: 'var(--color-hard)',
  1: 'var(--color-medium)',
  2: 'var(--color-easy)',
  3: 'var(--color-accent)',
  4: 'var(--color-accent)',
};

/**
 * A small inline-SVG step chart of one problem's comfort over its rep timeline — the
 * learner's explicit ask ("graphs that show progression of each problem"). Comfort is an
 * ordinal (🔴→🏆); a rep with no known comfort (predating the schedule archive) is drawn
 * as a hollow activity dot on the baseline, never as a fabricated value. Colours are CSS
 * variables, so it reads correctly in both themes.
 */
@Component({
  selector: 'app-problem-timeline',
  templateUrl: './problem-timeline.component.html',
  styleUrls: ['./problem-timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemTimelineComponent {
  readonly problem = input.required<ProblemProgress>();

  // Fixed viewBox; the SVG scales responsively to its container width.
  readonly W = 320;
  readonly H = 96;
  readonly padX = 14;
  readonly padY = 14;

  readonly points = computed<PlotPoint[]>(() => {
    const tl = this.problem().timeline;
    if (!tl.length) return [];
    const n = tl.length;
    const usableW = this.W - this.padX * 2;
    const usableH = this.H - this.padY * 2;
    return tl.map((pt: TimelinePoint, i: number) => {
      const x = this.padX + (n === 1 ? usableW / 2 : (usableW * i) / (n - 1));
      const level = pt.level;
      const known = level !== null && level !== undefined;
      const y = known
        ? this.padY + usableH - (usableH * (level as number)) / (LEVELS - 1)
        : this.H - this.padY; // unknown -> baseline activity dot
      return { x, y, date: pt.date, comfort: pt.comfort, known };
    });
  });

  // The connecting line only joins KNOWN points, so gaps in reconstructed history read as
  // gaps, not as a line dipping to zero.
  readonly linePath = computed(() => {
    const known = this.points().filter((p) => p.known);
    if (known.length < 2) return '';
    return known.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });

  colorFor(p: PlotPoint): string {
    const tl = this.problem().timeline.find((t) => t.date === p.date);
    const lvl = tl?.level;
    return lvl !== null && lvl !== undefined ? COMFORT_COLOR[lvl] : 'var(--color-text-muted)';
  }
}
