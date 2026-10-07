// Owns who this tab is in its session: the keys it holds, the two peer ids and the two links on /interview.
import { Signal, computed, signal } from '@angular/core';

import { ClientIdentity } from './client/session-client';
import { HostKeys } from './crypto/host-key';
import { LoopIds } from './host/interviewer-loop';
import { HOST_PARAM, JOIN_PARAM } from './interview-params';
import { ParticipantRole } from './session-message';
import { buildRoleUrl, interviewUrl } from './session-support';

/** What a tab holds once it has an identity; an interviewer holds the private key too, a candidate only the public one. */
interface IdentityKeys {
  readonly sessionId: string;
  readonly publicKey: CryptoKey;
  readonly hostKeys: HostKeys | null;
  /** The id interviewer tabs register and dial; null for a candidate, which must never learn it. */
  readonly hostPeerId: string | null;
  readonly hostUrl: string | null;
  readonly inviteUrl: string | null;
}

export class SessionIdentity {
  private readonly keysState = signal<IdentityKeys | null>(null);
  private readonly linkValueState = signal<string | null>(null);

  readonly sessionId: Signal<string | null> = computed(() => this.keysState()?.sessionId ?? null);
  /** The interviewer's private link (it carries the key); null for the candidate. */
  readonly hostUrl: Signal<string | null> = computed(() => this.keysState()?.hostUrl ?? null);
  readonly inviteUrl: Signal<string | null> = computed(() => this.keysState()?.inviteUrl ?? null);

  get publicKey(): CryptoKey | null {
    return this.keysState()?.publicKey ?? null;
  }

  /** The tab was opened from this link value (`?host=` or `?join=`). */
  isOpenedWith(linkValue: string): boolean {
    return this.linkValueState() === linkValue;
  }

  /** Forgets the identity; the link value it will be rebuilt from, if any, is kept. */
  reset(linkValue: string | null = null): void {
    this.keysState.set(null);
    this.linkValueState.set(linkValue);
  }

  /** Takes the interviewer's keys and ids, and builds the two links on `/interview`, keeping `baseUrl`'s query. */
  adoptInterviewer(keys: HostKeys, sessionId: string, hostPeerId: string, baseUrl: string): void {
    const pageUrl = interviewUrl(baseUrl);
    this.linkValueState.set(keys.packed);
    this.keysState.set({
      sessionId,
      publicKey: keys.publicKey,
      hostKeys: keys,
      hostPeerId,
      hostUrl: buildRoleUrl(pageUrl, HOST_PARAM, keys.packed, JOIN_PARAM),
      inviteUrl: buildRoleUrl(pageUrl, JOIN_PARAM, keys.publicRaw, HOST_PARAM),
    });
  }

  adoptCandidate(publicKey: CryptoKey, sessionId: string): void {
    this.keysState.set({ sessionId, publicKey, hostKeys: null, hostPeerId: null, hostUrl: null, inviteUrl: null });
  }

  /** The ids an interviewer tab dials and hosts, or null without an interviewer identity. */
  loopIds(): LoopIds | null {
    const keys = this.keysState();
    return keys === null || keys.hostPeerId === null ? null : { sessionId: keys.sessionId, hostPeerId: keys.hostPeerId };
  }

  /** The keys a hosting attempt signs with; null for a candidate. */
  hostKeys(): HostKeys | null {
    return this.keysState()?.hostKeys ?? null;
  }

  /** The query params that reopen this session on `/interview`: `?host=` for an interviewer, `?join=` for the candidate; none without a session. */
  linkParams(role: 'none' | ParticipantRole): Readonly<Record<string, string>> {
    const value = this.linkValueState();
    if (value === null || role === 'none') {
      return {};
    }
    return { [role === 'interviewer' ? HOST_PARAM : JOIN_PARAM]: value };
  }

  /** What a client connection proves with, or null without an identity or a role. */
  clientIdentity(clientId: string, role: 'none' | ParticipantRole): ClientIdentity | null {
    const keys = this.keysState();
    if (keys === null || role === 'none') {
      return null;
    }
    return { sessionId: keys.sessionId, publicKey: keys.publicKey, privateKey: keys.hostKeys?.privateKey ?? null, clientId, role };
  }
}
