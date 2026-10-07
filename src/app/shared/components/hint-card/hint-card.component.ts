import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-hint-card',
    templateUrl: './hint-card.component.html',
    styleUrls: ['./hint-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HintCardComponent {
  readonly hint = input('');
  revealed = false;

  toggle(): void {
    this.revealed = !this.revealed;
  }
}
