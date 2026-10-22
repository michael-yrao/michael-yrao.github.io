import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, isOwnDsaRepo, safeReturnUrl } from '../../core/auth/auth.service';
import {
  IntakeTarget,
  OnboardingFailure,
  OnboardingService,
  OnboardingStep,
} from '../../core/onboarding/onboarding.service';
import { addDaysISO, todayLocalISO } from '../../core/utils/local-date';
import { IconComponent } from '../../shared/components/icon/icon.component';

type StepMark = 'done' | 'active' | 'pending';

interface ProgressItem {
  readonly step: OnboardingStep;
  readonly label: string;
}

const PROGRESS_ITEMS: readonly ProgressItem[] = [
  { step: 'creating', label: 'Creating your repo on GitHub…' },
  { step: 'waiting', label: 'Waiting for GitHub to copy the starter files…' },
  { step: 'checking-install', label: 'Checking that Progressive Overflow can see your repo…' },
  { step: 'building', label: 'Building your first week in your repo…' },
];

interface TargetOption {
  readonly value: IntakeTarget;
  readonly label: string;
}

const TARGET_OPTIONS: readonly TargetOption[] = [
  { value: 'fintech_interview', label: 'Interview prep, fintech' },
  { value: 'faang_interview', label: 'Interview prep, big tech' },
  { value: 'competitive', label: 'Competitive programming' },
];

const START_DATE_WINDOW_DAYS = 30;
const GITHUB_USER_URL = 'https://api.github.com/users/';
const BUILD_RUN_URL_TAIL = '/actions/workflows/onboard.yml';
const GITHUB_URL_BASE = 'https://github.com/';

interface GithubUser {
  readonly name?: unknown;
}

function supportedTimezones(): readonly string[] {
  return Intl.supportedValuesOf('timeZone');
}

function defaultTimezone(zones: readonly string[]): string {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zones.includes(local) ? local : (zones[0] ?? local);
}

const FAILURE_TEXT: Readonly<Record<OnboardingFailure, string>> = {
  'needs-reauthorize':
    'Progressive Overflow needs one new permission. Sign out, sign in again, and accept the update on GitHub.',
  'invite-only':
    'The cse-coach template is invite-only right now. Ask michael-yrao for access, then try again.',
  'name-taken':
    "You have a repo named cse-progress that isn't a cse-coach repo. Rename it on GitHub, then try again.",
  'still-copying': 'GitHub is still copying the starter files. Try again in a minute.',
  'rate-limited': 'GitHub asked us to slow down. Try again in a few minutes.',
  'invalid-intake': 'Something in the form was not accepted. Check your name, timezone and start date.',
  other: 'Something went wrong talking to GitHub. Try again.',
};

