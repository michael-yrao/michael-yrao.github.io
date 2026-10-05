import { Update } from '@codemirror/collab';
import { ChangeSet, Text } from '@codemirror/state';

import { WireUpdate } from './session-message';

export function toWire(update: Update): WireUpdate {
  return { clientID: update.clientID, changes: update.changes.toJSON() };
}

function fromWire(wire: WireUpdate): Update {
  return { clientID: wire.clientID, changes: ChangeSet.fromJSON(wire.changes) };
}

/** Decodes peer updates; a changeset that will not decode is logged and the whole batch dropped. */
export function decodeUpdates(wire: readonly WireUpdate[]): readonly Update[] | null {
  try {
    return wire.map(fromWire);
  } catch (error) {
    console.error('Dropped session updates that would not decode', error);
    return null;
  }
}

export function textOf(doc: string): Text {
  return Text.of(doc.split('\n'));
}

/** `text` with every change of `updates` applied in order; throws when a change does not fit. */
export function applyUpdates(text: Text, updates: readonly Update[]): Text {
  return updates.reduce((current, update) => (update.changes as ChangeSet).apply(current), text);
}
