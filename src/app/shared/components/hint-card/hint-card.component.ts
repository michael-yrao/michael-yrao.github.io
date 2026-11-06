import { Component, input, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../icon/icon.component';

@Component({
    selector: 'app-hint-card',
    templateUrl: './hint-card.component.html',
    styleUrls: ['./hint-card.component.scss'],
    imports: [IconComponent, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HintCardComponent {
  readonly hint = input('');
  /** Where the revealed hint's Solution link goes; null (the default) shows none. */
  readonly solutionLink = input<readonly (string | number)[] | null>(null);
  readonly revealed = signal(false);

  toggle(): void {
    this.revealed.update((isRevealed) => !isRevealed);
  }
}
