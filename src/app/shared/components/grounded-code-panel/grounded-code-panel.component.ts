import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ShowcaseEntry } from '../../../core/models/showcase.model';
import { DisplayRow } from '../../../core/showcase/display';
import { RowRange } from '../../../core/showcase/anchor-resolver';
import { VariantGroundedness } from '../../../core/showcase/groundedness';
import {
  GOLD_STANDARD_REPO,
  GOLD_STANDARD_SLUG,
  LoadStatus,
  blobUrl,
} from '../../../core/services/github-file.service';
import { CodeViewerComponent } from '../code-viewer/code-viewer.component';

const SKELETON_ROW_COUNT = 6;

/**
 * The problem page's code panel: the showcase fetch's loading/error/ready states, the
 * Grounded/Ungrounded badge and attempt metadata, and the code viewer wired to the resolved
 * active step range. Purely presentational — the caller (problem-page) owns fetching and
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

  readonly goldStandardSlug = GOLD_STANDARD_SLUG;
  readonly skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  /** The showcase entry's `attempt` segment — the slice the "Grounded" badge links to on
   *  GitHub (the container header and any helper segments are not what the badge points at). */
  readonly attemptBlobUrl = computed(() => {
    const entry = this.entry();
    const attempt = entry?.segments.find((s) => s.kind === 'attempt');
    if (!entry || !attempt) return null;
    return blobUrl(GOLD_STANDARD_REPO, entry.file, attempt.startLine, attempt.endLine);
  });

  readonly groundednessFailureText = computed(() => this.groundedness()?.failures.join('; ') ?? '');

  onRetry(): void {
    this.retry.emit();
  }
}
