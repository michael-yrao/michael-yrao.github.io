import { Component, ChangeDetectionStrategy } from '@angular/core';

interface GameMeta {
  id: string;
  title: string;
  description: string;
  algorithmNote: string;
  algorithms: string[];
  status: 'available' | 'coming-soon';
  route: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'flood-fill',
    title: 'Flood Fill',
    description: 'Pick a color to flood the board outward from the top-left corner. Conquer the whole grid in 22 moves or fewer.',
    algorithmNote: 'BFS expands the conquered region one level at a time — each wave ripple you see is one BFS frontier round.',
    algorithms: ['BFS', 'Number of Islands'],
    status: 'available',
    route: '/games/flood-fill',
  },
];

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  readonly games = GAMES;
}
