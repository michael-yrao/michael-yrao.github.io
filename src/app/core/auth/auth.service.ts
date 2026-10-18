import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { WORKER_API_URL } from '../data/site-links';
import { GITHUB_APP_CONFIG, isGithubAppEnabled } from '../pattern-sense/github-save';
import { parseRepoSlug } from '../services/github-file.service';
import { SIGNED_OUT_LANDING, authGuard } from './auth.guard';

export const SESSION_KEY = 'po-auth-session';
export const REPO_KEY = 'po-auth-repo';
export const PENDING_KEY = 'po-auth-pending';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const CALLBACK_PATH = '/auth/callback';
const GITHUB_API = 'https://api.github.com';
const PAGE_SIZE_QUERY = 'per_page=100';
const GITHUB_ACCEPT = 'application/vnd.github+json';
const STATE_BYTES = 16;
const HOME_PATH = '/';
/** A token this close to expiry is refreshed before use. */
export const REFRESH_MARGIN_MS = 60_000;

/** What the Worker hands back and what localStorage keeps. Times are ISO strings; null = GitHub omitted it. */
export interface AuthSession {
  readonly token: string;
  readonly login: string;
  readonly expiresAt: string | null;
  readonly refreshToken: string | null;
  readonly refreshExpiresAt: string | null;
}

interface PendingSignIn {
  readonly state: string;
  readonly returnUrl: string;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Validates external JSON (storage or a Worker reply); null when the shape is wrong. */
export function parseSession(value: unknown): AuthSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const isValid =
    typeof v['token'] === 'string' &&
    v['token'] !== '' &&
    typeof v['login'] === 'string' &&
    isStringOrNull(v['expiresAt']) &&
    isStringOrNull(v['refreshToken']) &&
    isStringOrNull(v['refreshExpiresAt']);
  if (!isValid) return null;
  return {
    token: v['token'] as string,
    login: v['login'] as string,
    expiresAt: v['expiresAt'] as string | null,
    refreshToken: v['refreshToken'] as string | null,
    refreshExpiresAt: v['refreshExpiresAt'] as string | null,
  };
}

function parsePending(value: unknown): PendingSignIn | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v['state'] !== 'string' || typeof v['returnUrl'] !== 'string') return null;
  return { state: v['state'], returnUrl: v['returnUrl'] };
}

/** Same-site paths only: `/x` passes, `//host` and `/\host` (which browsers read as a host) do not. */
export function safeReturnUrl(url: string): string {
  const isSamePath = url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
  return isSamePath ? url : HOME_PATH;
}

function readJson(store: () => Storage, key: string): unknown {
  try {
    const raw = store().getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null; // storage blocked or corrupt: treated as absent
  }
}

function writeItem(store: () => Storage, key: string, value: string): void {
  try {
    store().setItem(key, value);
  } catch {
    // storage blocked: the value will not survive this visit
  }
}

function removeItem(store: () => Storage, key: string): void {
  try {
    store().removeItem(key);
  } catch {
    // storage blocked: nothing to remove
  }
}

const local = (): Storage => localStorage;
const session = (): Storage => sessionStorage;

function readStoredSession(): AuthSession | null {
  const stored = parseSession(readJson(local, SESSION_KEY));
  if (stored === null) removeItem(local, SESSION_KEY);
  return stored;
}

function readStoredRepo(): string | null {
  try {
    const slug = localStorage.getItem(REPO_KEY);
    return slug !== null && parseRepoSlug(slug) !== null ? slug : null;
  } catch {
    return null;
  }
}

/** True when the route or any ancestor of it is behind `authGuard`. */
function isGuardedByAuth(route: ActivatedRouteSnapshot | null): boolean {
  for (let node = route; node !== null; node = node.firstChild) {
    if (node.routeConfig?.canActivate?.includes(authGuard)) return true;
  }
  return false;
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STATE_BYTES));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface Installation {
  readonly id: number;
}

