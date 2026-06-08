import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-explanation-card',
  templateUrl: './explanation-card.component.html',
  styleUrls: ['./explanation-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeSlide', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(-4px)' }),
        animate('180ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ExplanationCardComponent {
  @Input() explanation = '';
  @Input() stepIndex = 0;
}
