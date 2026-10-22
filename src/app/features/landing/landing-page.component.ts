import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { SITE_COUNTS } from '../../core/data/site-counts';
import { DEMO_REPO_SLUG } from '../../core/data/site-links';

const HOME_PATH = '/';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  private readonly auth = inject(AuthService);
  protected readonly counts = SITE_COUNTS;
  protected readonly demoRepoSlug = DEMO_REPO_SLUG;

  protected signIn(): void {
    this.auth.signIn(HOME_PATH);
  }
}
