import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { CoachContextService } from '../../core/coach/coach-context.service';
import { CoachUiService } from '../../core/coach/coach-ui.service';
import type { CoachStatus } from '../../core/models/coach.model';
import { DEMO_REPO_SLUG } from '../../core/data/site-links';
import { GitHubFileService } from '../../core/services/github-file.service';
import { PracticeService } from '../../core/services/practice.service';
import { ProgressService } from '../../core/services/progress.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CoachClientService } from './coach-client.service';
import { CoachMessageComponent } from './coach-message/coach-message.component';
import { refreshAfterTurn } from './coach-refresh';
import { CoachStatusCardComponent } from './coach-status-card/coach-status-card.component';
import { EMPTY_TRANSCRIPT, applyEvent, isStreaming, startTurn } from './coach-transcript';
import { internalLinkPath } from './markdown';
import { buildPageContext, clampMessage } from './page-context';
import { QUICK_ACTIONS } from './quick-actions';
import { buildRefreshDeps } from './refresh-deps';

const STATUS_POLL_MS = 5_000;
const MAX_WAKE_POLLS = 24;
const COST_DECIMALS = 2;
const SESSION_MARK_LENGTH = 4;
const NO_SESSION_MARK = '—';

@Component({
  selector: 'app-coach-panel',
  templateUrl: './coach-panel.component.html',
  styleUrls: ['./coach-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoachMessageComponent, CoachStatusCardComponent, IconComponent],
  providers: [CoachClientService],
  // One delegated click handler for in-message links (the transcript has no other links).
  host: { '(click)': 'onLinkClick($event)' },
})
export class CoachPanelComponent {
  private readonly client = inject(CoachClientService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly coachContext = inject(CoachContextService);
  private readonly refreshDeps = buildRefreshDeps(
    inject(ProgressService),
    inject(PracticeService),
    inject(GitHubFileService),
  );
  protected readonly ui = inject(CoachUiService);

  protected readonly quickActions = QUICK_ACTIONS;
  protected readonly transcript = signal(EMPTY_TRANSCRIPT);
  protected readonly draft = signal('');
  protected readonly status = signal<CoachStatus | null>(null);
  protected readonly isWaking = signal(false);

  protected readonly isStreaming = computed(() => isStreaming(this.transcript()));
  protected readonly isAwake = computed(() => this.status()?.awake ?? false);
  protected readonly awakeLabel = computed(() => {
    if (this.isAwake()) return 'awake';
    return this.isWaking() ? 'waking' : 'asleep';
  });
  protected readonly cost = computed(() => `$${this.transcript().sessionCostUsd.toFixed(COST_DECIMALS)}`);
  protected readonly sessionMark = computed(
    () => this.transcript().sessionId?.slice(0, SESSION_MARK_LENGTH) ?? NO_SESSION_MARK,
  );
  protected readonly canSend = computed(() => !this.isStreaming() && this.draft().trim() !== '');

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private abort: AbortController | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.transcript();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
    inject(DestroyRef).onDestroy(() => {
      this.abort?.abort();
      if (this.pollTimer !== null) clearTimeout(this.pollTimer);
    });
    this.wakeAndWatch();
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onComposerKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void this.send(this.draft());
  }

  protected onLinkClick(event: MouseEvent): void {
    const path = internalLinkPath(event.target);
    if (path === null) return;
    event.preventDefault();
    void this.router.navigateByUrl(path);
  }

  protected stop(): void {
    void this.client.interrupt();
  }

  protected startNewSession(): void {
    this.abort?.abort();
    this.abort = null;
    this.transcript.set(EMPTY_TRANSCRIPT);
    void this.refreshStatus();
  }

  protected async send(text: string): Promise<void> {
    const message = clampMessage(text.trim());
    if (message === '' || this.isStreaming()) return;
    const request = {
      sessionId: this.transcript().sessionId,
      message,
      context: buildPageContext(this.router.url, this.repoSlug(), this.coachContext.practice()),
    };
    this.transcript.update((t) => startTurn(t, message));
    this.draft.set('');
    const controller = new AbortController();
    this.abort = controller;
    for await (const event of this.client.send(request, controller.signal)) {
      this.transcript.update((t) => applyEvent(t, event));
      if (event.type !== 'turn_end') continue;
      void refreshAfterTurn(event, this.refreshDeps);
      void this.refreshStatus();
    }
    this.closeUnfinishedTurn(controller);
  }

  private closeUnfinishedTurn(controller: AbortController): void {
    if (this.abort !== controller || !this.isStreaming()) return;
    this.transcript.update((t) => applyEvent(t, { type: 'error', code: 'sdk-error' }));
  }

  private repoSlug(): string {
    return this.auth.selectedRepo() ?? DEMO_REPO_SLUG;
  }

  private async refreshStatus(): Promise<void> {
    this.status.set(await this.client.status());
  }

  /** First open: wake the container, then poll the status (bounded) until it reports awake. */
  private wakeAndWatch(): void {
    this.client.wake();
    this.isWaking.set(true);
    const poll = async (attempt: number): Promise<void> => {
      await this.refreshStatus();
      if (this.isAwake() || attempt >= MAX_WAKE_POLLS) {
        this.isWaking.set(false);
        return;
      }
      this.pollTimer = setTimeout(() => void poll(attempt + 1), STATUS_POLL_MS);
    };
    void poll(1);
  }
}
