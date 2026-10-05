import { Injectable, Signal, inject, signal } from '@angular/core';

import { CandidateLookup, DirectoryFailure, InterviewDirectoryService, PushOutcome } from '../directory/interview-directory.service';
import { codeUrl, generateCode, normalizeCode } from '../directory/interview-code';
import { HostKeys, generateHostKeys, parsePackedKey, signProblemAt } from './host-key';
import { InterviewProblem, SignedProblem, parseInterviewProblem } from './interview-problem';
import {
  PreparedEntry,
  findPreparedByCode,
  listPrepared,
  loadPrepared,
  markPushed,
  mirrorPreparedProblem,
  removePrepared,
  savePrepared,
} from './prepared-store';
import {
  FIRST_PROBLEM_REV,
  PreparedDetail,
  PreparedLinks,
  PreparedSummary,
  areCodesShown,
  problemFromJson,
  publishStateOf,
  summaryOf,
  withSummary,
  withTimeout,
} from './prepared-summary';
import { deriveIds } from './session-support';

export type { PreparedDetail, PreparedLinks, PreparedSummary, PublishState } from './prepared-summary';

export type CodeEntry =
  | { readonly status: 'interviewer'; readonly packed: string }
  | { readonly status: 'candidate'; readonly publicRaw: string }
  | { readonly status: 'invalid' | 'unsaved' | DirectoryFailure };

/** How long an idle prepared interview waits after its last edit before it is published. */
export const PUSH_IDLE_MS = 30_000;
/** The least time between two publishes made from a hosting tab's live edits. */
export const LIVE_PUSH_MIN_MS = 60_000;
/** How long entering an interviewer code waits for the server's copy before it keeps the local one. */
export const PULL_ON_ENTER_MS = 3_000;
/** Pushes one write may chain (a refused revision pulls, a fork pushes again) before it stops and stays pending. */
const MAX_PUSH_ATTEMPTS = 3;

interface KeyIdentity {
  readonly sessionId: string;
  readonly keys: HostKeys;
}

type PullResult = 'updated' | 'kept' | 'forked' | DirectoryFailure;

/**
 * Interviews prepared ahead of time: each is a key pair, a problem signed with it, two codes and the highest revision
 * the server accepted, kept in this browser with no expiry. Writes that sign or push are serialized on one chain, so
 * two never sign the same revision and at most one push is in flight. No code, key or problem is ever logged.
 */
@Injectable({ providedIn: 'root' })
export class PreparedInterviewsService {
  private readonly directory = inject(InterviewDirectoryService);
  private readonly listState = signal<readonly PreparedSummary[]>(this.readSummaries());
  /** Parsed keys and session id by packed key, so a repeat call never parses or derives again. */
  private readonly identities = new Map<string, Promise<KeyIdentity | null>>();
  private readonly pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly lastPushAt = new Map<string, number>();
  private chain: Promise<unknown> = Promise.resolve();

  /** Prepared interviews, newest first; a changed entry gets a new summary object. */
  readonly list: Signal<readonly PreparedSummary[]> = this.listState.asReadonly();

  /** Reads the store into `list` again, for a title a session changed. */
  refresh(): void {
    this.listState.set(this.readSummaries());
  }

  /** A new prepared interview on `problem` (new keys and codes, revision 1), then a push: its session id, or null when the problem is invalid or storage refused. */
  async prepare(problem: InterviewProblem): Promise<string | null> {
    const valid = parseInterviewProblem(problem);
    if (valid === null) {
      return null;
    }
    try {
      const sessionId = await this.createEntry(valid);
      if (sessionId !== null) {
        this.enqueueQuietly(() => this.pushNow(sessionId));
      }
      return sessionId;
    } catch {
      console.error('Prepared interviews: could not create an entry');
      return null;
    }
  }

  /** Signs revision + 1 of `problem` locally and schedules the push; true without a write when the JSON is unchanged. */
  update(sessionId: string, problem: InterviewProblem): Promise<boolean> {
    return this.enqueue(() => this.updateNow(sessionId, problem));
  }

  /** A hosting or joined session's verified problem: saved here when newer; only a hosting tab publishes it, at most once per `LIVE_PUSH_MIN_MS`. */
  mirror(sessionId: string, signed: SignedProblem, isHosting: boolean): void {
    this.enqueueQuietly(async () => {
      if (mirrorPreparedProblem(sessionId, signed)) {
        this.patchList(sessionId);
        if (isHosting) {
          this.scheduleMirrorPush(sessionId);
        }
      }
    });
  }

