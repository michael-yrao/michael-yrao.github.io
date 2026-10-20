import { describe, expect, it } from 'vitest';
import type { OnboardEnv } from '../onboard/handler';
import { handle } from './handler';
import { MAX_FILES_PER_UPDATE } from './update';

const API = 'https://api.github.com';
const LEARNER = `${API}/repos/alice/cse-progress`;
const TEMPLATE = `${API}/repos/tpl/cse-coach`;
const GRAPHQL = `POST ${API}/graphql`;
const ORIGIN = 'https://progressiveoverflow.com';
const ENV: OnboardEnv = {
  GITHUB_CLIENT_ID: 'id',
  GITHUB_CLIENT_SECRET: 'secret',
  ALLOWED_ORIGINS: ORIGIN,
  TEMPLATE_OWNER: 'tpl',
  TEMPLATE_REPO: 'cse-coach',
};
const BLOB = { isBinary: false, isTruncated: false };
const FULL_UPDATE_SUBREQUESTS = 11;
const CURRENT_SUBREQUESTS = 3;

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: string | undefined;
}

type Answer = { status: number; body?: unknown };
type GraphqlAnswer = unknown | ((query: string) => unknown);

function stubFetch(rest: Record<string, Answer>, graphqlAnswers: readonly GraphqlAnswer[]) {
  const calls: Call[] = [];
  let graphqlIndex = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body as string | undefined;
    calls.push({ method, url, body });
    if (`${method} ${url}` === GRAPHQL) {
      const answer = graphqlAnswers[graphqlIndex++];
      const data = typeof answer === 'function' ? answer(String(JSON.parse(body ?? '{}').query)) : answer;
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    const answer = rest[`${method} ${url}`] ?? { status: 599 };
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function tree(entries: Record<string, string>): Answer {
  const list = Object.entries(entries).map(([path, sha]) => ({ path, sha, mode: '100644', type: 'blob' }));
  return { status: 200, body: { tree: list, truncated: false } };
}

function overview(repoVersion: string, tagNames: readonly string[]) {
  const manifest = { version: repoVersion, upstream_sha: 'old', files: { 'a.py': 'h', 'b.py': 'h' } };
  const nodes = tagNames.map((name) => ({
    name,
    target: { target: { oid: `${name}-commit`, tree: { oid: `${name}-tree` } } },
  }));
  return {
    learner: {
      ref: { target: { oid: 'head1', tree: { oid: 'lt' } } },
      manifest: { text: JSON.stringify(manifest), ...BLOB },
      version: { text: `${repoVersion}\n`, ...BLOB },
    },
    template: { refs: { nodes } },
  };
}

const TEMPLATE_MANIFEST = {
  repository: {
    manifest: {
      text: JSON.stringify({ upstream: 'tpl/cse-coach', files: { 'a.py': 'h', 'b.py': 'h2' } }),
      ...BLOB,
    },
  },
};

function blobTexts(query: string) {
  const count = (query.match(/f\d+: object/g) ?? []).length;
  const nodes = Array.from({ length: count }, (_, i) => [`f${i}`, { text: `text-${i}`, ...BLOB }]);
  return { repository: Object.fromEntries(nodes) };
}

function rest(local: Record<string, string>, refStatus = 200): Record<string, Answer> {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login: 'alice' } },
    [`GET ${LEARNER}`]: { status: 200, body: { owner: { login: 'alice', type: 'User' } } },
    [`GET ${LEARNER}/git/trees/lt?recursive=1`]: tree(local),
    [`GET ${TEMPLATE}/git/trees/v0.10.1-tree?recursive=1`]: tree({ 'a.py': 'base-a', 'b.py': 'base-b' }),
    [`GET ${TEMPLATE}/git/trees/v0.11.0-tree?recursive=1`]: tree({ 'a.py': 'up-a', 'b.py': 'up-b' }),
    [`POST ${LEARNER}/git/trees`]: { status: 201, body: { sha: 'newtree' } },
    [`POST ${LEARNER}/git/commits`]: { status: 201, body: { sha: 'newcommit' } },
    [`PATCH ${LEARNER}/git/refs/heads/main`]: { status: refStatus, body: {} },
  };
}

const IDENTITY = { owner: 'alice', repo: 'cse-progress' };
const DEFAULT_BODY = { ...IDENTITY, dryRun: false };

