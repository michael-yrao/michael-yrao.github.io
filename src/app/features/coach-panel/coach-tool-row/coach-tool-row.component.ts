import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icon-paths';
import type { ToolRow, ToolStatus } from '../coach-transcript';

export const TOOL_ICONS: Readonly<Record<ToolStatus, IconName>> = { running: 'clock', ok: 'check', failed: 'x' };

@Component({
  selector: 'app-coach-tool-row',
  template: `<span class="mark mark--{{ tool().status }}" [attr.aria-label]="tool().status"
      ><app-icon [name]="icon()" [size]="12"
    /></span>
    <span class="label">{{ tool().label }}</span>`,
  styleUrls: ['./coach-tool-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
})
export class CoachToolRowComponent {
  readonly tool = input.required<ToolRow>();
  protected readonly icon = computed(() => TOOL_ICONS[this.tool().status]);
}
