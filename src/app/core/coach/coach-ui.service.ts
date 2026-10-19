import { Injectable, signal } from '@angular/core';

/** Whether the coach drawer is open. `everOpened` flips once, so the panel's chunk loads on first open
 *  and the panel then stays mounted (hidden) to keep its transcript. */
@Injectable({ providedIn: 'root' })
export class CoachUiService {
  private readonly open = signal(false);
  private readonly opened = signal(false);

  readonly isOpen = this.open.asReadonly();
  readonly everOpened = this.opened.asReadonly();

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.opened.set(true);
  }
}
