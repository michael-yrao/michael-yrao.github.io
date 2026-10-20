import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from './auth.service';

const HOME_PATH = '/';
const START_PATH = '/start';

/** The page GitHub sends the viewer back to: trades the code for a session, then returns to where sign-in began. */
@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasFailed()) {
      <button type="button" (click)="retry()">Sign-in failed — try again</button>
    }
  `,
})
export class AuthCallbackComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly hasFailed = signal(false);

  constructor() {
    void this.finishSignIn();
  }

  retry(): void {
    this.auth.signIn(HOME_PATH);
  }

  private async finishSignIn(): Promise<void> {
    const code = this.params.get('code');
    if (code === null || code === '') {
      this.hasFailed.set(true); // the viewer cancelled at GitHub: nothing to trade
      return;
    }
    const returnUrl = await this.auth.completeSignIn(code, this.params.get('state') ?? '');
    if (returnUrl === null) {
      this.hasFailed.set(true);
      return;
    }
    await this.auth.repos();
    const needsOnboarding = this.auth.selectedRepo() === null && !returnUrl.startsWith(START_PATH);
    const target = needsOnboarding
      ? `${START_PATH}?next=${encodeURIComponent(returnUrl)}`
      : returnUrl;
    await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