  async detail(sessionId: string, baseUrl: string): Promise<PreparedDetail | null> {
    const entry = loadPrepared(sessionId);
    const problem = entry === null ? null : problemFromJson(entry.problem.json);
    if (entry === null || problem === null) {
      return null;
    }
    const areShown = areCodesShown(entry, this.directory.isEnabled);
    const [candidateCode, interviewerCode] = areShown ? [entry.candidateCode, entry.interviewerCode] : ['', ''];
    return {
      sessionId,
      problem,
      rev: entry.problem.rev,
      candidateCode,
      interviewerCode,
      candidateUrl: areShown ? codeUrl(baseUrl, candidateCode) : '',
      interviewerUrl: areShown ? codeUrl(baseUrl, interviewerCode) : '',
      publish: publishStateOf(entry, this.directory.isEnabled),
    };
  }

  /** The two code links for the entry holding `packed`; null when there is none or its codes are not shown yet. */
  async linksForKey(packed: string, baseUrl: string): Promise<PreparedLinks | null> {
    const identity = await this.identityOf(packed);
    if (identity === null) {
      return null;
    }
    const entry = loadPrepared(identity.sessionId);
    if (entry === null || entry.packed !== packed || !areCodesShown(entry, this.directory.isEnabled)) {
      return null;
    }
    return { candidateUrl: codeUrl(baseUrl, entry.candidateCode), interviewerUrl: codeUrl(baseUrl, entry.interviewerCode) };
  }

  /** Resolves what a person typed: an interviewer code opens (and saves) the interview, a candidate code gives its public key. */
  async enterCode(input: string): Promise<CodeEntry> {
    const parsed = normalizeCode(input);
    if (parsed === null) {
      return { status: 'invalid' };
    }
    return parsed.role === 'candidate' ? this.enterCandidate(parsed.code) : this.enterInterviewer(parsed.code);
  }

  /** Takes the server's copy when it is newer, publishes ours when it is older, and forks when both moved. */
  pullIfNewer(sessionId: string): Promise<PullResult> {
    return this.enqueue(() => this.pullNow(sessionId, MAX_PUSH_ATTEMPTS));
  }

  /** Pushes now what is waiting: for `sessionId`, or for every session with a push scheduled. */
  async flush(sessionId?: string): Promise<void> {
    const ids = sessionId === undefined ? [...this.pushTimers.keys()] : [sessionId];
    ids.forEach((id) => this.clearTimer(id));
    await this.enqueue(async () => {
      for (const id of ids) {
        await this.pushNow(id);
      }
    });
  }

  /** On load: pushes every entry the server has not accepted at its current revision. */
  async retryUnpublished(): Promise<void> {
    const waiting = listPrepared().filter((entry) => entry.pushedRev < entry.problem.rev);
    await this.enqueue(async () => {
      for (const entry of waiting) {
        await this.pushNow(entry.sessionId);
      }
    });
  }

  /**
   * Deletes the prepared interview from this browser: true once it is gone, false when it stays. An entry the server
   * accepted at least once is deleted there first, after its waiting push is cancelled; a server that cannot be
   * reached keeps the entry here. A refused delete is logged and the entry is removed here anyway, because this
   * browser can never delete that record. An entry never published, or any entry with codes switched off, is
   * removed here with no request.
   */
  remove(sessionId: string): Promise<boolean> {
    return this.enqueue(async () => {
      const entry = loadPrepared(sessionId);
      if (entry === null || entry.pushedRev < FIRST_PROBLEM_REV || !this.directory.isEnabled) {
        this.removeLocal(sessionId);
        return true;
      }
      this.clearTimer(sessionId);
      const outcome = await this.directory.remove(entry.interviewerCode);
      if (outcome === 'offline') {
        return false;
      }
      if (outcome === 'forbidden') {
        console.error('Prepared interviews: this browser cannot delete the published copy');
      }
      this.removeLocal(sessionId);
      return true;
    });
  }

  packedOf(sessionId: string): string | null {
    return loadPrepared(sessionId)?.packed ?? null;
  }

