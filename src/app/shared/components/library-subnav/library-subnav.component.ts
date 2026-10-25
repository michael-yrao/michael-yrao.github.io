import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LibrarySection } from '../../../core/data/library-sections';
import { PRACTICE_SECTIONS } from '../../../core/data/practice-sections';

@Component({
  selector: 'app-library-subnav',
  templateUrl: './library-subnav.component.html',
  styleUrls: ['./library-subnav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class LibrarySubnavComponent {
  readonly sections = input<readonly LibrarySection[]>(PRACTICE_SECTIONS);
  readonly ariaLabel = input('Practice sections');
}
