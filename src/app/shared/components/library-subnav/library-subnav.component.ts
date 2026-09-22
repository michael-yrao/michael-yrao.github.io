import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SubnavLink {
  label: string;
  path: string;
}

const SUBNAV_LINKS: SubnavLink[] = [
  { label: 'Algorithms', path: '/algorithms' },
  { label: 'Patterns', path: '/learn' },
  { label: 'Games', path: '/games' },
];

@Component({
  selector: 'app-library-subnav',
  templateUrl: './library-subnav.component.html',
  styleUrls: ['./library-subnav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class LibrarySubnavComponent {
  readonly links = SUBNAV_LINKS;
}