function request(body: Record<string, unknown>): Request {
  return new Request('https://worker.test/engine/update', {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

const WORKFLOW_PATH = '.github/workflows/x.yml';
const INSTALLATIONS = `GET ${API}/user/installations?per_page=100`;
const WORKFLOW_SUBREQUESTS = 12;
const DRY_RUN_SUBREQUESTS = 7;
const WRITE_CALLS = [
  `POST ${LEARNER}/git/trees`,
  `POST ${LEARNER}/git/commits`,
  `PATCH ${LEARNER}/git/refs/heads/main`,
];

function templateManifest(files: readonly string[]) {
  const entries = Object.fromEntries(files.map((path) => [path, 'h']));
  const text = JSON.stringify({ upstream: 'tpl/cse-coach', files: entries });
  return { repository: { manifest: { text, ...BLOB } } };
}

function workflowRows(): Row[] {
  const upstreamTree = tree({ 'a.py': 'up-a', 'b.py': 'base-b', [WORKFLOW_PATH]: 'up-x' });
  const installations = {
    status: 200,
    body: { installations: [{ account: { login: 'alice' }, permissions: { workflows: 'read' } }] },
  };
  const answers = {
    ...rest(OLD),
    [`GET ${TEMPLATE}/git/trees/v0.11.0-tree?recursive=1`]: upstreamTree,
    [INSTALLATIONS]: installations,
  };
  return [
    {
      label: 'needs workflows permission',
      stub: stubFetch(answers, [
        overview('0.10.1', TAGS),
        templateManifest(['a.py', 'b.py', WORKFLOW_PATH]),
        blobTexts,
      ]),
      status: 200,
      body: {
        version: { repo: '0.10.1', template: '0.11.0' },
        updated: ['a.py'],
        skipped: [],
        removedUpstream: [],
        notice: 'needs-workflows-permission',
      },
      subrequests: WORKFLOW_SUBREQUESTS,
      treePaths: ['a.py'],
    },
  ];
}

function deferredRow(): Row {
  const extra = Array.from({ length: MAX_FILES_PER_UPDATE + 1 }, (_, i) => `new/f${String(i).padStart(3, '0')}.py`);
  const upstream = tree({ 'a.py': 'base-a', 'b.py': 'base-b', ...Object.fromEntries(extra.map((p) => [p, 'up']))});
  const answers = { ...rest(OLD), [`GET ${TEMPLATE}/git/trees/v0.11.0-tree?recursive=1`]: upstream };
  const written = extra.slice(0, MAX_FILES_PER_UPDATE);
  return {
    label: 'deferred files',
    stub: stubFetch(answers, [overview('0.10.1', TAGS), templateManifest(['a.py', 'b.py', ...extra]), blobTexts]),
    status: 200,
    body: {
      version: { repo: '0.10.1', template: '0.11.0' },
      updated: written,
      skipped: [],
      removedUpstream: [],
    },
    treePaths: written,
    commitMessage: 'chore(engine): update toward v0.11.0 (partial)',
  };
}

const OLD = { 'a.py': 'base-a', 'b.py': 'base-b' };
const TAGS = ['v0.11.0', 'v0.10.1'];
const UPDATE_GRAPHQL = [overview('0.10.1', TAGS), TEMPLATE_MANIFEST, blobTexts];

interface Row {
  readonly label: string;
  readonly stub: ReturnType<typeof stubFetch>;
  readonly status: number;
  readonly body: unknown;
  readonly subrequests?: number;
  readonly treePaths?: readonly string[];
  readonly requestBody?: Record<string, unknown>;
  readonly forbiddenCalls?: readonly string[];
  readonly commitMessage?: string;
}

function commitMessageOf(calls: readonly Call[]): string | undefined {
  const created = calls.find((call) => call.url === `${LEARNER}/git/commits`);
  return created === undefined ? undefined : JSON.parse(created.body ?? '{}').message;
}

function createdTreePaths(calls: readonly Call[]): string[] {
  const created = calls.find((call) => call.url === `${LEARNER}/git/trees`);
  const tree = JSON.parse(created?.body ?? '{"tree":[]}').tree as { path: string }[];
  return tree.map((entry) => entry.path);
}

function rows(): Row[] {
  return [
    {
      label: 'current',
      stub: stubFetch(rest(OLD), [overview('0.11.0', TAGS)]),
      status: 200,
      body: { version: { repo: '0.11.0', template: '0.11.0' }, updated: [], skipped: [], removedUpstream: [] },
      subrequests: CURRENT_SUBREQUESTS,
    },
    {
      label: 'updates',
      stub: stubFetch(rest(OLD), UPDATE_GRAPHQL),
      status: 200,
      body: {
        version: { repo: '0.11.0', template: '0.11.0' },
        updated: ['a.py', 'b.py'],
        skipped: [],
        removedUpstream: [],
      },
      subrequests: FULL_UPDATE_SUBREQUESTS,
      treePaths: ['a.py', 'b.py', 'VERSION', '.coach-sync/manifest.json'],
    },
    {
      label: 'versions only',
      stub: stubFetch(rest(OLD), [overview('0.10.1', TAGS)]),
      requestBody: { ...IDENTITY, versionsOnly: true },
      status: 200,
      body: { version: { repo: '0.10.1', template: '0.11.0' } },
      subrequests: CURRENT_SUBREQUESTS,
      forbiddenCalls: [`GET ${LEARNER}/git/trees/lt?recursive=1`, ...WRITE_CALLS],
    },
    {
      label: 'dry run',
      stub: stubFetch(rest(OLD), UPDATE_GRAPHQL),
      requestBody: { ...IDENTITY, dryRun: true },
      status: 200,
      body: {
        version: { repo: '0.10.1', template: '0.11.0' },
        updated: ['a.py', 'b.py'],
        skipped: [],
        removedUpstream: [],
      },
      subrequests: DRY_RUN_SUBREQUESTS,
      forbiddenCalls: WRITE_CALLS,
    },
    ...workflowRows(),
    deferredRow(),
    {
      label: 'conflict skipped',
      stub: stubFetch(rest({ 'a.py': 'base-a', 'b.py': 'mine' }), UPDATE_GRAPHQL),
      status: 200,
      body: {
        version: { repo: '0.11.0', template: '0.11.0' },
        updated: ['a.py'],
        skipped: [{ path: 'b.py', reason: 'conflict' }],
        removedUpstream: [],
      },
      treePaths: ['a.py', 'VERSION', '.coach-sync/manifest.json'],
    },
    {
      label: 'moved',
      stub: stubFetch(rest(OLD, 422), UPDATE_GRAPHQL),
      status: 409,
      body: { error: 'moved' },
    },
    {
      label: 'no tags',
      stub: stubFetch(rest(OLD), [overview('0.10.1', [])]),
      status: 200,
      body: { version: { repo: '0.10.1', template: null }, updated: [], skipped: [], removedUpstream: [] },
    },
    {
      label: 'no version known',
      stub: stubFetch(rest(OLD), [
        { ...overview('0.10.1', TAGS), learner: { ref: overview('0.10.1', TAGS).learner.ref, manifest: null, version: null } },
      ]),
      status: 200,
      body: { version: { repo: null, template: '0.11.0' }, updated: [], skipped: [], removedUpstream: [] },
      subrequests: CURRENT_SUBREQUESTS,
    },
    {
      label: 'not owner',
      stub: stubFetch(
        { ...rest(OLD), [`GET ${LEARNER}`]: { status: 200, body: { owner: { login: 'bob', type: 'User' } } } },
        [],
      ),
      status: 403,
      body: { error: 'not-owner' },
    },
  ];
}

describe('POST /engine/update', () => {
  it.each(rows().map((row) => [row.label, row] as const))('%s', async (_label, row) => {
    const response = await handle(request(row.requestBody ?? DEFAULT_BODY), ENV, row.stub.fetchImpl);
    expect(response.status).toBe(row.status);
    expect(await response.json()).toEqual(row.body);
    if (row.subrequests !== undefined) expect(row.stub.calls).toHaveLength(row.subrequests);
    if (row.treePaths !== undefined) expect(createdTreePaths(row.stub.calls)).toEqual(row.treePaths);
    if (row.commitMessage !== undefined) expect(commitMessageOf(row.stub.calls)).toBe(row.commitMessage);
    const made = row.stub.calls.map((call) => `${call.method} ${call.url}`);
    for (const forbidden of row.forbiddenCalls ?? []) expect(made).not.toContain(forbidden);
  });
});