/** Site-wide GitHub sign-in: the OAuth round-trip, the stored session with its refresh, and the viewer's own repos. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly location = inject(DOCUMENT).location;
  private readonly config = inject(GITHUB_APP_CONFIG);
  private readonly router = inject(Router);

  readonly isEnabled = isGithubAppEnabled(this.config);
  readonly appSlug = this.config.appSlug;

  readonly session = signal<AuthSession | null>(readStoredSession());
  readonly login = computed(() => this.session()?.login ?? null);
  readonly isSignedIn = computed(() => {
    const current = this.session();
    if (current === null) return false;
    return current.refreshExpiresAt === null || Date.parse(current.refreshExpiresAt) > Date.now();
  });
  /** True when the code-for-token exchange failed after the GitHub return. */
  readonly signInFailed = signal(false);
  readonly selectedRepo = signal<string | null>(this.session() === null ? null : readStoredRepo());

  private inFlightRefresh: Promise<string | null> | null = null;

  signIn(returnUrl: string): void {
    const state = randomState();
    const pending: PendingSignIn = { state, returnUrl };
    writeItem(session, PENDING_KEY, JSON.stringify(pending));
    const redirect = encodeURIComponent(this.location.origin + CALLBACK_PATH);
    this.location.assign(
      `${AUTHORIZE_URL}?client_id=${encodeURIComponent(this.config.clientId)}&redirect_uri=${redirect}&state=${state}`,
    );
  }

  /** Trades the OAuth `code` for a session; the return URL on success, null (and no Worker call when `state` is not ours) otherwise. */
  async completeSignIn(code: string, state: string): Promise<string | null> {
    const pending = parsePending(readJson(session, PENDING_KEY));
    removeItem(session, PENDING_KEY);
    if (pending === null || pending.state !== state) {
      this.signInFailed.set(true);
      return null;
    }
    const granted = await this.callWorker('auth/token', { code });
    if (granted === null) {
      this.signInFailed.set(true);
      return null;
    }
    this.signInFailed.set(false);
    this.storeSession(granted);
    return safeReturnUrl(pending.returnUrl);
  }

  /** A usable token, refreshed first when it is about to expire; null when signed out or the refresh failed. */
  getToken(): Promise<string | null> {
    const current = this.session();
    if (current === null) return Promise.resolve(null);
    const isFresh =
      current.expiresAt === null || Date.parse(current.expiresAt) > Date.now() + REFRESH_MARGIN_MS;
    if (isFresh) return Promise.resolve(current.token);
    this.inFlightRefresh ??= this.refresh(current).finally(() => {
      this.inFlightRefresh = null;
    });
    return this.inFlightRefresh;
  }

  signOut(): void {
    removeItem(local, SESSION_KEY);
    removeItem(local, REPO_KEY);
    removeItem(session, PENDING_KEY);
    this.session.set(null);
    this.selectedRepo.set(null);
    this.signInFailed.set(false);
    if (isGuardedByAuth(this.router.routerState.snapshot.root)) {
      void this.router.navigateByUrl(SIGNED_OUT_LANDING);
    }
  }

  selectRepo(slug: string): void {
    writeItem(local, REPO_KEY, slug);
    this.selectedRepo.set(slug);
  }

  /** `owner/name` of every repo the App is installed on for this viewer; one repo is selected automatically. */
  async repos(): Promise<string[]> {
    const token = await this.getToken();
    if (token === null) return [];
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: GITHUB_ACCEPT,
    });
    try {
      const installs = await firstValueFrom(
        this.http.get<{ installations?: Installation[] }>(
          `${GITHUB_API}/user/installations?${PAGE_SIZE_QUERY}`,
          { headers },
        ),
      );
      const lists = await Promise.all(
        (installs.installations ?? []).map((installation) =>
          firstValueFrom(
            this.http.get<{ repositories?: { full_name: string }[] }>(
              `${GITHUB_API}/user/installations/${installation.id}/repositories?${PAGE_SIZE_QUERY}`,
              { headers },
            ),
          ),
        ),
      );
      const slugs = lists.flatMap((list) => (list.repositories ?? []).map((r) => r.full_name));
      const stored = this.selectedRepo();
      const hasValidSelection = stored !== null && slugs.includes(stored);
      if (slugs.length > 0 && !hasValidSelection) this.selectRepo(slugs[0]);
      return slugs;
    } catch {
      return []; // GitHub unreachable or the token was refused: no repos to offer
    }
  }

  /** `?repo=` wins; else the signed-in viewer's own repo; null keeps the author-default behaviour. */
  resolveRepo(queryRepo: string | null): string | null {
    if (queryRepo) return queryRepo;
    return this.isSignedIn() ? this.selectedRepo() : null;
  }

  private async refresh(current: AuthSession): Promise<string | null> {
    const renewed =
      current.refreshToken === null
        ? null
        : await this.callWorker('auth/refresh', { refreshToken: current.refreshToken });
    if (renewed === null) {
      this.signOut();
      return null;
    }
    this.storeSession(renewed);
    return renewed.token;
  }

  private async callWorker(route: string, body: object): Promise<AuthSession | null> {
    try {
      const reply = await firstValueFrom(this.http.post<unknown>(`${WORKER_API_URL}${route}`, body));
      return parseSession(reply);
    } catch {
      return null; // any non-200 is a failure; the caller decides what that means
    }
  }

  private storeSession(next: AuthSession): void {
    writeItem(local, SESSION_KEY, JSON.stringify(next));
    this.session.set(next);
  }
}
