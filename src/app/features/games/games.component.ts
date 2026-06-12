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
    id: 'pattern-sense',
    title: 'Pattern Sense',
    description: 'Read a real problem with the title hidden — name the technique it calls for. Build the recognition reflex that is half of every interview.',
    algorithmNote: 'Every problem on this site becomes a quiz round: spot the cues (sorted input? contiguous run? hierarchy?) and pick the right tool.',
    algorithms: ['Recognition', 'All techniques'],
    status: 'available',
    route: '/games/pattern-sense',
  },
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
