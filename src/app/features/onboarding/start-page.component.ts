import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, safeReturnUrl } from '../../core/auth/auth.service';
import {
  OnboardingFailure,
  OnboardingService,
  OnboardingStep,
} from '../../core/onboarding/onboarding.service';

type StepMark = 'done' | 'active' | 'pending';

interface ProgressItem {
  readonly step: OnboardingStep;
  readonly label: string;
}

const PROGRESS_ITEMS: readonly ProgressItem[] = [
  { step: 'creating', label: 'Creating your repo on GitHub…' },
  { step: 'waiting', label: 'Waiting for GitHub to copy the starter files…' },
  { step: 'checking-install', label: 'Checking that Progressive Overflow can see your repo…' },
];

const FAILURE_TEXT: Readonly<Record<OnboardingFailure, string>> = {
  'needs-reauthorize':
    'Progressive Overflow needs one new permission. Sign out, sign in again, and accept the update on GitHub.',
  'invite-only':
    'The cse-coach template is invite-only right now. Ask michael-yrao for access, then try again.',
  'name-taken':
    "You have a repo named cse-progress that isn't a cse-coach repo. Rename it on GitHub, then try again.",
  'still-copying': 'GitHub is still copying the starter files. Try again in a minute.',
  'rate-limited': 'GitHub asked us to slow down. Try again in a few minutes.',
  other: 'Something went wrong talking to GitHub. Try again.',
};

const START_PATH = '/start';
const HOME_PATH = '/';
const INSTALL_URL_BASE = 'https://github.com/apps/';
const INSTALL_URL_TAIL = '/installations/new';
const RESUME_PARAM = 'resume';
const RESUME_VALUE = '1';
const NEXT_PARAM = 'next';

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.component.html',
  styleUrl: './start-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly installUrl = `${INSTALL_URL_BASE}${this.auth.appSlug}${INSTALL_URL_TAIL}`;
  protected readonly nextUrl = safeReturnUrl(
    this.route.snapshot.queryParamMap.get(NEXT_PARAM) ?? HOME_PATH,
  );

  protected readonly isBusy = computed(() =>
    PROGRESS_ITEMS.some((item) => item.step === this.onboarding.step()),
  );
  protected readonly failureText = computed(() => {
    const failure = this.onboarding.failure();
    return failure === null ? null : FAILURE_TEXT[failure];
  });
  protected readonly progress = computed(() => {
    const step = this.onboarding.step();
    const currentIndex = PROGRESS_ITEMS.findIndex((item) => item.step === step);
    if (currentIndex === -1) return [];
    return PROGRESS_ITEMS.map((item, index) => ({
      label: item.label,
      mark: markFor(index, currentIndex),
    }));
  });

  ngOnInit(): void {
    const isResume = this.route.snapshot.queryParamMap.get(RESUME_PARAM) === RESUME_VALUE;
    if (isResume && this.auth.isSignedIn()) void this.onboarding.checkInstall();
  }

  protected signIn(): void {
    this.auth.signIn(this.router.url || START_PATH);
  }

  protected startDsa(): void {
    void this.onboarding.startDsa();
  }

  protected checkInstall(): void {
    void this.onboarding.checkInstall();
  }

  protected goNext(event?: Event): void {
    event?.preventDefault();
    void this.router.navigateByUrl(this.nextUrl);
  }
}

function markFor(index: number, currentIndex: number): StepMark {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'active' : 'pending';
}
