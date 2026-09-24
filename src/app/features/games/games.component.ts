import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GAMES, GAME_CATEGORY_LABELS, GameCategory, GameMeta } from '../../core/data/games.data';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../shared/components/library-subnav/library-subnav.component';

interface GameSection {
  id: GameCategory;
  label: string;
  blurb: string;
  games: GameMeta[];
}

const CATEGORY_ORDER: GameCategory[] = ['recognition', 'graph-traversal', 'complexity', 'optimization'];

const BREADCRUMB: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Games' }];

@Component({
    selector: 'app-games',
    templateUrl: './games.component.html',
    styleUrls: ['./games.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PageHeaderComponent, LibrarySubnavComponent]
})
export class GamesComponent {
  readonly breadcrumb = BREADCRUMB;
  readonly sections: GameSection[] = CATEGORY_ORDER
    .map((id) => ({
      id,
      label: GAME_CATEGORY_LABELS[id].label,
      blurb: GAME_CATEGORY_LABELS[id].blurb,
      games: GAMES.filter((g) => g.category === id),
    }))
    .filter((s) => s.games.length > 0);
}
