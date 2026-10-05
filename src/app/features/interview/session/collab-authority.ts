import { Update } from '@codemirror/collab';
import { ChangeSet, Text } from '@codemirror/state';

/** The canonical document and every update accepted into it, in order. Never mutated. */
export interface Authority {
  readonly doc: Text;
  readonly updates: readonly Update[];
}

export interface PushResult {
  readonly authority: Authority;
  readonly accepted: readonly Update[];
}

export function createAuthority(doc: Text): Authority {
  return { doc, updates: [] };
}

export function authorityVersion(authority: Authority): number {
  return authority.updates.length;
}

/**
 * A push is accepted only when the client has seen every accepted update (`version` is the
 * current one); otherwise it is rejected and the authority comes back unchanged. Throws when an
 * update's changes do not fit the document.
 */
export function receivePush(authority: Authority, version: number, updates: readonly Update[]): PushResult {
  if (version !== authorityVersion(authority)) {
    return { authority, accepted: [] };
  }
  const doc = updates.reduce<Text>((current, update) => (update.changes as ChangeSet).apply(current), authority.doc);
  return { authority: { doc, updates: [...authority.updates, ...updates] }, accepted: updates };
}
