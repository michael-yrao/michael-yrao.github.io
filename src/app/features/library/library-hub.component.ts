import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ALGORITHM_INDEX, countVisualized } from '../../core/data/algorithms.data';
import { GAMES } from '../../core/data/games.data';
import { QUIZZES } from '../../core/data/quizzes.data';
import { SITE_LINKS } from '../../core/data/site-links';
import { PageHeaderComponent, BreadcrumbEntry } from '../../shared/components/page-header/page-header.component';
import { GroundednessMeterComponent } from '../../shared/components/groundedness-meter/groundedness-meter.component';

// A literal, not a read of `assets/cheat-sheets.json`: importing the JSON here would pull the
// whole cheat-sheet asset into this chunk. Update it when a technique doc is added to
// cse-progress (the asset's `techniques` length).
const CHEAT_SHEET_COUNT = 18;

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Library' },
];

@Component({
  selector: 'app-library-hub',
  templateUrl: './library-hub.component.html',
  styleUrls: ['./library-hub.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, GroundednessMeterComponent],
})
export class LibraryHubComponent {
  readonly breadcrumb = BREADCRUMB;
  readonly totalSolved = ALGORITHM_INDEX.length;
  readonly totalVisualized = countVisualized(ALGORITHM_INDEX);
  readonly totalGames = GAMES.filter((g) => g.status === 'available').length;
  readonly totalQuizzes = QUIZZES.filter((q) => q.status === 'available').length;
  readonly cheatSheetCount = CHEAT_SHEET_COUNT;
  readonly SITE_LINKS = SITE_LINKS;
}
