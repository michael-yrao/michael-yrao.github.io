import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-explanation-card',
    templateUrl: './explanation-card.component.html',
    styleUrls: ['./explanation-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExplanationCardComponent {
  readonly explanation = input('');
  readonly stepIndex = input(0);
}
