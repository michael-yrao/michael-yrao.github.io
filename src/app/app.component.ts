import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
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

  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  /** The Progress link is for signed-in viewers; with the app off the site shows it as before. */
  readonly hasProgressLink = computed(() => !this.auth.isEnabled || this.auth.isSignedIn());

  signIn(): void {
    this.auth.signIn(this.router.url);
  }

  signOut(): void {
    this.auth.signOut();
  }

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
