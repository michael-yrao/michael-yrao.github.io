import { Component, ChangeDetectionStrategy, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NavContextService } from './core/services/nav-context.service';
import { ThemeService } from './core/services/theme.service';
import { SITE_LINKS } from './core/data/site-links';

// Must match $nav-breakpoint in app.component.scss — the drawer/hamburger
// switch over at this width in both places, so they have to agree.
const NAV_BREAKPOINT_PX = 720;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  private readonly navCtx = inject(NavContextService);
  readonly themeService = inject(ThemeService);

  readonly SITE_LINKS = SITE_LINKS;
  readonly year = new Date().getFullYear();

  readonly currentCtx = toSignal(this.navCtx.ctx$, { initialValue: null });

  // The description popover remembers WHICH problem it was opened for (by
  // ctx.num), not just whether it's open — a plain boolean stayed true across
  // a ctx change and reopened the popover for the next problem. It's open now
  // only if that same problem is still current.
  private readonly descriptionOpenFor = signal<number | null>(null);
  readonly isDescriptionOpen = computed(() => {
    const openFor = this.descriptionOpenFor();
    return openFor !== null && openFor === this.currentCtx()?.num;
  });

  // Library dropdown: open while hovered OR pinned by a click; either clears it.
  private readonly isLibraryHovered = signal(false);
  private readonly isLibraryPinned = signal(false);
  readonly isLibraryOpen = computed(() => this.isLibraryHovered() || this.isLibraryPinned());

  readonly isDrawerOpen = signal(false);

  readonly isBackdropVisible = computed(
    () => this.isDescriptionOpen() || this.isLibraryPinned() || this.isDrawerOpen(),
  );

  toggleDescription(event: MouseEvent): void {
    event.stopPropagation();
    this.descriptionOpenFor.set(this.isDescriptionOpen() ? null : (this.currentCtx()?.num ?? null));
  }

  onLibraryEnter(): void {
    this.isLibraryHovered.set(true);
  }

  onLibraryLeave(): void {
    this.isLibraryHovered.set(false);
  }

  // ⌄ click: while the menu is open (hovered or pinned), close it outright —
  // otherwise a plain pin/unpin toggle would leave isLibraryHovered true and
  // the menu open regardless, since it stays hovered until the pointer leaves.
  toggleLibrary(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isLibraryOpen()) {
      this.closeLibrary();
    } else {
      this.isLibraryPinned.set(true);
    }
  }

  closeLibrary(): void {
    this.isLibraryHovered.set(false);
    this.isLibraryPinned.set(false);
  }

  toggleDrawer(event: MouseEvent): void {
    event.stopPropagation();
    this.isDrawerOpen.update((open) => !open);
  }

  closeAll(): void {
    this.descriptionOpenFor.set(null);
    this.closeLibrary();
    this.isDrawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }

  // Closes the mobile drawer when the viewport widens past the breakpoint —
  // scss hides it visually at that width too, but without this it stays
  // "open" in state and reopens instantly if the viewport narrows again.
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > NAV_BREAKPOINT_PX) {
      this.isDrawerOpen.set(false);
    }
  }
}
