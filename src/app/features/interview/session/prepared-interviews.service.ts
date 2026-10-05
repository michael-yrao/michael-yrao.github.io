import { Injectable, Signal, signal } from '@angular/core';

import { HostKeys, generateHostKeys, parsePackedKey, signProblemAt, verifyProblem } from './host-key';
import { HOST_PARAM, JOIN_PARAM } from './interview-params';
import { InterviewProblem, SignedProblem, parseInterviewProblem } from './interview-problem';
import { LINK_PROBLEM_PARAM, decodeLinkProblem, encodeLinkProblem } from './prepared-link';
import { PreparedEntry, listPrepared, loadPrepared, removePrepared, savePrepared } from './prepared-store';
import { buildRoleUrl, deriveIds, interviewUrl } from './session-support';

/** What the picker shows for one prepared interview. */
export interface PreparedSummary {
  readonly sessionId: string;
  readonly title: string;
  readonly createdAt: number;
}

export interface PreparedLinks {
  /** `?join=` only: safe to send ahead of time. */
  readonly candidateUrl: string;
  /** `?host=` plus the problem in the fragment: opens the prepared interview on any device. */
  readonly interviewerUrl: string;
}

/**
 * `saved`: the link's problem is now this browser's; `kept`: this browser already holds that revision or a newer one;
 * `unsaved`: the link is good but the browser refused the write; `invalid`: the link could not be read or verified.
 */
export type LinkImport = 'saved' | 'kept' | 'unsaved' | 'invalid';

/** The revision a prepared problem is first signed at: the one a session starts with. */
const FIRST_PROBLEM_REV = 1;

/** The problem in `json`, or null when it is not valid JSON of a valid problem. */
function problemFromJson(json: string): InterviewProblem | null {
  try {
    return parseInterviewProblem(JSON.parse(json));
  } catch {
    return null;
  }
}

function summaryOf(sessionId: string, entry: PreparedEntry): PreparedSummary {
  return { sessionId, title: problemFromJson(entry.problem.json)?.title ?? '', createdAt: entry.createdAt };
}

function readSummaries(): readonly PreparedSummary[] {
  return listPrepared().map((entry) => summaryOf(entry.sessionId, entry));
}

/** `summaries` with `summary` in place of any earlier one for its session, newest first. */
function withSummary(summaries: readonly PreparedSummary[], summary: PreparedSummary): readonly PreparedSummary[] {
  return [...summaries.filter((item) => item.sessionId !== summary.sessionId), summary].sort((a, b) => b.createdAt - a.createdAt);
}

interface CachedLink {
  readonly rev: number;
  readonly value: string;
}

interface KeyIdentity {
  readonly sessionId: string;
  readonly keys: HostKeys;
}

/**
 * Interviews prepared ahead of time: each is a key pair, a problem signed with it, and a creation time, kept in this
 * browser with no expiry. A session's edits reach the entry through `mirrorPreparedProblem`.
 */
@Injectable({ providedIn: 'root' })
export class PreparedInterviewsService {
  private readonly listState = signal<readonly PreparedSummary[]>(readSummaries());
  /** Parsed keys and session id by packed key, so a repeat call never parses or derives again. */
  private readonly identities = new Map<string, KeyIdentity>();
  /** The encoded fragment value by session id, made once per saved revision. */
  private readonly linksBySession = new Map<string, CachedLink>();

  /** Prepared interviews, newest first. */
  readonly list: Signal<readonly PreparedSummary[]> = this.listState.asReadonly();

  /** A new prepared interview on `problem`: its session id, or null when the problem is invalid or storage refused. */
  async prepare(problem: InterviewProblem): Promise<string | null> {
    const valid = parseInterviewProblem(problem);
    if (valid === null) {
      return null;
    }
    try {
      return await this.createEntry(valid);
    } catch (error) {
      console.error('Prepared interviews: a save failed', error);
      return null;
    }
  }

  /** Reads the store into `list` again, for a title a session changed. */
  refresh(): void {
    this.listState.set(readSummaries());
  }

