import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { RoadmapLevelRow } from './roadmap-levels';

/** The Mastery tab's roadmap card: one header line and one square per technique for each level,
 *  filled when the technique is started. A tile emits `select` with its technique's name. */
@Component({
  selector: 'app-roadmap-coverage',
  templateUrl: './roadmap-coverage.component.html',
  styleUrls: ['./roadmap-coverage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapCoverageComponent {
  readonly rows = input.required<RoadmapLevelRow[]>();
  readonly select = output<string>();
}
