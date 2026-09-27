import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { GROWTH_AREAS, GrowthArea } from './growth-areas.data';

/**
 * The Overview tab's growth-area toggle: a slim segmented control (DSA / System Design / AI
 * Engineering) sitting above the tab's own content. The page owns which area is selected and
 * what renders for it (the Schedule card for DSA, a coming-soon paragraph otherwise) — this
 * component only renders the three buttons and emits a selection.
 */
@Component({
  selector: 'app-growth-areas',
  templateUrl: './growth-areas.component.html',
  styleUrls: ['./growth-areas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrowthAreasComponent {
  readonly selected = input<GrowthArea>('dsa');
  readonly select = output<GrowthArea>();

  readonly areas = GROWTH_AREAS;

  onSelect(area: GrowthArea): void {
    this.select.emit(area);
  }
}