  // ---- the serialized chain ----

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task);
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** For work nobody awaits: a failure is named, never rethrown, and never carries a value. */
  private enqueueQuietly(task: () => Promise<void>): void {
    this.enqueue(task).catch(() => console.error('Prepared interviews: a background write failed'));
  }

  private async updateNow(sessionId: string, problem: InterviewProblem): Promise<boolean> {
    const entry = loadPrepared(sessionId);
    const valid = parseInterviewProblem(problem);
    const identity = entry === null ? null : await this.identityOf(entry.packed);
    if (entry === null || valid === null || identity === null) {
      return false;
    }
    if (JSON.stringify(valid) === entry.problem.json) {
      return true;
    }
    const signed = await signProblemAt(identity.keys.privateKey, identity.sessionId, entry.problem.rev + 1, valid);
    if (!savePrepared(sessionId, { ...entry, problem: signed })) {
      return false;
    }
    this.patchList(sessionId);
    this.schedule(sessionId, PUSH_IDLE_MS);
    return true;
  }

  // ---- creating and entering ----

  private async createEntry(problem: InterviewProblem): Promise<string | null> {
    const keys = await generateHostKeys();
    const { sessionId } = await deriveIds(keys);
    const signed = await signProblemAt(keys.privateKey, sessionId, FIRST_PROBLEM_REV, problem);
    const entry: PreparedEntry = {
      packed: keys.packed,
      problem: signed,
      createdAt: Date.now(),
      candidateCode: generateCode('candidate'),
      interviewerCode: generateCode('interviewer'),
      pushedRev: 0,
    };
    if (!savePrepared(sessionId, entry)) {
      return null;
    }
    this.identities.set(keys.packed, Promise.resolve({ sessionId, keys }));
    this.patchList(sessionId);
    return sessionId;
  }

  private async enterCandidate(code: string): Promise<CodeEntry> {
    if (!this.directory.isEnabled) {
      return this.localCandidate(code);
    }
    const lookup: CandidateLookup = await this.directory.lookupCandidate(code);
    return lookup.status === 'found' ? { status: 'candidate', publicRaw: lookup.publicRaw } : { status: lookup.status };
  }

  /** With codes switched off, a candidate code works only for an interview prepared in this browser. */
  private async localCandidate(code: string): Promise<CodeEntry> {
    const entry = listPrepared().find((item) => item.candidateCode === code);
    const identity = entry === undefined ? null : await this.identityOf(entry.packed);
    return identity === null ? { status: 'disabled' } : { status: 'candidate', publicRaw: identity.keys.publicRaw };
  }

  private async enterInterviewer(code: string): Promise<CodeEntry> {
    const local = findPreparedByCode(code);
    if (local === null) {
      return this.fetchAndSave(code);
    }
    await withTimeout(this.pullIfNewer(local.sessionId), PULL_ON_ENTER_MS, 'kept');
    return { status: 'interviewer', packed: local.packed };
  }

  /** The server's copy of an interviewer code this browser does not hold, saved as a local entry. */
  private async fetchAndSave(code: string): Promise<CodeEntry> {
    const fetched = await this.directory.fetchInterviewer(code);
    if (fetched.status !== 'found') {
      return { status: fetched.status };
    }
    const { entry } = fetched;
    const identity = await this.identityOf(entry.packed);
    if (identity === null) {
      return { status: 'unreadable' };
    }
    const saved: PreparedEntry = {
      packed: entry.packed,
      problem: entry.problem,
      createdAt: entry.createdAt,
      candidateCode: entry.candidateCode,
      interviewerCode: code,
      pushedRev: fetched.rev,
    };
    if (loadPrepared(identity.sessionId) === null && !savePrepared(identity.sessionId, saved)) {
      return { status: 'unsaved' };
    }
    this.patchList(identity.sessionId);
    return { status: 'interviewer', packed: entry.packed };
  }

  // ---- pushing and pulling ----

  private async pushNow(sessionId: string, attempts = MAX_PUSH_ATTEMPTS): Promise<void> {
    const entry = loadPrepared(sessionId);
    if (attempts <= 0 || entry === null || !this.directory.isEnabled || entry.pushedRev >= entry.problem.rev) {
      return;
    }
    this.lastPushAt.set(sessionId, Date.now());
    const result = await this.directory.push(entry);
    await this.applyPush(sessionId, entry, result.outcome, attempts - 1);
  }

  private async applyPush(sessionId: string, entry: PreparedEntry, outcome: PushOutcome, attemptsLeft: number): Promise<void> {
    if (outcome === 'published') {
      markPushed(sessionId, entry.problem.rev);
      this.patchList(sessionId);
    } else if (outcome === 'stale') {
      await this.pullNow(sessionId, attemptsLeft);
    } else if (outcome === 'candidate-taken' && entry.pushedRev === 0) {
      // A code that has been shown never changes; one the server never accepted can.
      savePrepared(sessionId, { ...entry, candidateCode: generateCode('candidate') });
      await this.pushNow(sessionId, attemptsLeft);
    } else if (outcome === 'deleted') {
      this.removeLocal(sessionId);
    }
    // offline, rate-limited, forbidden and disabled leave the entry pending; the next update or load retries it.
  }

  private async pullNow(sessionId: string, attempts: number): Promise<PullResult> {
    const entry = loadPrepared(sessionId);
    if (entry === null) {
      return 'not-found';
    }
    if (!this.directory.isEnabled) {
      return 'disabled';
    }
    const fetched = await this.directory.fetchInterviewer(entry.interviewerCode);
    if (fetched.status === 'found') {
      return fetched.entry.packed === entry.packed ? this.reconcile(sessionId, entry, fetched.rev, fetched.entry.problem, attempts) : 'kept';
    }
    if (fetched.status === 'not-found') {
      // The record expired: it was never, or is no longer, on the server.
      savePrepared(sessionId, { ...entry, pushedRev: 0 });
      await this.pushNow(sessionId, attempts);
      this.patchList(sessionId);
      return 'not-found';
    }
    if (fetched.status === 'deleted') {
      this.removeLocal(sessionId);
      return 'deleted';
    }
    return fetched.status === 'unreadable' ? 'kept' : fetched.status;
  }

  /** `remote` is a verified copy at `remoteRev`; decides which side wins. */
  private async reconcile(sessionId: string, entry: PreparedEntry, remoteRev: number, remote: SignedProblem, attempts: number): Promise<PullResult> {
    const localRev = entry.problem.rev;
    if (remoteRev > localRev) {
      savePrepared(sessionId, { ...entry, problem: remote, pushedRev: remoteRev });
      this.patchList(sessionId);
      return 'updated';
    }
    if (remoteRev < localRev) {
      await this.pushNow(sessionId, attempts);
      return 'kept';
    }
    if (remote.signature === entry.problem.signature) {
      markPushed(sessionId, remoteRev);
      this.patchList(sessionId);
      return 'kept';
    }
    return (await this.fork(sessionId, entry, remoteRev, attempts)) ? 'forked' : 'kept';
  }

  /** Both sides signed the same revision differently: the local problem is signed again above the server's and pushed. */
  private async fork(sessionId: string, entry: PreparedEntry, remoteRev: number, attempts: number): Promise<boolean> {
    const identity = await this.identityOf(entry.packed);
    const problem = problemFromJson(entry.problem.json);
    if (identity === null || problem === null) {
      return false;
    }
    const signed = await signProblemAt(identity.keys.privateKey, identity.sessionId, remoteRev + 1, problem);
    if (!savePrepared(sessionId, { ...entry, problem: signed })) {
      return false;
    }
    this.patchList(sessionId);
    await this.pushNow(sessionId, attempts);
    return true;
  }

  // ---- timers ----

  private schedule(sessionId: string, delayMs: number): void {
    this.clearTimer(sessionId);
    this.pushTimers.set(
      sessionId,
      setTimeout(() => {
        this.pushTimers.delete(sessionId);
        this.enqueueQuietly(() => this.pushNow(sessionId));
      }, delayMs),
    );
  }

  /** A live edit's push waits out what is left of `LIVE_PUSH_MIN_MS`; one already scheduled is kept. */
  private scheduleMirrorPush(sessionId: string): void {
    if (this.pushTimers.has(sessionId)) {
      return;
    }
    const sinceLast = Date.now() - (this.lastPushAt.get(sessionId) ?? -LIVE_PUSH_MIN_MS);
    this.schedule(sessionId, Math.max(0, LIVE_PUSH_MIN_MS - sinceLast));
  }

  private clearTimer(sessionId: string): void {
    clearTimeout(this.pushTimers.get(sessionId));
    this.pushTimers.delete(sessionId);
  }

  // ---- local state ----

  private removeLocal(sessionId: string): void {
    const packed = loadPrepared(sessionId)?.packed;
    removePrepared(sessionId);
    if (packed !== undefined) {
      this.identities.delete(packed);
    }
    this.clearTimer(sessionId);
    this.lastPushAt.delete(sessionId);
    this.listState.update((summaries) => summaries.filter((item) => item.sessionId !== sessionId));
  }

  /** A new summary object for `sessionId` from what the store holds now, so a reader of `list` sees it changed. */
  private patchList(sessionId: string): void {
    const entry = loadPrepared(sessionId);
    if (entry !== null) {
      const summary = summaryOf(sessionId, entry, this.directory.isEnabled);
      this.listState.update((summaries) => withSummary(summaries, summary));
    }
  }

  private readSummaries(): readonly PreparedSummary[] {
    return listPrepared().map((entry) => summaryOf(entry.sessionId, entry, this.directory.isEnabled));
  }

  /** The keys and session id for `packed`, parsed once; null when the key is invalid. */
  private identityOf(packed: string): Promise<KeyIdentity | null> {
    const cached = this.identities.get(packed);
    if (cached !== undefined) {
      return cached;
    }
    const parsed = this.parseIdentity(packed);
    this.identities.set(packed, parsed);
    return parsed;
  }

  private async parseIdentity(packed: string): Promise<KeyIdentity | null> {
    const keys = await parsePackedKey(packed);
    return keys === null ? null : { keys, sessionId: (await deriveIds(keys)).sessionId };
  }
}
