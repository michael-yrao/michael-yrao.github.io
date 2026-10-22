import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import type { ProblemProgress } from '../../../core/models/progress.model';
import { RepoRef, sameRef } from '../../../core/services/github-file.service';
import { ProgressService } from '../../../core/services/progress.service';
import { ComfortMarkComponent } from '../../../shared/components/comfort-mark/comfort-mark.component';
import { bindPopoverDismiss } from '../../../shared/components/menu/popover-dismiss';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { CatalogueEntry, searchCatalogue } from '../practice-catalogue';
import { rowByNumber } from './problem-list';

const NO_ROWS: ReadonlyMap<number, ProblemProgress> = new Map();
const APPLE_PLATFORM = /Mac|iPhone|iPad/;

let nextPopoverId = 0;

/** A "Problems" button that opens a popover under it: a search box over a scrolling list of every
 *  match (the whole catalogue while the box is empty, scrolled to the current problem). Focus stays
 *  in the box; the arrow keys move the active row and Enter opens it. Ctrl+K / Cmd+K opens it from
 *  anywhere. The viewer who owns the repo also sees each problem's comfort. */
@Component({
  selector: 'app-problem-list-panel',
  templateUrl: './problem-list-panel.component.html',
  styleUrls: ['./problem-list-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComfortMarkComponent, NgClass, RouterLink, SearchBoxComponent],
  // Host metadata rather than @HostListener: another runtime symbol would land in the practice chunk.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class ProblemListPanelComponent {
  readonly catalogue = input.required<readonly CatalogueEntry[]>();
  readonly currentNumber = input.required<number | null>();
  readonly repo = input.required<RepoRef | null>();

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly progress = inject(ProgressService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Decorator queries, not viewChild(): the signal-query helper is another runtime symbol in the
  // practice chunk's shared bundle. The box sits under @if (isOpen()), so it is not static.
  @ViewChild(SearchBoxComponent) private readonly searchBox?: SearchBoxComponent;
  @ViewChild('trigger', { static: true }) private readonly trigger!: ElementRef<HTMLButtonElement>;

  protected readonly popoverId = `problem-list-pop-${nextPopoverId++}`;
  protected readonly isApple = typeof navigator !== 'undefined' && APPLE_PLATFORM.test(navigator.platform);
  protected readonly keyHint = this.isApple ? '⌘K' : 'Ctrl K';
  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly active = signal(0);
  /** The button's bottom edge in viewport px, measured at open; only the narrow layout reads it. */
  protected readonly popTop = signal(0);

  protected readonly rows = computed(() => searchCatalogue(this.catalogue(), this.query().trim()));
  protected readonly activeId = computed(() => {
    const row = this.rows()[this.active()];
    return row === undefined ? null : this.rowId(row.number);
  });

  /** Signed in as the repo's owner: the one viewer whose progress is this repo's. */
  private readonly isOwner = computed(() => {
    const repo = this.repo();
    const login = this.auth.login();
    if (!this.auth.isSignedIn() || repo === null || login === null) return false;
    return repo.owner.toLowerCase() === login.toLowerCase();
  });

  protected readonly progressRows = computed(() => {
    const details = this.progress.details();
    if (!this.isOwner() || details === null || !sameRef(this.progress.detailsSource(), this.repo())) {
      return NO_ROWS;
    }
    return rowByNumber(details);
  });

  private hasRequestedProgress = false;

  constructor() {
    effect(() => {
      const repo = this.repo();
      if (!this.isOpen() || !this.isOwner() || repo === null) return;
      untracked(() => this.loadProgressOnce(repo));
    });
    bindPopoverDismiss({
      host: this.host,
      isOpen: () => this.isOpen(),
      dismiss: (shouldRefocus) => this.dismiss(shouldRefocus),
    });
  }

  protected rowId(number: number): string {
    return `${this.popoverId}-opt-${number}`;
  }

  protected toggle(): void {
    if (this.isOpen()) this.dismiss(true);
    else this.open();
  }

  protected onShortcut(event: KeyboardEvent): void {
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (this.isOpen()) this.searchBox?.focus();
    else this.open();
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.active.set(this.startIndex());
  }

  /** ArrowDown / ArrowUp move the active row, wrapping at both ends. */
  protected move(step: number): void {
    const count = this.rows().length;
    if (count === 0) return;
    this.active.set((this.active() + step + count) % count);
    this.scrollTo(this.activeId(), 'nearest');
  }

  protected openActive(): void {
    const row = this.rows()[this.active()];
    if (row === undefined) return;
    void this.router.navigate(['/practice', row.number], { queryParamsHandling: 'preserve' });
    this.dismiss(false);
  }

  protected close(): void {
    this.dismiss(false);
  }

  private open(): void {
    this.query.set('');
    this.active.set(this.startIndex());
    this.popTop.set(this.trigger.nativeElement.getBoundingClientRect().bottom);
    this.isOpen.set(true);
    afterNextRender(
      () => {
        this.searchBox?.focus();
        this.host.nativeElement.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'center' });
      },
      { injector: this.injector },
    );
  }

  /** Scrolls the row with this id into view; a no-op where `scrollIntoView` is missing (jsdom). */
  private scrollTo(id: string | null, block: ScrollLogicalPosition): void {
    if (id === null) return;
    this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView?.({ block });
  }

  private dismiss(shouldRefocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    if (shouldRefocus) this.trigger.nativeElement.focus();
  }

  /** With an empty box the current problem is active; otherwise the best match. */
  private startIndex(): number {
    if (this.query().trim() !== '') return 0;
    return Math.max(0, this.rows().findIndex((row) => row.number === this.currentNumber()));
  }

  /** Both loads are idempotent; asking once per panel is enough. */
  private loadProgressOnce(repo: RepoRef): void {
    if (this.hasRequestedProgress) return;
    this.hasRequestedProgress = true;
    this.progress.loadSummary(`${repo.owner}/${repo.repo}@${repo.branch}`);
    this.progress.loadDetails();
  }
}
