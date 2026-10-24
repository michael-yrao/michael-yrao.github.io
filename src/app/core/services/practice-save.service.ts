import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { AttemptMeta, attemptPath, buildAttemptFile } from '../practice/practice-attempt';
import { RepoRef } from './github-file.service';
import { SaveState, failureStateFor } from './github-save.service';
import { removeRecord } from './provisional-records';

const ROUTE_PREFIX = 'practice/';
const HTTP_CONFLICT = 409;
const ALREADY_COMPLETE_ERROR = 'already-complete';

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
  /** Attempt paths a complete or provisional save is known to hold: saved this session, or read back. */
  private readonly landedPaths = signal<ReadonlySet<string>>(new Set());

  statusFor(number: number): PracticeSaveStatus {
    return this.statuses()[number] ?? IDLE;
  }

  /** True once a complete or provisional save of `path` landed; reactive. */
  hasLanded(path: string): boolean {
    return this.landedPaths().has(path);
  }

  /** Records that `path` holds a complete or provisional save, and drops its fallback record. */
  markLanded(path: string): void {
    this.landedPaths.update((all) => new Set([...all, path]));
    removeRecord(path);
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
    const path = attemptPath(now, target.number, target.title);
    try {
      await firstValueFrom(
        this.http.post(`${WORKER_API_URL}${ROUTE_PREFIX}save`, saveBody(ref, path, buildAttemptFile(meta, now, code)), {
          headers: bearer(token),
        }),
      );
      if (meta.complete) this.markLanded(path);
      this.setStatus(target.number, { state: 'saved', isComplete: meta.complete });
    } catch (err) {
      if (isAlreadyComplete(err)) {
        this.markLanded(path); // another tab already holds a complete rep for this day
        this.setStatus(target.number, IDLE);
        return;
      }
      this.setStatus(target.number, { state: failureStateFor(err), isComplete: false });
    }
  }

  /** Sends a provisional rep's stored file; true once it landed. A failure leaves the fallback record. */
  async sendProvisional(ref: RepoRef, path: string, content: string): Promise<boolean> {
    const token = await this.auth.getToken();
    if (token === null) return false;
    try {
      await firstValueFrom(
        this.http.post(`${WORKER_API_URL}${ROUTE_PREFIX}save`, saveBody(ref, path, content), { headers: bearer(token) }),
      );
      this.markLanded(path);
      return true;
    } catch (err) {
      if (isAlreadyComplete(err)) {
        this.markLanded(path); // a rated rep already holds this day
        return true;
      }
      console.error(`Provisional rep: save of ${path} failed`, err);
      return false;
    }
  }

  /** The same send as `sendProvisional`, as a `keepalive` fetch that outlives a closing page. */
  async sendKeepalive(ref: RepoRef, path: string, content: string): Promise<void> {
    const token = await this.auth.getToken();
    if (token === null) return;
    try {
      const reply = await fetch(`${WORKER_API_URL}${ROUTE_PREFIX}save`, {
        method: 'POST',
        keepalive: true,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(saveBody(ref, path, content)),
      });
      if (reply.ok || (await isAlreadyCompleteReply(reply))) this.markLanded(path);
    } catch (err) {
      console.error(`Provisional rep: keepalive save of ${path} failed`, err);
    }
  }

  /** The viewer's newest saved file for the problem; null when there is none or anything fails. */
  async latest(ref: RepoRef, number: number): Promise<string | null> {
    return (await this.latestFile(ref, number))?.content ?? null;
  }

  /** The viewer's newest saved file for the problem with its path; null when there is none or anything fails. */
  async latestFile(ref: RepoRef, number: number): Promise<{ readonly path: string; readonly content: string } | null> {
    const token = await this.auth.getToken();
    if (token === null) return null;
    const body = { owner: ref.owner, repo: ref.repo, branch: ref.branch, number };
    try {
      const reply = await firstValueFrom(
        this.http.post<{ path?: unknown; content?: unknown }>(`${WORKER_API_URL}${ROUTE_PREFIX}latest`, body, {
          headers: bearer(token),
        }),
      );
      if (typeof reply?.content !== 'string' || typeof reply.path !== 'string') return null;
      return { path: reply.path, content: reply.content };
    } catch {
      return null; // 404 `none`, offline or refused: the page keeps its local copy
    }
  }

  private setStatus(number: number, status: PracticeSaveStatus): void {
    this.statuses.update((all) => ({ ...all, [number]: status }));
  }
}

function saveBody(ref: RepoRef, path: string, content: string): object {
  return { owner: ref.owner, repo: ref.repo, branch: ref.branch, path, content };
}

function isAlreadyComplete(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === HTTP_CONFLICT && err.error?.error === ALREADY_COMPLETE_ERROR;
}

async function isAlreadyCompleteReply(reply: Response): Promise<boolean> {
  if (reply.status !== HTTP_CONFLICT) return false;
  const body: unknown = await reply.json().catch(() => null);
  return (body as { error?: unknown } | null)?.error === ALREADY_COMPLETE_ERROR;
}

function bearer(token: string): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
}
