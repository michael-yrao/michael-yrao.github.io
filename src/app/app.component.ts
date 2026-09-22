import { Component, ChangeDetectionStrategy, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NavContextService } from './core/services/nav-context.service';
import { ThemeService } from './core/services/theme.service';
import { SITE_LINKS } from './core/data/site-links';
import { LIBRARY_SECTIONS } from './core/data/library-sections';

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
  readonly librarySections = LIBRARY_SECTIONS;
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

  readonly isDrawerOpen = signal(false);

  readonly isBackdropVisible = computed(() => this.isDescriptionOpen() || this.isDrawerOpen());

  toggleDescription(event: MouseEvent): void {
    event.stopPropagation();
    this.descriptionOpenFor.set(this.isDescriptionOpen() ? null : (this.currentCtx()?.num ?? null));
  }

  toggleDrawer(event: MouseEvent): void {
    event.stopPropagation();
    this.isDrawerOpen.update((open) => !open);
  }

  closeAll(): void {
    this.descriptionOpenFor.set(null);
    this.isDrawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }
}
