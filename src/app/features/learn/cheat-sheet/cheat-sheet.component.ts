import { Component, ChangeDetectionStrategy, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { CheatSheetService, ProblemLink } from '../../../core/services/cheat-sheet.service';
import { NotWhen, Technique } from '../../../core/models/cheat-sheet.model';
import { CodeViewerComponent } from '../../../shared/components/code-viewer/code-viewer.component';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';

const NOTICE =
  'Best read after a rep, not during one — the signals table spoils recognition practice.';

interface NotWhenView extends NotWhen {
  /** Route to `/learn/<technique>` when that id resolves; null renders `label` as plain text. */
  route: string[] | null;
  /** The neighbour technique's display name when it resolves, else the raw id from the JSON. */
  label: string;
}

interface KeyProblemView {
  lcNumber: number;
  title: string;
  link: ProblemLink;
}

@Component({
  selector: 'app-cheat-sheet',
  templateUrl: './cheat-sheet.component.html',
  styleUrls: ['./cheat-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CodeViewerComponent, PageHeaderComponent],
})
export class CheatSheetComponent {
  private readonly cheatSheets = inject(CheatSheetService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly notice = NOTICE;
  readonly status = this.cheatSheets.status;
  readonly error = this.cheatSheets.error;
  readonly sourceFooter = this.cheatSheets.sourceFooter;

  // A signal, not a snapshot: the component instance is reused across prev/next navigation
  // within the same route (:technique changes but the component doesn't recreate).
  private readonly techniqueId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('technique') ?? '')),
    { initialValue: '' },
  );

  readonly technique = computed<Technique | null>(
    () => this.cheatSheets.techniqueById(this.techniqueId()) ?? null,
  );

  readonly breadcrumb = computed<BreadcrumbEntry[]>(() => [
    { label: 'Home', link: '/' },
    { label: 'Learn', link: '/learn' },
    { label: this.technique()?.name ?? '' },
  ]);

  readonly notWhen = computed<NotWhenView[]>(() => {
    const technique = this.technique();
    if (!technique) return [];
    return technique.picking.notWhen.map((entry) => {
      // page === false means `technique` is a plain label with no page — never resolve it.
      const neighbour = entry.page === false ? undefined : this.cheatSheets.techniqueById(entry.technique);
      return {
        ...entry,
        route: neighbour ? ['/learn', entry.technique] : null,
        label: neighbour?.name ?? entry.technique,
      };
    });
  });

  readonly keyProblems = computed<KeyProblemView[]>(() => {
    const technique = this.technique();
    if (!technique) return [];
    return technique.keyProblems.map((problem) => ({
      ...problem,
      link: this.cheatSheets.resolveProblemLink(problem.lcNumber, problem.title),
    }));
  });

  // Prev/next walk the same family-grouped order the list page renders cards in, not the
  // raw JSON array order (they differ whenever the source isn't pre-sorted by family).
  private readonly orderedTechniques = this.cheatSheets.orderedTechniques;

  readonly prevTechnique = computed<Technique | null>(() => this.sibling(-1));
  readonly nextTechnique = computed<Technique | null>(() => this.sibling(1));

  constructor() {
    this.cheatSheets.load();

    // Redirect to /learn only once data has actually loaded and the id is absent — a
    // pending load or a load error must never bounce (an error renders its own message).
    effect(() => {
      if (this.status() === 'ready' && this.techniqueId() && !this.technique()) {
        this.router.navigate(['/learn']);
      }
    });
  }

  retry(): void {
    this.cheatSheets.load();
  }

  private sibling(offset: number): Technique | null {
    const list = this.orderedTechniques();
    const currentId = this.technique()?.id;
    const idx = list.findIndex((t) => t.id === currentId);
    const targetIdx = idx + offset;
    return idx >= 0 && targetIdx >= 0 && targetIdx < list.length ? list[targetIdx] : null;
  }
}
