import { Routes } from '@angular/router';

import { interviewSolutionGuard } from './features/interview/session/interview-solution.guard';
import { problemTitleResolver, solutionTitleResolver } from './problem-title.resolver';

export const routes: Routes = [
  {
    // Progress is the landing page, and the only route that loads PROGRESS_ROUTES —
    // '/progress' below redirects here instead of loading the same chunk a second time.
    path: '',
    title: 'Progress',
    loadChildren: () =>
      import('./features/progress/progress.routes').then((m) => m.PROGRESS_ROUTES),
  },
  {
    path: 'library',
    title: 'Library',
    loadComponent: () =>
      import('./features/library/library-hub.component').then((m) => m.LibraryHubComponent),
  },
  {
    path: 'explore',
    redirectTo: 'library',
  },
  {
    path: 'coach',
    title: 'Coach',
    loadComponent: () =>
      import('./features/coach/coach-page.component').then((m) => m.CoachPageComponent),
  },
  {
    path: 'about',
    title: 'About',
    loadComponent: () =>
      import('./features/about/about-page.component').then((m) => m.AboutPageComponent),
  },
  {
    path: 'algorithms',
    title: 'Algorithms',
    loadChildren: () =>
      import('./features/algorithms/algorithms.routes').then((m) => m.ALGORITHMS_ROUTES),
  },
  {
    path: 'games',
    title: 'Games',
    loadChildren: () =>
      import('./features/games/games.routes').then((m) => m.GAMES_ROUTES),
  },
  {
    path: 'quiz',
    title: 'Quiz',
    loadChildren: () =>
      import('./features/quiz/quiz.routes').then((m) => m.QUIZ_ROUTES),
  },
  {
    path: 'learn',
    title: 'Learn',
    loadChildren: () =>
      import('./features/learn/learn.routes').then((m) => m.LEARN_ROUTES),
  },
  {
    path: 'events',
    title: 'Events',
    loadChildren: () =>
      import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
  {
    path: 'interview',
    title: 'Interview',
    loadComponent: () =>
      import('./features/interview/interview-page/interview-page.component').then(
        (m) => m.InterviewPageComponent,
      ),
  },
  {
    path: 'interview/prepare',
    title: 'Interview',
    loadComponent: () =>
      import('./features/interview/interview-prepare/interview-prepare.component').then(
        (m) => m.InterviewPrepareComponent,
      ),
  },
  {
    path: 'interview/try/:id',
    title: 'Interview',
    loadComponent: () =>
      import('./features/interview/interview-try/interview-try.component').then(
        (m) => m.InterviewTryComponent,
      ),
  },
  {
    path: 'interview/debrief/:id',
    title: 'Interview',
    loadComponent: () =>
      import('./features/interview/interview-debrief/interview-debrief.component').then(
        (m) => m.InterviewDebriefComponent,
      ),
  },
  {
    path: 'practice',
    title: 'Practice',
    loadComponent: () =>
      import('./features/practice/practice-list/practice-list.component').then(
        (m) => m.PracticeListComponent,
      ),
  },
  {
    // Old custom-interview links (?host=, ?join=) still land: a string redirectTo keeps query params.
    path: 'practice/custom',
    redirectTo: 'interview',
  },
  {
    path: 'practice/:number',
    title: problemTitleResolver,
    loadComponent: () =>
      import('./features/practice/practice-page/practice-page.component').then(
        (m) => m.PracticePageComponent,
      ),
  },
  {
    path: 'practice/:number/solution',
    title: solutionTitleResolver,
    canActivate: [interviewSolutionGuard],
    loadComponent: () =>
      import('./features/practice/solution-page/solution-page.component').then(
        (m) => m.SolutionPageComponent,
      ),
  },
  {
    // '/progress' is the same page as '/', kept only for old links: redirect
    // rather than loading PROGRESS_ROUTES a second time. A string redirectTo
    // keeps query params (?repo=); see app.routes.spec.ts.
    path: 'progress',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
