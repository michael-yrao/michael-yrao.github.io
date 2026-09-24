import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  InjectionToken,
  computed,
  inject,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { CheatSheetService, FamilyGroup } from '../../../core/services/cheat-sheet.service';
import { DecisionTreeNode, SignalRow } from '../../../core/models/cheat-sheet.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import { DecisionTreeComponent } from '../decision-tree/decision-tree.component';

const NOTICE =
  'Best read after a rep, not during one — the signals table spoils recognition practice.';

/** The Table/Decision-tree toggle above the signals table. Only ever rendered when a
 *  decision tree is loaded — `activeView` falls back to 'table' otherwise. */
export type LearnView = 'table' | 'tree';
const VIEW_ORDER: LearnView[] = ['table', 'tree'];
const VIEW_LABEL: Record<LearnView, string> = { table: 'Table', tree: 'Decision tree' };

/** The decision-tree view is hidden pending the learner's review; flip the factory to `true`
 *  to show it (the data pipeline, component, and `?view=tree` handling all stay wired). */
export const LEARN_DECISION_TREE_ENABLED = new InjectionToken<boolean>(
  'LEARN_DECISION_TREE_ENABLED',
  { providedIn: 'root', factory: () => false },
);

interface SignalRowView extends SignalRow {
  /** Route to `/learn/<reach>` when the row names a technique that resolves; null renders
   *  `reachLabel` as plain text (a `page: false` row, or an id with no matching technique). */
  techniqueRoute: string[] | null;
  /** The resolved technique's display name when it resolves, else the raw `reach` label. */
  reachLabel: string;
}

interface FamilySection {
  family: string;
  label: string;
  techniques: FamilyGroup['techniques'];
}

@Component({
  selector: 'app-learn-list',
  templateUrl: './learn-list.component.html',
  styleUrls: ['./learn-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, LibrarySubnavComponent, DecisionTreeComponent],
})
export class LearnListComponent {
  private readonly cheatSheets = inject(CheatSheetService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly isTreeEnabled = inject(LEARN_DECISION_TREE_ENABLED);

  readonly notice = NOTICE;
  readonly status = this.cheatSheets.status;
  readonly error = this.cheatSheets.error;
  readonly sourceFooter = this.cheatSheets.sourceFooter;
  readonly decisionTree = computed<DecisionTreeNode | null>(() =>
    this.isTreeEnabled ? this.cheatSheets.decisionTree() : null,
  );

  readonly viewOrder = VIEW_ORDER;
  readonly viewLabel = VIEW_LABEL;
  private readonly viewTabs = viewChildren<ElementRef<HTMLButtonElement>>('viewTab');

  // `?view=tree` — the same toSignal(queryParamMap, {initialValue: snapshot…}) shape
  // `progress-page`'s `?repo=` uses, so the first read already has the real param instead of
  // firing once with null.
  private readonly viewParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('view'))),
    { initialValue: this.route.snapshot.queryParamMap.get('view') },
  );

  // Any value other than 'tree', or 'tree' with no tree loaded, falls back to 'table' — the
  // toggle can never point at a view that has nothing to show.
  readonly activeView = computed<LearnView>(() =>
    this.viewParam() === 'tree' && this.decisionTree() ? 'tree' : 'table',
  );

  readonly signalRows = computed<SignalRowView[]>(() => {
    const data = this.cheatSheets.data();
    if (!data) return [];
    return data.signals.map((row) => {
      const technique = row.page === false ? undefined : this.cheatSheets.techniqueById(row.reach);
      return {
        ...row,
        techniqueRoute: technique ? ['/learn', row.reach] : null,
        reachLabel: technique?.name ?? row.reach,
      };
    });
  });

  readonly familySections = computed<FamilySection[]>(() =>
    this.cheatSheets.techniquesByFamily().map((group) => ({
      family: group.family,
      label: humanise(group.family),
      techniques: group.techniques,
    })),
  );

  constructor() {
    this.cheatSheets.load();
  }

  retry(): void {
    this.cheatSheets.load();
  }

  /** Selects a view via the URL — `queryParamsHandling: 'merge'` so a bare `view: null`
   *  (the Table selection) drops the param and `/learn` stays canonical. */
  setView(view: LearnView): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'table' ? null : view },
      queryParamsHandling: 'merge',
    });
  }

  isViewActive(view: LearnView): boolean {
    return this.activeView() === view;
  }

  /** Roving tabindex keyboard nav for the view tablist (ArrowLeft/Right wrap, Home/End jump) —
   *  same shape as `progress-page`'s `onTabKeydown`. */
  onViewKeydown(event: KeyboardEvent, index: number): void {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % VIEW_ORDER.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = VIEW_ORDER.length - 1;
    if (next === null) return;
    event.preventDefault();
    this.setView(VIEW_ORDER[next]);
    this.viewTabs()[next]?.nativeElement.focus();
  }
}

/** "arrays_and_hash" -> "Arrays and hash". */
function humanise(familyKey: string): string {
  const spaced = familyKey.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
