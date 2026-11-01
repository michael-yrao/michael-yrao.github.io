import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { ComplexityModule, parseComplexityModules } from '../big-o/complexity-modules';
import { fetchWithAuthorFallback$ } from './author-fallback';
import { CONTENT_REPO, GitHubFileService, RepoRef, sameRef } from './github-file.service';

const COMPLEXITY_FILE = 'dashboard/complexity.json';

/**
 * Fetches the Python complexity analyzer (`dashboard/complexity.json`) once per ref. A missing
 * or malformed file is not an error: `modules` stays null and every axis is graded against the
 * reference.
 */
@Injectable({ providedIn: 'root' })
export class ComplexityAnalyzerService {
  private readonly github = inject(GitHubFileService);

  /** The analyzer's modules; null until a load lands, and after any failed one. */
  readonly modules = signal<readonly ComplexityModule[] | null>(null);

  private loadedRef: RepoRef | null = null;
  private seq = 0;

  load(ref: RepoRef = CONTENT_REPO): void {
    if (this.loadedRef !== null && sameRef(ref, this.loadedRef)) return;
    this.loadedRef = ref;
    const mine = ++this.seq;
    this.modules.set(null);

    fetchWithAuthorFallback$<unknown>(this.github, ref, COMPLEXITY_FILE, false)
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        if (mine !== this.seq) return;
        this.modules.set(result === null ? null : parseComplexityModules(result.body));
      });
  }
}
