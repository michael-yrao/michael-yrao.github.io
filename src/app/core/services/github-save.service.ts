import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { buildResults, resultsPath } from '../pattern-sense/github-save';
import { RepoRef } from './github-file.service';

const ROUTE_PREFIX = 'pattern-sense/';
const NOT_INSTALLED_ERROR = 'not-installed';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'not-installed';

/** Saving a finished week's results through the Worker, as the signed-in viewer. */
@Injectable({ providedIn: 'root' })
export class GithubSaveService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly saveState = signal<SaveState>('idle');

  async save(ref: RepoRef, week: string, vocabulary: string, code: string): Promise<void> {
    this.saveState.set('saving');
    const token = await this.auth.getToken();
    if (token === null) {
      this.saveState.set('failed');
      return;
    }
    const body = {
      owner: ref.owner,
      repo: ref.repo,
      branch: ref.branch,
      path: resultsPath(week),
      results: buildResults(week, vocabulary, code, new Date()),
    };
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      await firstValueFrom(this.http.post(`${WORKER_API_URL}${ROUTE_PREFIX}save`, body, { headers }));
      this.saveState.set('saved');
    } catch (err) {
      const isNotInstalled =
        err instanceof HttpErrorResponse && err.error?.error === NOT_INSTALLED_ERROR;
      this.saveState.set(isNotInstalled ? 'not-installed' : 'failed');
    }
  }
}
