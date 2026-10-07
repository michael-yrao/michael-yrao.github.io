import { Update, collab, getSyncedVersion, receiveUpdates, sendableUpdates } from '@codemirror/collab';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

/** Holds the editor's read-only flag so the service can flip it on a live view. */
const readOnlyCompartment = new Compartment();

export interface EditorHooks {
  readonly onRegister: (view: EditorView) => void;
  readonly onUnregister: (view: EditorView) => void;
  readonly onUpdate: () => void;
}

/** The extensions that make an editor a collab client of the session and report its lifecycle to `hooks`. */
export function sessionExtensions(
  startVersion: number,
  clientID: string,
  isReadOnly: boolean,
  hooks: EditorHooks,
): readonly Extension[] {
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(private readonly view: EditorView) {
        hooks.onRegister(view);
      }
      update(): void {
        hooks.onUpdate();
      }
      destroy(): void {
        hooks.onUnregister(this.view);
      }
    },
  );
  return [collab({ startVersion, clientID }), readOnlyCompartment.of(EditorState.readOnly.of(isReadOnly)), plugin];
}

/** Sets the view's read-only flag, if it is not already that. */
export function setReadOnly(view: EditorView, isReadOnly: boolean): void {
  if (view.state.facet(EditorState.readOnly) === isReadOnly) {
    return;
  }
  try {
    view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(isReadOnly)) });
  } catch (error) {
    console.error('Could not change the editor read-only state', error);
  }
}

/** Brings the view up to the log. Idempotent: it applies only what the view has not yet seen. */
export function replayLog(view: EditorView, log: readonly Update[], logBase: number): void {
  const behind = log.slice(getSyncedVersion(view.state) - logBase);
  if (behind.length === 0) {
    return;
  }
  try {
    view.dispatch(receiveUpdates(view.state, behind));
  } catch (error) {
    console.error('Could not apply session updates to the editor', error);
  }
}

export interface EditorSyncHooks {
  /** True while the editor must not accept edits. */
  isReadOnly(): boolean;
  /** Sends the view's pending updates; returns true when they now wait for the host's acknowledgement. */
  send(version: number, updates: readonly Update[]): boolean;
}

/**
 * The editor side of a session: the registered view, the log of accepted updates it replays from,
 * and the push state that keeps at most one push in flight.
 */
export class EditorSync {
  private view: EditorView | null = null;
  /** Every accepted update from version `logBase` on. Never trimmed, so a re-created editor can replay it. */
  private log: readonly Update[] = [];
  private logBase = 0;
  private isPushScheduled = false;
  private isPushInFlight = false;

  constructor(private readonly hooks: EditorSyncHooks) {}

  /** The live editor's text, or null when no editor is mounted. */
  liveText(): string | null {
    return this.view === null ? null : this.view.state.doc.toString();
  }

  register(view: EditorView): void {
    this.view = view;
    // A dispatch is not allowed while the view is still being built; apply the read-only flag and replay the gap right after.
    queueMicrotask(() => {
      this.applyReadOnly();
      this.syncView();
    });
  }

  unregister(view: EditorView): void {
    if (this.view === view) {
      this.view = null;
    }
  }

  /** Drops the view before a new doc is set: until change detection swaps editors, the old view would sync against the new base. */
  dropView(): void {
    this.view = null;
  }

  /** Forgets the log and the push state; the next log starts at `logBase`. */
  reset(logBase = 0): void {
    this.log = [];
    this.logBase = logBase;
    this.isPushScheduled = false;
    this.isPushInFlight = false;
  }

  /** The connection is gone: nothing is scheduled or awaited any more. */
  clearPending(): void {
    this.isPushScheduled = false;
    this.isPushInFlight = false;
  }

  setLog(log: readonly Update[]): void {
    this.log = log;
  }

  /** Accepted updates arrived: they extend the log and acknowledge any push in flight. */
  appendAccepted(updates: readonly Update[]): void {
    this.log = [...this.log, ...updates];
    this.isPushInFlight = false;
  }

  /** Sets the registered view's read-only flag to match the hooks. */
  applyReadOnly(): void {
    if (this.view !== null) {
      setReadOnly(this.view, this.hooks.isReadOnly());
    }
  }

  syncView(): void {
    if (this.view !== null) {
      replayLog(this.view, this.log, this.logBase);
    }
  }

  schedulePush(): void {
    if (this.isPushScheduled) {
      return;
    }
    this.isPushScheduled = true;
    // An editor update listener must not dispatch, so the push runs on the next microtask.
    queueMicrotask(() => {
      this.isPushScheduled = false;
      this.pushLocalUpdates();
    });
  }

  private pushLocalUpdates(): void {
    const view = this.view;
    if (view === null || this.isPushInFlight) {
      return;
    }
    const updates = sendableUpdates(view.state);
    if (updates.length === 0) {
      return;
    }
    this.isPushInFlight = this.hooks.send(getSyncedVersion(view.state), updates);
  }
}
