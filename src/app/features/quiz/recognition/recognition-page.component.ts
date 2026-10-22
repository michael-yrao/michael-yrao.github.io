import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProgressService } from '../../../core/services/progress.service';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { PracticeNumbers } from '../../progress/progress-page/practice-numbers';
import { RecognitionPanelComponent } from '../../progress/recognition-panel/recognition-panel.component';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Learn', link: '/learn' },
  { label: 'Quiz', link: '/quiz' },
  { label: 'Recognition' },
];

const BRANCH_SEPARATOR = '@';

/** `owner/repo` of a `owner/repo[@branch]` slug, lower-cased for comparison. */
function repoName(slug: string): string {
  return slug.split(BRANCH_SEPARATOR)[0].toLowerCase();
}

@Component({
  selector: 'app-recognition-page',
  templateUrl: './recognition-page.component.html',
  styleUrls: ['./recognition-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, RecognitionPanelComponent],
})
export class RecognitionPageComponent {
  protected readonly progress = inject(ProgressService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly breadcrumb = BREADCRUMB;

  private readonly repoParam = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('repo'))), {
    initialValue: this.route.snapshot.queryParamMap.get('repo'),
  });
  readonly repo = computed(() => this.auth.resolveRepo(this.repoParam()));

  /** The loaded summary belongs to this page's repo, not to a previous one still on screen. */
  protected readonly isSummaryForRepo = computed(() => {
    const slug = this.repo();
    const source = this.progress.source();
    return (
      slug !== null &&
      source !== null &&
      `${source.owner}/${source.repo}`.toLowerCase() === repoName(slug)
    );
  });

  readonly repoRef = this.progress.repoRef;
  readonly practiceNumbers = new PracticeNumbers(inject(PracticeService), this.repoRef).numbers;

  constructor() {
    // `untracked` confines this effect's dependency to `repo()`: loadSummary() writes signals itself.
    effect(() => {
      const repo = this.repo();
      if (!repo) return;
      untracked(() => this.progress.loadSummary(repo));
    });
  }

  signIn(): void {
    this.auth.signIn(this.router.url);
  }
}
