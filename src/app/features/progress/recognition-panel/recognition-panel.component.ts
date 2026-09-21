import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Probes } from '../../../core/models/progress.model';

const CLEAN_HIGH = 0.85;
const CLEAN_LOW = 0.7;

/**
 * The Recognition tab: surfaces `dsa/probes/README.md`'s Probe log — cold, label-stripped,
 * disposable reps that measure whether the practiced pool still teaches recognition (a
 * clean 🟢 probe earns NO tracker row, so it's invisible everywhere else). Entirely derived
 * from the summary's `probes` (a few rows, ~1/week) — no fetch, ever.
 */
@Component({
  selector: 'app-recognition-panel',
  templateUrl: './recognition-panel.component.html',
  styleUrls: ['./recognition-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecognitionPanelComponent {
  readonly probes = input<Probes | null | undefined>();

  readonly cleanPct = computed(() => {
    const p = this.probes();
    return p ? Math.round(p.cleanRate * 100) : null;
  });

  // The README's own built-in diagnostic — framed gently either way, never as failure.
  readonly gloss = computed(() => {
    const p = this.probes();
    if (!p) return null;
    if (p.cleanRate >= CLEAN_HIGH) {
      return "The pool's getting easy — time to raise difficulty inside it, or (once Medium is also ≥85% clean) open the next tier.";
    }
    if (p.cleanRate <= CLEAN_LOW) {
      return 'Real gaps remain — keep consolidating before adding new techniques.';
    }
    return 'Holding steady — the pool is still teaching something.';
  });

  // Most recent first.
  readonly recent = computed(() => [...(this.probes()?.items ?? [])].reverse());

  leetCodeUrl(lcNumber: number): string {
    return `https://leetcode.com/problemset/?search=${lcNumber}`;
  }
}
