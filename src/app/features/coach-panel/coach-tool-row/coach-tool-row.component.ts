import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ToolRow, ToolStatus } from '../coach-transcript';

export const TOOL_MARKS: Readonly<Record<ToolStatus, string>> = { running: '⋯', ok: '✓', failed: '✗' };

@Component({
  selector: 'app-coach-tool-row',
  template: `<span class="mark mark--{{ tool().status }}" [attr.aria-label]="tool().status">{{ mark() }}</span>
    <span class="label">{{ tool().label }}</span>`,
  styleUrls: ['./coach-tool-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachToolRowComponent {
  readonly tool = input.required<ToolRow>();
  protected readonly mark = computed(() => TOOL_MARKS[this.tool().status]);
}