const START_PATH = '/start';
const HOME_PATH = '/';
const RESUME_PARAM = 'resume';
const RESUME_VALUE = '1';
const NEXT_PARAM = 'next';

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.component.html',
  styleUrl: './start-page.component.scss',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly targets = TARGET_OPTIONS;
  protected readonly today = todayLocalISO();
  protected readonly minStartDate = addDaysISO(this.today, -START_DATE_WINDOW_DAYS);
  protected readonly maxStartDate = addDaysISO(this.today, START_DATE_WINDOW_DAYS);

  // A choice stays null until the learner touches the field; the shown value falls back to a default.
  private readonly nameChoice = signal<string | null>(null);
  private readonly profileName = signal<string | null>(null);
  private readonly timezoneChoice = signal<string | null>(null);
  private readonly startDateChoice = signal<string | null>(null);
  private hasRequestedProfile = false;
  protected readonly target = signal<IntakeTarget | null>(null);

  protected readonly name = computed(
    () => this.nameChoice() ?? this.profileName() ?? this.auth.login() ?? '',
  );
  /** Read only inside the intake case, so the zone list is built when the form shows. */
  protected readonly timezones = computed(supportedTimezones);
  protected readonly timezone = computed(
    () => this.timezoneChoice() ?? defaultTimezone(this.timezones()),
  );
  protected readonly startDate = computed(() => this.startDateChoice() ?? this.today);
  protected readonly canSubmit = computed(
    () => this.name().trim() !== '' && this.target() !== null,
  );
  protected readonly runUrl = computed(
    () => `${GITHUB_URL_BASE}${this.onboarding.repoSlug()}${BUILD_RUN_URL_TAIL}`,
  );

  protected readonly installUrl = this.auth.installUrl;
  protected readonly nextUrl = safeReturnUrl(
    this.route.snapshot.queryParamMap.get(NEXT_PARAM) ?? HOME_PATH,
  );

  /** The repos the App is installed on, looked up once on init; null until they arrive. */
  private readonly listedSlugs = signal<readonly string[] | null>(null);
  /** The viewer's own learner repo among the listed ones. */
  private readonly listedRepo = computed(() => {
    const login = this.auth.login();
    return this.listedSlugs()?.find((slug) => isOwnDsaRepo(slug, login)) ?? null;
  });
  /** The viewer's `{login}/cse-progress`, from the stored selection or the repo list; null when they have none. */
  protected readonly dsaRepo = computed(() => {
    const selected = this.auth.selectedRepo();
    if (isOwnDsaRepo(selected, this.auth.login())) return selected;
    return this.listedRepo();
  });
  /** Whether the App can see the DSA repo: null until the list arrives. */
  protected readonly isDsaRepoListed = computed<boolean | null>(() => {
    const slugs = this.listedSlugs();
    const repo = this.dsaRepo();
    if (slugs === null || repo === null) return null;
    return slugs.some((slug) => slug.toLowerCase() === repo.toLowerCase());
  });

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

  constructor() {
    effect(() => {
      if (this.onboarding.step() === 'intake') untracked(() => this.loadProfileName());
    });
  }

  ngOnInit(): void {
    const isResume = this.route.snapshot.queryParamMap.get(RESUME_PARAM) === RESUME_VALUE;
    if (isResume && this.auth.isSignedIn()) void this.onboarding.checkInstall();
    if (this.auth.isSignedIn()) void this.loadListedSlugs();
  }

  private async loadListedSlugs(): Promise<void> {
    this.listedSlugs.set(await this.auth.repos());
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

  protected goHome(): void {
    void this.router.navigateByUrl(HOME_PATH);
  }

  protected checkAgain(): void {
    void this.onboarding.checkAgain();
  }

  protected setName(event: Event): void {
    this.nameChoice.set((event.target as HTMLInputElement).value);
  }

  protected setTimezone(event: Event): void {
    this.timezoneChoice.set((event.target as HTMLSelectElement).value);
  }

  protected setStartDate(event: Event): void {
    this.startDateChoice.set((event.target as HTMLInputElement).value);
  }

  protected setTarget(value: IntakeTarget): void {
    this.target.set(value);
  }

  protected submitIntake(event: Event): void {
    event.preventDefault();
    const target = this.target();
    if (!this.canSubmit() || target === null) return;
    void this.onboarding.submitIntake({
      name: this.name().trim(),
      target,
      timezone: this.timezone(),
      startDate: this.startDate(),
    });
  }

  /** One unauthenticated lookup of the display name; on any error the login stays the prefill. */
  private loadProfileName(): void {
    const login = this.auth.login();
    if (this.hasRequestedProfile || login === null) return;
    this.hasRequestedProfile = true;
    this.http
      .get<GithubUser>(`${GITHUB_USER_URL}${login}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          if (typeof user.name === 'string' && user.name.trim() !== '') {
            this.profileName.set(user.name.trim());
          }
        },
        error: () => undefined,
      });
  }
}

function markFor(index: number, currentIndex: number): StepMark {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'active' : 'pending';
}
