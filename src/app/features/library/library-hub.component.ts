import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ALL_ALGORITHMS, countVisualized } from '../../core/data/algorithms.data';
import { GAMES } from '../../core/data/games.data';
import { CHEAT_SHEET_COUNT } from '../../core/data/library-sections';
import { SITE_LINKS } from '../../core/data/site-links';
import { PageHeaderComponent, BreadcrumbEntry } from '../../shared/components/page-header/page-header.component';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Library' },
];

@Component({
  selector: 'app-library-hub',
  templateUrl: './library-hub.component.html',
  styleUrls: ['./library-hub.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class LibraryHubComponent {
  readonly breadcrumb = BREADCRUMB;
  readonly totalSolved = ALL_ALGORITHMS.length;
  readonly totalVisualized = countVisualized(ALL_ALGORITHMS);
  readonly totalGames = GAMES.filter((g) => g.status === 'available').length;
  readonly cheatSheetCount = CHEAT_SHEET_COUNT;
  readonly SITE_LINKS = SITE_LINKS;
}
