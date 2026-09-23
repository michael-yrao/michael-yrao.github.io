import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CheatSheetService, FamilyGroup } from '../../../core/services/cheat-sheet.service';
import { SignalRow } from '../../../core/models/cheat-sheet.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';

const NOTICE =
  'Best read after a rep, not during one — the signals table spoils recognition practice.';

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
  imports: [RouterLink, PageHeaderComponent, LibrarySubnavComponent],
})
export class LearnListComponent {
  private readonly cheatSheets = inject(CheatSheetService);

  readonly notice = NOTICE;
  readonly status = this.cheatSheets.status;
  readonly error = this.cheatSheets.error;

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
}

/** "arrays_and_hash" -> "Arrays and hash". */
function humanise(familyKey: string): string {
  const spaced = familyKey.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
