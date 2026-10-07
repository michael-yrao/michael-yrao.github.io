import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ShowcaseEntry } from '../../../core/models/showcase.model';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { DisplayRow } from '../../../core/showcase/display';
import { RowRange } from '../../../core/showcase/anchor-resolver';
import { VariantGroundedness } from '../../../core/showcase/groundedness';
import {
  GOLD_STANDARD_REPO,
  LoadStatus,
  blobUrl,
  parseRepoSlug,
  sameRef,
} from '../../../core/services/github-file.service';
import { CodeViewerComponent } from '../code-viewer/code-viewer.component';

const SKELETON_ROW_COUNT = 6;

/**
 * The problem page's code panel: the showcase fetch's loading/error/ready states, the
 * Grounded/Ungrounded badge and attempt metadata, and the code viewer wired to the resolved
 * active step range. Purely presentational — the caller (solution walkthrough) owns fetching and
 * computing `entry`/`rows`/`groundedness`.
 */
@Component({
  selector: 'app-grounded-code-panel',
  templateUrl: './grounded-code-panel.component.html',
  styleUrls: ['./grounded-code-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeViewerComponent],
})
export class GroundedCodePanelComponent {
  readonly status = input.required<LoadStatus>();
  readonly error = input<string | null>(null);
  readonly entry = input<ShowcaseEntry | null>(null);
  readonly rows = input<DisplayRow[]>([]);
  readonly activeRange = input<RowRange | null | undefined>(undefined);
  readonly groundedness = input<VariantGroundedness | null>(null);
  readonly label = input('Solution');
  readonly retry = output<void>();

  private readonly showcase = inject(ShowcaseService);

  readonly skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  // The page's viewer ref, derived from `?repo=` as `injectPracticeContract` does (without its
  // `practice.load` effect). No param parses to the author's own repo.
  private readonly route = inject(ActivatedRoute);
  private readonly repoParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('repo'))),
    { initialValue: this.route.snapshot.queryParamMap.get('repo') },
  );
  private readonly viewerRef = computed(() => parseRepoSlug(this.repoParam()));
  /** The code shown is the author's while the page's viewer is someone else. */
  readonly isViewerNotAuthor = computed(() => {
    const viewerRef = this.viewerRef();
    return viewerRef !== null && !sameRef(viewerRef, GOLD_STANDARD_REPO);
  });

  /** The repo the code came from (the author's until a load lands). */
  private readonly sourceRef = computed(() => this.showcase.sourceRef() ?? GOLD_STANDARD_REPO);
  /** `owner/repo` of that repo, shown on the "Grounded" badge. */
  readonly sourceSlug = computed(() => `${this.sourceRef().owner}/${this.sourceRef().repo}`);

  /** The showcase entry's `attempt` segment — the slice the "Grounded" badge links to on
   *  GitHub (the container header and any helper segments are not what the badge points at). */
  readonly attemptBlobUrl = computed(() => {
    const entry = this.entry();
    const attempt = entry?.segments.find((s) => s.kind === 'attempt');
    if (!entry || !attempt) return null;
    return blobUrl(this.sourceRef(), entry.file, attempt.startLine, attempt.endLine);
  });

  readonly groundednessFailureText = computed(() => this.groundedness()?.failures.join('; ') ?? '');

  onRetry(): void {
    this.retry.emit();
  }
}
