import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LIBRARY_SECTIONS, type LibrarySection } from '../../../core/data/library-sections';

@Component({
  selector: 'app-library-subnav',
  templateUrl: './library-subnav.component.html',
  styleUrls: ['./library-subnav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class LibrarySubnavComponent {
  readonly sections = input<readonly LibrarySection[]>(LIBRARY_SECTIONS);
  readonly ariaLabel = input('Library sections');
}
