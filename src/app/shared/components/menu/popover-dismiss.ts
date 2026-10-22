import { DestroyRef, ElementRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';

export interface PopoverDismissOptions {
  host: ElementRef<HTMLElement>;
  isOpen: () => boolean;
  /** `shouldRefocus` is true when the user pressed Escape, so focus should return to the trigger. */
  dismiss: (shouldRefocus: boolean) => void;
}

/**
 * Dismisses an open popover on a click outside `host`, on Escape, and on a navigation. Call from a
 * constructor (it injects); the listeners are removed when the owner is destroyed.
 */
export function bindPopoverDismiss(options: PopoverDismissOptions): void {
  const { host, isOpen, dismiss } = options;
  const doc = inject(DOCUMENT);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  const onClick = (event: MouseEvent): void => {
    // composedPath is fixed at dispatch, so a click on an element the popover has since removed still counts as inside.
    if (isOpen() && !event.composedPath().includes(host.nativeElement)) dismiss(false);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isOpen()) dismiss(true);
  };
  doc.addEventListener('click', onClick);
  doc.addEventListener('keydown', onKeydown);
  const navigation = router.events.subscribe((event) => {
    if (event instanceof NavigationStart && isOpen()) dismiss(false);
  });

  destroyRef.onDestroy(() => {
    doc.removeEventListener('click', onClick);
    doc.removeEventListener('keydown', onKeydown);
    navigation.unsubscribe();
  });
}
