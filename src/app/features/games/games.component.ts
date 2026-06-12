import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GAMES } from '../../core/data/games.data';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  readonly games = GAMES;
}
