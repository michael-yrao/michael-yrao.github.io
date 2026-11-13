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
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { WORKER_API_URL, isCoachOwner } from '../../core/data/site-links';
import { MenuComponent } from '../../shared/components/menu/menu.component';
import { DiaryBlock, blocksOf, placeEntry, todayLocal } from './diary-body';
import {
  DiaryEntry,
  DiaryEntryInput,
  DiarySaveResponse,
  DiarySeenRequest,
  DiaryUnlockResponse,
  DiaryView,
  DiaryViewsResponse,
} from './diary-contract';

const UNLOCK_URL = `${WORKER_API_URL}diary/unlock`;
const SEEN_URL = `${WORKER_API_URL}diary/seen`;
const ENTRIES_URL = `${WORKER_API_URL}diary/entries`;
const VIEWS_URL = `${WORKER_API_URL}diary/views`;
const ROBOTS_META = { name: 'robots', content: 'noindex, nofollow' };
const STATUS_UNAUTHORIZED = 401;
const STATUS_TOO_MANY = 429;

const READ_SEPARATOR = ' · ';

const MESSAGE_WRONG_PASSWORD = 'Wrong password';
const MESSAGE_TOO_MANY = 'Too many tries. Wait a minute.';
const MESSAGE_UNREACHABLE = "Couldn't reach the server.";
const MESSAGE_SAVE_FAILED = "Couldn't save.";
const AUDIT_TAB = 'audit';
const STATUS_CONFLICT = 409;
const ERROR_TITLE_TAKEN = 'title-taken';
const MESSAGE_TITLE_TAKEN = 'Title needs to be unique';
const MESSAGE_NOT_BACKED_UP = 'Not backed up';

function messageForStatus(status: number): string {
  if (status === STATUS_UNAUTHORIZED) return MESSAGE_WRONG_PASSWORD;
  if (status === STATUS_TOO_MANY) return MESSAGE_TOO_MANY;
  return MESSAGE_UNREACHABLE;
}

/** `Title already used.` for a 409 `title-taken`; every other failed write is `Couldn't save.`. */
async function saveFailureMessage(response: Response | null): Promise<string> {
  if (response?.status !== STATUS_CONFLICT) return MESSAGE_SAVE_FAILED;
  try {
    const body = (await response.json()) as { error?: string };
    return body.error === ERROR_TITLE_TAKEN ? MESSAGE_TITLE_TAKEN : MESSAGE_SAVE_FAILED;
  } catch {
    return MESSAGE_SAVE_FAILED;
  }
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
  imports: [RouterLink, MenuComponent, NgTemplateOutlet],
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
  private visitId = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly entryParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('entry'))), {
    initialValue: this.route.snapshot.queryParamMap.get('entry'),
  });

  private readonly tabParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('tab'))), {
    initialValue: this.route.snapshot.queryParamMap.get('tab'),
  });

  readonly isOwner = computed(() => isCoachOwner(this.auth.login()));
  readonly entries = signal<readonly DiaryEntry[] | null>(null);
  readonly error = signal('');
  readonly isBusy = signal(false);
  readonly views = signal<readonly DiaryView[] | null>(null);
  readonly backupAt = signal<string | null>(null);
  /** The open entry: the one named by the `entry` param; null (the home list) when missing or unknown. */
  readonly selectedEntry = computed(
    () => (this.entries() ?? []).find((entry) => entry.id === this.entryParam()) ?? null,
  );
  /** What the page shows: the open entry, the owner's Audit view (`?tab=audit`), or the home list. */
  readonly view = computed<'entry' | 'audit' | 'home'>(() => {
    if (this.selectedEntry() !== null) return 'entry';
    const isUnlocked = this.entries() !== null;
    return isUnlocked && this.isOwner() && this.tabParam() === AUDIT_TAB ? 'audit' : 'home';
  });
  readonly backupLabel = computed(() => {
    const at = this.backupAt();
    return at === null ? MESSAGE_NOT_BACKED_UP : `Backed up ${new Date(at).toLocaleString()}`;
  });
  readonly editor = signal<EditorDraft | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  /** Whether the editor's formatting key is showing; closed whenever an editor opens or cancels. */
  readonly isKeyOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.view() === 'audit') untracked(() => void this.loadViews());
    });
    effect(() => {
      if (this.editor() === null) return;
      untracked(() =>
        afterNextRender(
          () => {
            const body = this.host.nativeElement.querySelector<HTMLTextAreaElement>('textarea.editor__body');
            if (body !== null) this.autosize(body);
          },
          { injector: this.injector },
        ),
      );
    });
    effect(() => {
      const id = this.selectedEntry()?.id;
      if (id === undefined || this.visitId === '') return;
      untracked(() => {
        if (!this.isOwner()) void this.reportOpened(id);
      });
    });
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

  toggleKey(): void {
    this.isKeyOpen.update((isOpen) => !isOpen);
  }

  newEntry(): void {
    this.error.set('');
    this.pendingDeleteId.set(null);
    this.isKeyOpen.set(false);
    this.editor.set({ id: null, date: todayLocal(), title: '', body: '' });
  }

  editEntry(entry: DiaryEntry): void {
    this.error.set('');
    this.pendingDeleteId.set(null);
    this.isKeyOpen.set(false);
    this.editor.set({ id: entry.id, date: entry.date, title: entry.title, body: entry.body });
  }

  /** Sizes the textarea to its whole content so it never scrolls inside itself. */
  autosize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    // border-box height: add the borders (offsetHeight - clientHeight) on top of the content height.
    const borders = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + borders}px`;
  }

  cancelEdit(): void {
    this.pendingDeleteId.set(null);
    this.isKeyOpen.set(false);
    this.editor.set(null);
  }

  /** Puts the entry id in the `entry` query param (null shows home) and clears `tab`; a stale id shows home. */
  selectEntry(id: string | null): void {
    this.navigateTo({ entry: id, tab: null });
  }

  /** Opens the owner's Audit view: `?tab=audit` with the `entry` param removed. */
  selectAudit(): void {
    this.navigateTo({ entry: null, tab: AUDIT_TAB });
  }

  private navigateTo(queryParams: { entry: string | null; tab: string | null }): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
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
        this.error.set(await saveFailureMessage(response));
        return;
      }
      const saved = ((await response.json()) as DiarySaveResponse).entry;
      this.entries.update((list) => placeEntry(list ?? [], saved, draft.id ?? saved.id));
      this.editor.set(null);
      this.selectEntry(saved.id);
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
      this.selectEntry(null);
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

  /** Logs one opening of an entry for a visitor; the owner and a locked page send nothing. */
  private async reportOpened(entryId: string): Promise<void> {
    const request: DiarySeenRequest = { visitId: this.visitId, entryId };
    try {
      await fetch(SEEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        keepalive: true,
      });
    } catch {
      // Open tracking is best effort; a lost row is not worth interrupting the reader.
    }
  }

  readonly whenOf = whenOf;
  readonly whereOf = whereOf;
  readonly readOf = readOf;
}
