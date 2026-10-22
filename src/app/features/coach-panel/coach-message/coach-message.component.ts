import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import type { IconName } from '../../../shared/components/icon/icon-paths';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CoachToolRowComponent } from '../coach-tool-row/coach-tool-row.component';
import type { CoachTurn } from '../coach-transcript';
import { renderMarkdown } from '../markdown';

const TURN_ICONS: Readonly<Record<'interrupted' | 'max-turns' | 'error', IconName>> = {
  interrupted: 'square',
  'max-turns': 'pause',
  error: 'x',
};

/** One exchange: the learner's message, the turn's tool rows (one collapsed row once finished) and the coach's reply. */
@Component({
  selector: 'app-coach-message',
  templateUrl: './coach-message.component.html',
  styleUrls: ['./coach-message.component.scss'],
  // The reply is injected HTML, which scoped styles cannot reach; every rule is prefixed `.coach-msg`.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoachToolRowComponent, IconComponent],
})
export class CoachMessageComponent {
  readonly turn = input.required<CoachTurn>();

  private readonly sanitizer = inject(DomSanitizer);

  /** The only `bypassSecurityTrustHtml` in the panel; `renderMarkdown` has already run DOMPurify. */
  protected readonly replyHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.turn().text)),
  );
  protected readonly isStreaming = computed(() => this.turn().status === 'streaming');
  protected readonly hasFailedTool = computed(() => this.turn().tools.some((t) => t.status === 'failed'));
  protected readonly endIcon = computed(() => {
    const status = this.turn().status;
    return status === 'interrupted' || status === 'max-turns' || status === 'error' ? TURN_ICONS[status] : null;
  });
}
