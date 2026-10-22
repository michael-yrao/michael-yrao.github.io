import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICON_FILLED, ICON_PATHS, IconName } from './icon-paths';

const DEFAULT_SIZE_PX = 16;

/**
 * A 24-grid line icon drawn in `currentColor`. `label` doubles as the a11y toggle,
 * as in `logo-mark`: the default `''` is decorative (`aria-hidden`); any text labels it.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(DEFAULT_SIZE_PX);
  readonly label = input('');

  protected readonly d = computed(() => ICON_PATHS[this.name()]);
  protected readonly filledD = computed(() => ICON_FILLED[this.name()]);
  protected readonly isDecorative = computed(() => this.label() === '');
}
