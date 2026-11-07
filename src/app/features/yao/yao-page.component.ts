import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { AuthService } from '../../core/auth/auth.service';
import { WORKER_API_URL, isCoachOwner } from '../../core/data/site-links';
import { YaoStory, YaoView, YaoViewsResponse } from './yao-contract';

const UNLOCK_URL = `${WORKER_API_URL}yao/unlock`;
const VIEWS_URL = `${WORKER_API_URL}yao/views`;
const ROBOTS_META = { name: 'robots', content: 'noindex, nofollow' };
const STATUS_UNAUTHORIZED = 401;
const STATUS_TOO_MANY = 429;

const MESSAGE_WRONG_PASSWORD = 'Wrong password';
const MESSAGE_TOO_MANY = 'Too many tries. Wait a minute.';
const MESSAGE_UNREACHABLE = "Couldn't reach the server.";

function messageForStatus(status: number): string {
  if (status === STATUS_UNAUTHORIZED) return MESSAGE_WRONG_PASSWORD;
  if (status === STATUS_TOO_MANY) return MESSAGE_TOO_MANY;
  return MESSAGE_UNREACHABLE;
}

/** The place of a view: `city, country`, leaving out an empty part. */
export function whereOf(view: YaoView): string {
  return [view.city, view.country].filter((part) => part !== '').join(', ');
}

/** The local date-time of a view's ISO `at`. */
export function whenOf(view: YaoView): string {
  return new Date(view.at).toLocaleString();
}

@Component({
  selector: 'app-yao-page',
  templateUrl: './yao-page.component.html',
  styleUrls: ['./yao-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YaoPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private hasAskedViews = false;

  readonly story = signal<YaoStory | null>(null);
  readonly error = signal('');
  readonly isBusy = signal(false);
  readonly views = signal<readonly YaoView[] | null>(null);

  constructor() {
    effect(() => {
      if (this.hasAskedViews || !isCoachOwner(this.auth.login())) return;
      this.hasAskedViews = true;
      untracked(() => void this.loadViews());
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
      this.story.set((await response.json()) as YaoStory);
      input.value = '';
    } catch {
      this.error.set(MESSAGE_UNREACHABLE);
    } finally {
      this.isBusy.set(false);
    }
  }

  private async loadViews(): Promise<void> {
    const token = await this.auth.getToken();
    if (token === null) return;
    try {
      const response = await fetch(VIEWS_URL, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const body = (await response.json()) as YaoViewsResponse;
      this.views.set(body.views);
    } catch {
      // The owner block is optional; the page works without it.
    }
  }

  readonly whenOf = whenOf;
  readonly whereOf = whereOf;
}
