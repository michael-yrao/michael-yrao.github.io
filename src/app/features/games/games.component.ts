import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GAMES, GAME_CATEGORY_LABELS, GameCategory, GameMeta } from '../../core/data/games.data';

interface GameSection {
  id: GameCategory;
  label: string;
  blurb: string;
  games: GameMeta[];
}

const CATEGORY_ORDER: GameCategory[] = ['recognition', 'graph-traversal', 'complexity'];

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  readonly sections: GameSection[] = CATEGORY_ORDER
    .map((id) => ({
      id,
      label: GAME_CATEGORY_LABELS[id].label,
      blurb: GAME_CATEGORY_LABELS[id].blurb,
      games: GAMES.filter((g) => g.category === id),
    }))
    .filter((s) => s.games.length > 0);
}
