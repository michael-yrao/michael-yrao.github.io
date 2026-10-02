import { Component, ChangeDetectionStrategy, HostListener, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SITE_LINKS } from './core/data/site-links';
import { LogoMarkComponent } from './shared/components/logo-mark/logo-mark.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoMarkComponent],
})
export class AppComponent {
  readonly SITE_LINKS = SITE_LINKS;
  readonly year = new Date().getFullYear();

  readonly isDrawerOpen = signal(false);

  toggleDrawer(event: MouseEvent): void {
    event.stopPropagation();
    this.isDrawerOpen.update((open) => !open);
  }

  closeAll(): void {
    this.isDrawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }
}
