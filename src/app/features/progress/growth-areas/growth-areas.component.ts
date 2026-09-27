import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { COMING_SOON_AREAS, ComingSoonArea } from './growth-areas.data';

/** The live DSA stats the Overview's "Growth areas" section shows on its one live card —
 *  everything the parent already has loaded on `data()` (see `dsaGrowthStats` in
 *  progress-page.component.ts), so this component never fetches on its own. `coverage` is
 *  null when the summary carries none (an older contract, or none parsed). */
export interface DsaGrowthStats {
  readonly streakDays: number;
  readonly problemsMastered: number;
  readonly coverage: { readonly started: number; readonly total: number } | null;
}

/**
 * The Overview tab's "Growth areas" section (item 6): three cards stating the site's whole
 * intended scope, not just what's tracked today — Data Structures & Algorithms (live, backed
 * by `dsaStats`), System Design and AI Engineering (both static "coming soon" previews from
 * `growth-areas.data.ts`). Only the DSA card is interactive; a coming-soon card has no button
 * and no focus stop — there's nothing to open yet.
 */
@Component({
  selector: 'app-growth-areas',
  templateUrl: './growth-areas.component.html',
  styleUrls: ['./growth-areas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrowthAreasComponent {
  readonly dsaStats = input.required<DsaGrowthStats>();
  readonly open = output<void>();

  readonly comingSoonAreas: readonly ComingSoonArea[] = COMING_SOON_AREAS;

  onOpen(): void {
    this.open.emit();
  }
}
