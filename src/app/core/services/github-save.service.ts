import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WORKER_API_URL } from '../data/site-links';
import {
  GITHUB_APP_CONFIG,
  buildResults,
  isGithubAppEnabled,
  repoSlugWithBranch,
  resultsPath,
} from '../pattern-sense/github-save';
import { RepoRef } from './github-file.service';

export const PENDING_KEY = 'po-pattern-sense-pending';
export const AUTH_KEY = 'po-pattern-sense-auth';
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const ROUTE_PREFIX = 'pattern-sense/';
const CALLBACK_PATH = '/quiz/pattern-sense';
const STATE_BYTES = 16;
const NOT_INSTALLED_ERROR = 'not-installed';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'not-installed';

/** What sign-in remembers across the GitHub round-trip. */
export interface PendingSignIn {
  readonly state: string;
  readonly repo: string;
  readonly week: string;
}

interface StoredAuth {
  readonly token: string;
  readonly login: string;
}

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null; // storage blocked or corrupt: treated as signed out
  }
}

function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: sign-in simply will not survive this visit
  }
}

function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // storage blocked: nothing to remove
  }
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STATE_BYTES));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** GitHub sign-in (via the Worker's token exchange) and saving a finished week's results. */
@Injectable({ providedIn: 'root' })
export class GithubSaveService {
  private readonly http = inject(HttpClient);
  private readonly location = inject(DOCUMENT).location;
  private readonly config = inject(GITHUB_APP_CONFIG);

  readonly isEnabled = isGithubAppEnabled(this.config);
  readonly appSlug = this.config.appSlug;

  private readonly auth = signal<StoredAuth | null>(readSession<StoredAuth>(AUTH_KEY));
  readonly login = computed(() => this.auth()?.login ?? null);
  readonly saveState = signal<SaveState>('idle');
  /** True when the code-for-token exchange failed after the GitHub return. */
  readonly signInFailed = signal(false);

  signIn(ref: RepoRef, week: string): void {
    const state = randomState();
    const pending: PendingSignIn = { state, repo: repoSlugWithBranch(ref), week };
    writeSession(PENDING_KEY, pending);
    const redirect = encodeURIComponent(this.location.origin + CALLBACK_PATH);
    this.location.assign(
      `${AUTHORIZE_URL}?client_id=${encodeURIComponent(this.config.clientId)}&state=${state}&redirect_uri=${redirect}`,
    );
  }

  /** Exchanges the OAuth `code` for a token; null (and no Worker call) when `state` is not ours. */
  async completeSignIn(
    code: string,
    state: string,
  ): Promise<{ repo: string; week: string } | null> {
    const pending = readSession<PendingSignIn>(PENDING_KEY);
    removeSession(PENDING_KEY);
    if (pending === null || pending.state !== state) return null;

    try {
      const auth = await firstValueFrom(
        this.http.post<StoredAuth>(`${WORKER_API_URL}${ROUTE_PREFIX}token`, { code }),
      );
      const stored: StoredAuth = { token: auth.token, login: auth.login };
      writeSession(AUTH_KEY, stored);
      this.auth.set(stored);
    } catch {
      // exchange failed: stay signed out and say so; the deck still reloads below
      this.signInFailed.set(true);
    }
    return { repo: pending.repo, week: pending.week };
  }

  async save(ref: RepoRef, week: string, vocabulary: string, code: string): Promise<void> {
    const auth = this.auth();
    if (auth === null) {
      this.saveState.set('failed');
      return;
    }
    this.saveState.set('saving');
    const body = {
      owner: ref.owner,
      repo: ref.repo,
      branch: ref.branch,
      path: resultsPath(week),
      results: buildResults(week, vocabulary, code, new Date()),
    };
    const headers = new HttpHeaders({ Authorization: `Bearer ${auth.token}` });
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
