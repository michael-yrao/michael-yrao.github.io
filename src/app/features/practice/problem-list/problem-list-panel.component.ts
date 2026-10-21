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
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import type { Comfort } from '../../../core/models/progress.model';
import { RepoRef, sameRef } from '../../../core/services/github-file.service';
import { ProgressService } from '../../../core/services/progress.service';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { CatalogueEntry, searchCatalogue } from '../practice-catalogue';
import { comfortByNumber } from './problem-list';

const NO_COMFORTS: ReadonlyMap<number, Comfort> = new Map();
const ROW_SELECTOR = '.problem-list__row';
const CURRENT_SELECTOR = '[aria-current="page"]';

/** A left-anchored dialog listing every problem with a search box, so the learner can jump to one.
 *  Opened while `isOpen` is true; `closed` says the user asked to close it (Escape, backdrop, a
 *  navigation, or a pick). The viewer who owns the repo also sees each problem's comfort. */
@Component({
  selector: 'app-problem-list-panel',
  templateUrl: './problem-list-panel.component.html',
  styleUrls: ['./problem-list-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, SearchBoxComponent],
})
export class ProblemListPanelComponent {
  readonly isOpen = input.required<boolean>();
  readonly catalogue = input.required<readonly CatalogueEntry[]>();
  readonly currentNumber = input.required<number | null>();
  readonly repo = input.required<RepoRef | null>();
  readonly closed = output<void>();

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly progress = inject(ProgressService);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol in the
  // practice chunk's shared bundle.
  @ViewChild('dialog', { static: true }) private readonly dialog!: ElementRef<HTMLDialogElement>;

  // Not static: the box sits under @if (isOpen()), so it resolves after the first render with the dialog open.
  @ViewChild(SearchBoxComponent) private readonly searchBox?: SearchBoxComponent;

  protected readonly query = signal('');
  protected readonly results = computed(() => searchCatalogue(this.catalogue(), this.query()));

  /** Signed in as the repo's owner: the one viewer whose progress is this repo's. */
  private readonly isOwner = computed(() => {
    const repo = this.repo();
    const login = this.auth.login();
    if (!this.auth.isSignedIn() || repo === null || login === null) return false;
    return repo.owner.toLowerCase() === login.toLowerCase();
  });

  protected readonly comforts = computed(() => {
    const details = this.progress.details();
    if (!this.isOwner() || details === null || !sameRef(this.progress.detailsSource(), this.repo())) {
      return NO_COMFORTS;
    }
    return comfortByNumber(details);
  });

  private hasRequestedProgress = false;

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      untracked(() => this.sync(isOpen));
    });
    effect(() => {
      const repo = this.repo();
      if (!this.isOpen() || !this.isOwner() || repo === null) return;
      untracked(() => this.loadProgressOnce(repo));
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.isOpen()) this.closed.emit();
      });
  }

  /** Both loads are idempotent; asking once per panel is enough. */
  private loadProgressOnce(repo: RepoRef): void {
    if (this.hasRequestedProgress) return;
    this.hasRequestedProgress = true;
    this.progress.loadSummary(`${repo.owner}/${repo.repo}@${repo.branch}`);
    this.progress.loadDetails();
  }

  /** Brings the dialog in line with `isOpen`; on open, clears the search, focuses it and centres the current row. */
  private sync(isOpen: boolean): void {
    const dialog = this.dialog.nativeElement;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }
    if (dialog.open) return;
    this.query.set('');
    dialog.showModal();
    afterNextRender(
      () => {
        this.searchBox?.focus();
        dialog.querySelector<HTMLElement>(CURRENT_SELECTOR)?.scrollIntoView?.({ block: 'center' });
      },
      { injector: this.injector },
    );
  }

  /** Escape: the dialog stays open until the parent closes it, so `closed` emits once. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  /** The dialog has no padding, so a click whose target is the dialog itself landed on the backdrop. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) this.closed.emit();
  }

  protected openFirstResult(): void {
    const first = this.results()[0];
    if (first === undefined) return;
    void this.router.navigate(['/practice', first.number], { queryParamsHandling: 'preserve' });
    this.closed.emit();
  }

  protected focusFirstRow(): void {
    this.dialog.nativeElement.querySelector<HTMLElement>(ROW_SELECTOR)?.focus();
  }

  /** ArrowUp / ArrowDown move between rows; ArrowUp on the first row returns to the search box. */
  protected onRowKey(event: KeyboardEvent): void {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    const dialog = this.dialog.nativeElement;
    const rows = Array.from(dialog.querySelectorAll<HTMLElement>(ROW_SELECTOR));
    const index = rows.indexOf(event.target as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    if (index + step < 0) {
      this.searchBox?.focus();
      return;
    }
    rows[index + step]?.focus();
  }
}
