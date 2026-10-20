import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL, isCoachOwner } from '../data/site-links';

const STATUS_URL = `${WORKER_API_URL}coach/status`;

/** Whether the Worker serves a coach at all. Asked once, and only for the coach owner; a deploy without
 *  the coach runtime answers `enabled: false`, and any failure to ask counts as not available. */
@Injectable({ providedIn: 'root' })
export class CoachAvailabilityService {
  private readonly auth = inject(AuthService);
  private readonly isAvailable = signal(false);
  private hasAsked = false;

  readonly available = this.isAvailable.asReadonly();

  constructor() {
    effect(() => {
      if (this.hasAsked || !isCoachOwner(this.auth.login())) return;
      this.hasAsked = true;
      untracked(() => void this.ask());
    });
  }

  private async ask(): Promise<void> {
    this.isAvailable.set(await this.fetchIsEnabled());
  }

  private async fetchIsEnabled(): Promise<boolean> {
    const token = await this.auth.getToken();
    if (token === null) return false;
    try {
      const response = await fetch(STATUS_URL, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return false;
      const body: unknown = await response.json();
      return typeof body === 'object' && body !== null && (body as { enabled?: unknown }).enabled !== false;
    } catch {
      return false;
    }
  }
}
