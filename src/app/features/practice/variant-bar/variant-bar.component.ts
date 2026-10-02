import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WalkthroughStateService } from '../walkthrough-state.service';

/** The variant chips with the selected variant's own time and space bound beside them. Sits at
 *  the top of the Visualizer and Code tabs; a lone variant shows only its bound. */
@Component({
  selector: 'app-variant-bar',
  templateUrl: './variant-bar.component.html',
  styleUrls: ['./variant-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantBarComponent {
  protected readonly state = inject(WalkthroughStateService);
}
