// Owns the session document: its text and revision as of the last accepted update, the editor that mirrors it, and the epoch that tells the page to re-create that editor.
import { Signal, signal } from '@angular/core';
import { Update } from '@codemirror/collab';
import { Extension, Text } from '@codemirror/state';

import type { AuthorityChange } from '../host/session-host';
import { InitMessage, RevisedDoc, WireUpdate } from '../session-message';
import { Authority } from './collab-authority';
import { EditorSync, sessionExtensions } from './session-editor';
import { applyUpdates, decodeUpdates, textOf } from './wire-updates';

export interface SharedDoc {
  readonly version: number;
  readonly doc: string;
  /** 0 for the first doc a side sets; every later init or takeover adds 1, so the page can re-create its editor. */
  readonly epoch: number;
}

/** The collab version a document the hosting tab adopts starts at. */
export const INTERVIEWER_START_VERSION = 0;
const FIRST_EPOCH = 0;

export interface SessionDocumentHooks {
  /** True while the editor must not accept edits. */
  isReadOnly(): boolean;
  /** Sends the view's pending updates; returns true when they now wait for the host's acknowledgement. */
  send(version: number, updates: readonly Update[]): boolean;
  /** The synced text moved: the tab saves its copy. */
  persist(): void;
}

export class SessionDocument {
  /** The document as of the last accepted update, advanced one batch at a time. */
  private text: Text | null = null;
  /** The session revision of `text`: the init's revision plus the updates applied since. */
  private rev = 0;
  private readonly sharedState = signal<SharedDoc | null>(null);
  private readonly editor: EditorSync;
  /** The doc a side last set, with the collab version its editor starts from; null until the first one. */
  readonly shared: Signal<SharedDoc | null> = this.sharedState.asReadonly();

  constructor(private readonly hooks: SessionDocumentHooks) {
    this.editor = new EditorSync({ isReadOnly: () => hooks.isReadOnly(), send: (version, updates) => hooks.send(version, updates) });
  }

  /** The synced text with its revision, or null before the first init or adoption. */
  current(): RevisedDoc | null {
    return this.text === null ? null : { doc: this.text.toString(), rev: this.rev };
  }

  /**
   * What a hello carries: the live editor's text, else the synced doc, else `saved`, else nothing. The revision is
   * the synced one even when the live text has unsynced local edits.
   */
  hello(saved: () => RevisedDoc | null): RevisedDoc | null {
    const liveText = this.editor.liveText();
    return liveText === null ? (this.current() ?? saved()) : { doc: liveText, rev: this.rev };
  }

  /** The editor extensions that make a view a collab client, starting from the doc's current collab version. */
  extensions(clientId: string, isReadOnly: boolean): readonly Extension[] {
    return sessionExtensions(this.sharedState()?.version ?? INTERVIEWER_START_VERSION, clientId, isReadOnly, {
      onRegister: (view) => this.editor.register(view),
      onUnregister: (view) => this.editor.unregister(view),
      onUpdate: () => this.editor.schedulePush(),
    });
  }

  /** Forgets the doc and the editor's log. */
  reset(): void {
    this.text = null;
    this.rev = 0;
    this.sharedState.set(null);
    this.restartEditor();
  }

  /** Forgets the editor's log and pending push; the doc stays. */
  restartEditor(): void {
    this.editor.reset(INTERVIEWER_START_VERSION);
  }

  /** The tab's read-only state changed. */
  applyReadOnly(): void {
    this.editor.applyReadOnly();
  }

  /** The connection is gone: nothing is scheduled or awaited any more. */
  clearPending(): void {
    this.editor.clearPending();
  }

  /** The hosting authority was adopted (a new canonical doc) or moved on to `rev`. */
  adoptAuthority(authority: Authority, change: AuthorityChange, rev: number): void {
    this.text = authority.doc;
    this.rev = rev;
    this.editor.setLog(authority.updates);
    if (change === 'adopted') {
      this.editor.dropView();
      this.restartEditor();
      this.publish(INTERVIEWER_START_VERSION, authority.doc.toString());
    }
    this.hooks.persist();
    this.editor.syncView();
  }

  /** The host's init is the new base: its text, revision and collab version. */
  adoptInit(init: InitMessage): void {
    this.editor.dropView();
    this.editor.reset(init.version);
    this.text = textOf(init.doc);
    this.rev = init.rev;
    this.publish(init.version, init.doc);
  }

  /** Applies accepted wire updates to the synced text and the editor; a batch that does not decode or fit is dropped. */
  applyWire(wire: readonly WireUpdate[]): void {
    const updates = decodeUpdates(wire);
    const base = this.text;
    if (updates === null || base === null) {
      return;
    }
    try {
      this.text = applyUpdates(base, updates);
    } catch (error) {
      console.error('Dropped session updates that do not fit the document', error);
      return;
    }
    this.rev += updates.length;
    this.editor.appendAccepted(updates);
    this.hooks.persist();
    this.editor.syncView();
    this.editor.schedulePush();
  }

  /** Publishes `doc` at `version` as a new epoch. */
  private publish(version: number, doc: string): void {
    const previous = this.sharedState();
    this.sharedState.set({ version, doc, epoch: previous === null ? FIRST_EPOCH : previous.epoch + 1 });
  }
}
