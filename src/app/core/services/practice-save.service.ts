import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { AttemptMeta, attemptPath, buildAttemptFile } from '../practice/practice-attempt';
import { RepoRef } from './github-file.service';
import { SaveState, failureStateFor } from './github-save.service';

const ROUTE_PREFIX = 'practice/';

/** One problem's save state; `isComplete` is true once a Mark Complete save landed. */
export interface PracticeSaveStatus {
  readonly state: SaveState;
  readonly isComplete: boolean;
}

const IDLE: PracticeSaveStatus = { state: 'idle', isComplete: false };

/** What `save` needs to know about the problem being saved. */
export interface PracticeSaveTarget {
  readonly number: number;
  readonly title: string;
}

/** Saving a practice attempt through the Worker, as the signed-in viewer. State is kept per problem. */
@Injectable({ providedIn: 'root' })
export class PracticeSaveService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly statuses = signal<Readonly<Record<number, PracticeSaveStatus>>>({});

  statusFor(number: number): PracticeSaveStatus {
    return this.statuses()[number] ?? IDLE;
  }

  async save(
    ref: RepoRef,
    target: PracticeSaveTarget,
    code: string,
    meta: AttemptMeta,
    now: Date = new Date(),
  ): Promise<void> {
    this.setStatus(target.number, { state: 'saving', isComplete: false });
    const token = await this.auth.getToken();
    if (token === null) {
      this.setStatus(target.number, { state: 'failed', isComplete: false });
      return;
    }
    const body = {
      owner: ref.owner,
      repo: ref.repo,
      branch: ref.branch,
      path: attemptPath(now, target.number, target.title),
      content: buildAttemptFile(meta, now, code),
    };
    try {
      await firstValueFrom(this.http.post(`${WORKER_API_URL}${ROUTE_PREFIX}save`, body, { headers: bearer(token) }));
      this.setStatus(target.number, { state: 'saved', isComplete: meta.complete });
    } catch (err) {
      this.setStatus(target.number, { state: failureStateFor(err), isComplete: false });
    }
  }

  /** The viewer's newest saved file for the problem; null when there is none or anything fails. */
  async latest(ref: RepoRef, number: number): Promise<string | null> {
    const token = await this.auth.getToken();
    if (token === null) return null;
    const body = { owner: ref.owner, repo: ref.repo, branch: ref.branch, number };
    try {
      const reply = await firstValueFrom(
        this.http.post<{ content?: unknown }>(`${WORKER_API_URL}${ROUTE_PREFIX}latest`, body, { headers: bearer(token) }),
      );
      return typeof reply?.content === 'string' ? reply.content : null;
    } catch {
      return null; // 404 `none`, offline or refused: the page keeps its local copy
    }
  }

  private setStatus(number: number, status: PracticeSaveStatus): void {
    this.statuses.update((all) => ({ ...all, [number]: status }));
  }
}

function bearer(token: string): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
}
