import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { WORKER_API_URL, isCoachOwner } from '../../core/data/site-links';
import { DiaryBlock, blocksOf, placeEntry, todayLocal } from './diary-body';
import {
  DiaryEntriesResponse,
  DiaryEntry,
  DiaryEntryInput,
  DiarySaveResponse,
  DiarySeenRequest,
  DiaryUnlockResponse,
  DiaryView,
  DiaryViewsResponse,
} from './diary-contract';
import { isEngaged, nextSeenBatch } from './diary-seen';

const UNLOCK_URL = `${WORKER_API_URL}diary/unlock`;
const SEEN_URL = `${WORKER_API_URL}diary/seen`;
const ENTRIES_URL = `${WORKER_API_URL}diary/entries`;
const VIEWS_URL = `${WORKER_API_URL}diary/views`;
const ROBOTS_META = { name: 'robots', content: 'noindex, nofollow' };
const STATUS_UNAUTHORIZED = 401;
const STATUS_TOO_MANY = 429;

const SEEN_VISIBLE_RATIO = 0.5;
const SEEN_DWELL_MS = 3000;
const SEEN_FLUSH_MS = 5000;
const SEEN_CENTER_MARGIN = '-50% 0px -50% 0px';
const READ_SEPARATOR = ' · ';

const MESSAGE_WRONG_PASSWORD = 'Wrong password';
const MESSAGE_TOO_MANY = 'Too many tries. Wait a minute.';
const MESSAGE_UNREACHABLE = "Couldn't reach the server.";
const MESSAGE_SAVE_FAILED = "Couldn't save.";
const MESSAGE_NOT_BACKED_UP = 'Not backed up';

function messageForStatus(status: number): string {
  if (status === STATUS_UNAUTHORIZED) return MESSAGE_WRONG_PASSWORD;
  if (status === STATUS_TOO_MANY) return MESSAGE_TOO_MANY;
  return MESSAGE_UNREACHABLE;
}

/** The place of a view: `city, country`, leaving out an empty part. */
export function whereOf(view: DiaryView): string {
  return [view.city, view.country].filter((part) => part !== '').join(', ');
}

/** The local date-time of a view's ISO `at`. */
export function whenOf(view: DiaryView): string {
  return new Date(view.at).toLocaleString();
}

/** The titles of the entries a view read, in order; ids of deleted entries are skipped. */
export function readOf(view: DiaryView, entries: readonly DiaryEntry[]): string {
  const titles = new Map(entries.map((entry) => [entry.id, entry.title]));
  return view.read
    .filter((id) => titles.has(id))
    .map((id) => titles.get(id))
    .join(READ_SEPARATOR);
}

/** The editor's working copy; `id` is null for a new entry. */
interface EditorDraft { id: string | null; date: string; title: string; body: string }

