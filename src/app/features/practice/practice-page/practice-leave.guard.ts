import type { CanDeactivateFn } from '@angular/router';

/** What the guard needs from the practice page; a type of its own keeps the page out of the initial bundle. */
export interface LeaveConfirming {
  confirmLeave(): boolean | Promise<boolean>;
}

/** Leaving the practice page asks first while a passing run has no complete or provisional save. */
export const practiceLeaveGuard: CanDeactivateFn<LeaveConfirming> = (page) => page.confirmLeave();
