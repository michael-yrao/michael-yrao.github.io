import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { RecognitionGroup } from '../../../core/practice/recognition-gate';

/** The gate's two marks: open (◇) before the pick, filled (◆) once picked. */
export const RECOGNITION_MARKS = { locked: '◇', picked: '◆' } as const;

/** The technique picker that stands in for the editor until the owner has named a technique. */
@Component({
  selector: 'app-recognition-gate',
  templateUrl: './recognition-gate.component.html',
  styleUrls: ['./recognition-gate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecognitionGateComponent {
  readonly groups = input.required<readonly RecognitionGroup[]>();
  readonly picked = output<string>();
  protected readonly mark = RECOGNITION_MARKS.locked;

  protected onChange(event: Event): void {
    this.picked.emit((event.target as HTMLSelectElement).value);
  }
}
