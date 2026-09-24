import { Component, ChangeDetectionStrategy } from '@angular/core';
import { QUIZZES } from '../../core/data/quizzes.data';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../shared/components/library-subnav/library-subnav.component';

const BREADCRUMB: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Quiz' }];

@Component({
    selector: 'app-quiz',
    templateUrl: './quiz.component.html',
    styleUrls: ['./quiz.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PageHeaderComponent, LibrarySubnavComponent]
})
export class QuizComponent {
  readonly breadcrumb = BREADCRUMB;
  readonly quizzes = QUIZZES;
}
