import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { SolutionLinkMode } from '../solution-link-mode';
import { SolutionLinkModeService } from '../solution-link-mode.service';

/** The header's ⚙ Settings panel — the ONE Solution Links mode, shared by every problem list
 *  on the page (Overview schedule, Mastery's technique list, the Problems tab). Escape closes
 *  it from either the button or the panel; a click anywhere outside this component's host
 *  also closes it (document-level listener below). */
@Component({
  selector: 'app-settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeSettings()',
  },
})
export class SettingsMenuComponent {
  protected readonly linkModeService = inject(SolutionLinkModeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly isSettingsOpen = signal(false);

  toggleSettings(): void {
    this.isSettingsOpen.update((open) => !open);
  }

  /** Escape closes the Settings panel — wired via host metadata so it fires whether focus is
   *  on the toggle button or inside the panel itself. */
  closeSettings(): void {
    this.isSettingsOpen.set(false);
  }

  /** Choosing an option sets the mode and leaves the panel open. */
  chooseLinkMode(mode: SolutionLinkMode): void {
    this.linkModeService.set(mode);
  }

  /** A click anywhere outside this component's host element closes the panel — a no-op when
   *  it's already closed, and a no-op for a click on the button or inside the panel itself
   *  (both are inside the host, so `contains` is true and this path never fires for them). */
  onDocumentClick(event: Event): void {
    if (!this.isSettingsOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeSettings();
    }
  }
}
