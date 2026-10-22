import { Component, input, ChangeDetectionStrategy } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
    selector: 'app-hint-card',
    templateUrl: './hint-card.component.html',
    styleUrls: ['./hint-card.component.scss'],
    imports: [IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HintCardComponent {
  readonly hint = input('');
  revealed = false;

  toggle(): void {
    this.revealed = !this.revealed;
  }
}
