/** One accepted or pending edit on the wire: the sender's id and a `ChangeSet` as JSON. */
export interface WireUpdate {
  readonly clientID: string;
  readonly changes: readonly unknown[];
}

export interface InitMessage {
  readonly type: 'init';
  readonly problem: number;
  readonly version: number;
  readonly doc: string;
}
export interface PushMessage {
  readonly type: 'push';
  readonly version: number;
  readonly updates: readonly WireUpdate[];
}
export interface UpdatesMessage {
  readonly type: 'updates';
  readonly updates: readonly WireUpdate[];
}
export interface EndMessage {
  readonly type: 'end';
}

export interface NameMessage {
  readonly type: 'name';
  readonly name: string;
}

export type SessionMessage = InitMessage | PushMessage | UpdatesMessage | EndMessage | NameMessage;

/** The longest name, after trimming, that the wire accepts. */
export const NAME_MAX_LENGTH = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isWireUpdate(value: unknown): value is WireUpdate {
  return isRecord(value) && typeof value['clientID'] === 'string' && Array.isArray(value['changes']);
}

function isWireUpdateList(value: unknown): value is readonly WireUpdate[] {
  return Array.isArray(value) && value.every(isWireUpdate);
}

function parseShape(data: Record<string, unknown>): SessionMessage | null {
  switch (data['type']) {
    case 'init':
      return isCount(data['problem']) && isCount(data['version']) && typeof data['doc'] === 'string'
        ? { type: 'init', problem: data['problem'], version: data['version'], doc: data['doc'] }
        : null;
    case 'push':
      return isCount(data['version']) && isWireUpdateList(data['updates'])
        ? { type: 'push', version: data['version'], updates: data['updates'] }
        : null;
    case 'updates':
      return isWireUpdateList(data['updates']) ? { type: 'updates', updates: data['updates'] } : null;
    case 'end':
      return { type: 'end' };
    case 'name':
      return typeof data['name'] === 'string' && data['name'].trim().length <= NAME_MAX_LENGTH
        ? { type: 'name', name: data['name'] }
        : null;
    default:
      return null;
  }
}

/** Data from a peer is external input: returns the typed message, or null (logged) when its shape is wrong. */
export function parseSessionMessage(data: unknown): SessionMessage | null {
  const message = isRecord(data) ? parseShape(data) : null;
  if (message === null) {
    console.error('Dropped a malformed session message', data);
  }
  return message;
}
