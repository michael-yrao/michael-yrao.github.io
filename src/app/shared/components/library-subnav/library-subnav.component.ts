import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LIBRARY_SECTIONS } from '../../../core/data/library-sections';

@Component({
  selector: 'app-library-subnav',
  templateUrl: './library-subnav.component.html',
  styleUrls: ['./library-subnav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class LibrarySubnavComponent {
  readonly links = LIBRARY_SECTIONS;
}