@Component({
  selector: 'app-diary-page',
  templateUrl: './diary-page.component.html',
  styleUrls: ['./diary-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private hasLoadedOwner = false;
  private visitId = '';
  private observers: IntersectionObserver[] = [];
  private ratioIds: ReadonlySet<string> = new Set();
  private centerIds: ReadonlySet<string> = new Set();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private seen: ReadonlySet<string> = new Set();
  private sent: ReadonlySet<string> = new Set();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly entryParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('entry'))), {
    initialValue: this.route.snapshot.queryParamMap.get('entry'),
  });

  readonly isOwner = computed(() => isCoachOwner(this.auth.login()));
  readonly entries = signal<readonly DiaryEntry[] | null>(null);
  readonly error = signal('');
  readonly isBusy = signal(false);
  readonly views = signal<readonly DiaryView[] | null>(null);
  readonly backupAt = signal<string | null>(null);
  /** The open entry: the one named by the `entry` param, else the newest. */
  readonly selectedEntry = computed(() => {
    const list = this.entries() ?? [];
    return list.find((entry) => entry.id === this.entryParam()) ?? list[0] ?? null;
  });
  readonly backupLabel = computed(() => {
    const at = this.backupAt();
    return at === null ? MESSAGE_NOT_BACKED_UP : `Backed up ${new Date(at).toLocaleString()}`;
  });
  readonly editor = signal<EditorDraft | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.hasLoadedOwner || !this.isOwner()) return;
      this.hasLoadedOwner = true;
      untracked(() => void this.loadOwnerData());
    });
    effect(() => {
      const id = this.selectedEntry()?.id;
      if (id === undefined || this.visitId === '') return;
      untracked(() => {
        this.resetTracking();
        afterNextRender(() => this.startTracking(), { injector: this.injector });
      });
    });
    this.destroyRef.onDestroy(() => this.stopTracking());
  }

  ngOnInit(): void {
    const tag = this.meta.addTag(ROBOTS_META);
    this.destroyRef.onDestroy(() => tag && this.meta.removeTagElement(tag));
  }

  async unlock(input: HTMLInputElement): Promise<void> {
    const password = input.value;
    if (password === '' || this.isBusy()) return;
    this.isBusy.set(true);
    this.error.set('');
    try {
      const response = await fetch(UNLOCK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        this.error.set(messageForStatus(response.status));
        return;
      }
      const body = (await response.json()) as DiaryUnlockResponse;
      this.visitId = body.visitId;
      this.entries.set(body.entries);
      input.value = '';
    } catch {
      this.error.set(MESSAGE_UNREACHABLE);
    } finally {
      this.isBusy.set(false);
    }
  }

  blocksOf(entry: DiaryEntry): DiaryBlock[] {
    return blocksOf(entry.body);
  }

  newEntry(): void {
    this.error.set('');
    this.pendingDeleteId.set(null);
    this.editor.set({ id: null, date: todayLocal(), title: '', body: '' });
  }

  editEntry(entry: DiaryEntry): void {
    this.error.set('');
    this.pendingDeleteId.set(null);
    this.editor.set({ id: entry.id, date: entry.date, title: entry.title, body: entry.body });
  }

  cancelEdit(): void {
    this.pendingDeleteId.set(null);
    this.editor.set(null);
  }

  /** Puts the entry id in the `entry` query param (null clears it); a stale id falls back to the newest entry. */
  selectEntry(id: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { entry: id },
      replaceUrl: true,
    });
  }

  /** Left/right arrows move the selection and focus between tabs. */
  onTabKey(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const list = this.entries() ?? [];
    const next = index + step;
    if (step === 0 || next < 0 || next >= list.length) return;
    event.preventDefault();
    this.selectEntry(list[next].id);
    const tabs = this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  tabLabelOf(entry: DiaryEntry): string {
    return entry.title === '' ? entry.date : entry.title;
  }

  async save(date: string, title: string, body: string): Promise<void> {
    const draft = this.editor();
    if (draft === null || this.isBusy()) return;
    this.isBusy.set(true);
    this.error.set('');
    const input: DiaryEntryInput = { date, title, body };
    const isNew = draft.id === null;
    try {
      const response = await this.ownerFetch(isNew ? ENTRIES_URL : `${ENTRIES_URL}/${draft.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(input),
      });
      if (response === null || !response.ok) {
        this.error.set(MESSAGE_SAVE_FAILED);
        return;
      }
      const saved = ((await response.json()) as DiarySaveResponse).entry;
      this.entries.update((list) => placeEntry(list ?? [], saved));
      this.editor.set(null);
      if (isNew) this.selectEntry(saved.id);
    } catch {
      this.error.set(MESSAGE_SAVE_FAILED);
    } finally {
      this.isBusy.set(false);
    }
  }

  /** First click arms the delete (the icon becomes a check); the second deletes. */
  async deleteEntry(id: string): Promise<void> {
    if (this.pendingDeleteId() !== id) {
      this.pendingDeleteId.set(id);
      return;
    }
    this.pendingDeleteId.set(null);
    this.error.set('');
    try {
      const response = await this.ownerFetch(`${ENTRIES_URL}/${id}`, { method: 'DELETE' });
      if (response === null || !response.ok) {
        this.error.set(MESSAGE_SAVE_FAILED);
        return;
      }
      const remaining = (this.entries() ?? []).filter((entry) => entry.id !== id);
      this.entries.set(remaining);
      this.editor.set(null);
      this.selectEntry(remaining[0]?.id ?? null);
    } catch {
      this.error.set(MESSAGE_SAVE_FAILED);
    }
  }

  private async ownerFetch(url: string, init: RequestInit): Promise<Response | null> {
    const token = await this.auth.getToken();
    if (token === null) return null;
    return fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  }

  private async loadOwnerData(): Promise<void> {
    await Promise.all([this.loadEntries(), this.loadViews()]);
  }

  private async loadEntries(): Promise<void> {
    try {
      const response = await this.ownerFetch(ENTRIES_URL, { method: 'GET' });
      if (response === null || !response.ok) return;
      this.entries.set(((await response.json()) as DiaryEntriesResponse).entries);
    } catch {
      this.error.set(MESSAGE_UNREACHABLE);
    }
  }

  private async loadViews(): Promise<void> {
    try {
      const response = await this.ownerFetch(VIEWS_URL, { method: 'GET' });
      if (response === null || !response.ok) return;
      const body = (await response.json()) as DiaryViewsResponse;
      this.views.set(body.views);
      this.backupAt.set(body.backupAt);
    } catch {
      // The owner block is optional; the page works without it.
    }
  }

  private startTracking(): void {
    if (this.isOwner() || typeof IntersectionObserver === 'undefined') return;
    const ratioObserver = new IntersectionObserver(
      (changes) => changes.forEach((change) => this.onVisibility(change, 'ratio')),
      { threshold: [SEEN_VISIBLE_RATIO] },
    );
    const centerObserver = new IntersectionObserver(
      (changes) => changes.forEach((change) => this.onVisibility(change, 'center')),
      { rootMargin: SEEN_CENTER_MARGIN },
    );
    this.observers = [ratioObserver, centerObserver];
    this.host.nativeElement.querySelectorAll<HTMLElement>('[data-entry-id]').forEach((element) => {
      ratioObserver.observe(element);
      centerObserver.observe(element);
    });
  }

  private onVisibility(change: IntersectionObserverEntry, source: 'ratio' | 'center'): void {
    const id = (change.target as HTMLElement).dataset['entryId'];
    if (id === undefined) return;
    const isOn =
      source === 'ratio' ? change.isIntersecting && change.intersectionRatio >= SEEN_VISIBLE_RATIO : change.isIntersecting;
    const withChange = (ids: ReadonlySet<string>): Set<string> => {
      const next = new Set(ids);
      if (isOn) next.add(id);
      else next.delete(id);
      return next;
    };
    if (source === 'ratio') this.ratioIds = withChange(this.ratioIds);
    else this.centerIds = withChange(this.centerIds);
    if (!isEngaged(this.ratioIds.has(id), this.centerIds.has(id))) {
      this.clearDwell(id);
      return;
    }
    if (this.seen.has(id) || this.dwellTimers.has(id)) return;
    this.dwellTimers.set(id, setTimeout(() => this.markSeen(id), SEEN_DWELL_MS));
  }

  private markSeen(id: string): void {
    this.dwellTimers.delete(id);
    this.seen = new Set([...this.seen, id]);
    this.flushTimer ??= setTimeout(() => void this.flush(), SEEN_FLUSH_MS);
  }

  private async flush(): Promise<void> {
    this.flushTimer = null;
    const batch = nextSeenBatch(this.sent, this.seen);
    if (batch === null) return;
    const request: DiarySeenRequest = { visitId: this.visitId, entryIds: batch };
    try {
      const response = await fetch(SEEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        keepalive: true,
      });
      if (response.ok) this.sent = new Set(batch);
    } catch {
      // Seen tracking is best effort; the next flush sends the full set again.
    }
  }

  private clearDwell(id: string): void {
    const timer = this.dwellTimers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.dwellTimers.delete(id);
  }

  /** Drops the observers, their per-entry state and pending dwell timers (read ids and the flush timer stay). */
  private resetTracking(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.ratioIds = new Set();
    this.centerIds = new Set();
    this.dwellTimers.forEach((timer) => clearTimeout(timer));
    this.dwellTimers.clear();
  }

  private stopTracking(): void {
    this.resetTracking();
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  readonly whenOf = whenOf;
  readonly whereOf = whereOf;
  readonly readOf = readOf;
}