  remove(sessionId: string): void {
    const packed = loadPrepared(sessionId)?.packed;
    removePrepared(sessionId);
    if (packed !== undefined) {
      this.identities.delete(packed);
    }
    this.linksBySession.delete(sessionId);
    this.listState.update((summaries) => summaries.filter((item) => item.sessionId !== sessionId));
  }

  /** True when this browser held an entry for `packed` and it was removed. */
  async removeForKey(packed: string): Promise<boolean> {
    const identity = await this.identityOf(packed);
    if (identity === null || loadPrepared(identity.sessionId) === null) {
      return false;
    }
    this.remove(identity.sessionId);
    return true;
  }

  packedOf(sessionId: string): string | null {
    return loadPrepared(sessionId)?.packed ?? null;
  }

  /** Both links for the prepared interview `packed` opens, built on `baseUrl`'s query; null when this browser holds none or the key is invalid. */
  async linksForKey(packed: string, baseUrl: string): Promise<PreparedLinks | null> {
    const identity = await this.identityOf(packed);
    const entry = identity === null ? null : loadPrepared(identity.sessionId);
    if (identity === null || entry === null) {
      return null;
    }
    const pageUrl = interviewUrl(baseUrl);
    const value = await this.linkValue(identity.sessionId, entry.problem);
    return {
      candidateUrl: buildRoleUrl(pageUrl, JOIN_PARAM, identity.keys.publicRaw, HOST_PARAM),
      interviewerUrl: `${buildRoleUrl(pageUrl, HOST_PARAM, entry.packed, JOIN_PARAM)}#${LINK_PROBLEM_PARAM}=${value}`,
    };
  }

  /**
   * Saves the problem in an interviewer link's fragment for the key in the same link, when the key signed it and this
   * browser holds nothing as new. Nothing is saved for a problem that does not verify.
   */
  async importLink(packed: string, value: string): Promise<LinkImport> {
    const signed = await decodeLinkProblem(value);
    const identity = signed === null ? null : await this.identityOf(packed);
    if (signed === null || identity === null) {
      return 'invalid';
    }
    const { sessionId, keys } = identity;
    if ((await verifyProblem(keys.publicKey, sessionId, signed)) === null) {
      return 'invalid';
    }
    const local = loadPrepared(sessionId);
    if (local !== null && local.problem.rev >= signed.rev) {
      return 'kept';
    }
    const entry: PreparedEntry = { packed: keys.packed, problem: signed, createdAt: local?.createdAt ?? Date.now() };
    if (!savePrepared(sessionId, entry)) {
      return 'unsaved';
    }
    this.linksBySession.set(sessionId, { rev: signed.rev, value });
    this.listState.update((summaries) => withSummary(summaries, summaryOf(sessionId, entry)));
    return 'saved';
  }

  private async createEntry(problem: InterviewProblem): Promise<string | null> {
    const keys = await generateHostKeys();
    const { sessionId } = await deriveIds(keys);
    const signed = await signProblemAt(keys.privateKey, sessionId, FIRST_PROBLEM_REV, problem);
    const entry: PreparedEntry = { packed: keys.packed, problem: signed, createdAt: Date.now() };
    if (!savePrepared(sessionId, entry)) {
      return null;
    }
    this.identities.set(keys.packed, { sessionId, keys });
    this.listState.update((summaries) => withSummary(summaries, summaryOf(sessionId, entry)));
    return sessionId;
  }

  /** The keys and session id for `packed`, parsed once; null when the key is invalid. */
  private async identityOf(packed: string): Promise<KeyIdentity | null> {
    const cached = this.identities.get(packed);
    if (cached !== undefined) {
      return cached;
    }
    const keys = await parsePackedKey(packed);
    if (keys === null) {
      return null;
    }
    const { sessionId } = await deriveIds(keys);
    const identity: KeyIdentity = { sessionId, keys };
    this.identities.set(packed, identity);
    return identity;
  }

  /** The encoded fragment value for `signed`, encoded once per revision. */
  private async linkValue(sessionId: string, signed: SignedProblem): Promise<string> {
    const cached = this.linksBySession.get(sessionId);
    if (cached !== undefined && cached.rev === signed.rev) {
      return cached.value;
    }
    const value = await encodeLinkProblem(signed);
    this.linksBySession.set(sessionId, { rev: signed.rev, value });
    return value;
  }
}
