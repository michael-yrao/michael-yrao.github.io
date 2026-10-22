import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { RecognitionGroup } from '../../../core/practice/recognition-gate';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icon-paths';

/** The gate's two icons: an open circle before the pick, a check once picked. */
export const RECOGNITION_ICONS: Record<'locked' | 'picked', IconName> = { locked: 'circle', picked: 'check' };

/** The technique picker that stands in for the editor until the owner has named a technique. */
@Component({
  selector: 'app-recognition-gate',
  templateUrl: './recognition-gate.component.html',
  styleUrls: ['./recognition-gate.component.scss'],
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecognitionGateComponent {
  readonly groups = input.required<readonly RecognitionGroup[]>();
  readonly picked = output<string>();

  protected onChange(event: Event): void {
    this.picked.emit((event.target as HTMLSelectElement).value);
  }
}
