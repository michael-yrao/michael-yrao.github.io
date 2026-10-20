// POST /engine/update: bring a learner repo's engine files up to the template's newest tag with
// ONE commit. Compares git blob shas from three recursive tree listings (never per-file reads).
// Subrequests: versions 3 · current 3 · dry run 7 (8 with a workflow write) · full or partial update 11 (12).
import {
  API_BASE,
  apiHeaders,
  bearerToken,
  checkOwner,
  failure,
  isRecord,
  jsonResponse,
  readJson,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';
import {
  blobSelection,
  blobText,
  buildBlobQuery,
  createCommit,
  createTree,
  dig,
  getTree,
  graphql,
  parseBlobTexts,
  updateRef,
  type GitResult,
  type NewTreeEntry,
  type TreeEntry,
} from '../github/git-data';
import type { OnboardEnv } from '../onboard/handler';
import { OWNER_PATTERN, REPO_PATTERN } from '../pattern-sense/validate';
import {
  FILE_MODE,
  MANIFEST_PATH,
  VERSION_PATH,
  isComplete,
  isNewer,
  isWorkflowPath,
  latestTag,
  nextManifest,
  parseManifest,
  planUpdate,
  type ParsedManifest,
  type Tag,
  type TreeMap,
  type UpdatePlan,
} from './update';

export const UPDATE_PATH = '/engine/update';
const BRANCH = 'main';
const TAG_PAGE_SIZE = 100;
const INSTALLATIONS_PAGE_SIZE = 100;
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_BAD_GATEWAY = 502;
const WORKFLOWS_WRITE = 'write';
const NOTICE = 'needs-workflows-permission';

interface Ctx {
  readonly fetchImpl: FetchImpl;
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly templateOwner: string;
  readonly templateRepo: string;
  readonly cors: HeaderMap;
}

type Step<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'refused'; readonly response: Response };

interface Overview {
  readonly headOid: string;
  readonly headTreeOid: string;
  readonly manifest: ParsedManifest | null;
  readonly repoVersion: string | null;
  readonly tags: readonly Tag[];
}

interface UpdateRequest {
  readonly owner: string;
  readonly repo: string;
  readonly dryRun: boolean;
  readonly versionsOnly: boolean;
}

function ok<T>(value: T): Step<T> {
  return { kind: 'ok', value };
}

function refuse<T>(ctx: Ctx, status: number, error: string): Step<T> {
  return { kind: 'refused', response: failure(status, error, ctx.cors) };
}

function githubError<T>(ctx: Ctx): Step<T> {
  return refuse(ctx, HTTP_BAD_GATEWAY, 'github-error');
}

function parseRequest(text: string): UpdateRequest | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(body)) return null;
  const { owner, repo, dryRun, versionsOnly = false } = body;
  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return null;
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return null;
  if (typeof versionsOnly !== 'boolean') return null;
  const isDryRunOptional = versionsOnly && dryRun === undefined;
  if (typeof dryRun !== 'boolean' && !isDryRunOptional) return null;
  return { owner, repo, dryRun: dryRun === true, versionsOnly };
}

function stripV(name: string): string {
  return name.replace(/^[vV]+/, '');
}

function overviewQuery(ctx: Ctx): string {
  const learner = `owner: ${JSON.stringify(ctx.owner)}, name: ${JSON.stringify(ctx.repo)}`;
  const template = `owner: ${JSON.stringify(ctx.templateOwner)}, name: ${JSON.stringify(ctx.templateRepo)}`;
  const commit = 'oid tree { oid }';
  const refs = `refs(refPrefix: "refs/tags/", first: ${TAG_PAGE_SIZE}, orderBy: {field: TAG_COMMIT_DATE, direction: DESC})`;
  return `query {
    learner: repository(${learner}) {
      ref(qualifiedName: "refs/heads/${BRANCH}") { target { oid ... on Commit { tree { oid } } } }
      ${blobSelection('manifest', `${BRANCH}:${MANIFEST_PATH}`)}
      ${blobSelection('version', `${BRANCH}:${VERSION_PATH}`)}
    }
    template: repository(${template}) {
      ${refs} { nodes { name target { ... on Tag { target { ... on Commit { ${commit} } } } ... on Commit { ${commit} } } } }
    }
  }`;
}

function parseTag(node: unknown): Tag | null {
  const name = dig(node, 'name');
  const peeled = dig(node, 'target', 'target');
  const commit = isRecord(peeled) ? peeled : dig(node, 'target');
  const commitOid = dig(commit, 'oid');
  const treeOid = dig(commit, 'tree', 'oid');
  if (typeof name !== 'string' || typeof commitOid !== 'string' || typeof treeOid !== 'string')
    return null;
  return { name, commitOid, treeOid };
}

function parseTags(nodes: unknown): readonly Tag[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(parseTag).filter((tag): tag is Tag => tag !== null);
}

function optionalText(node: unknown): string | null {
  const result = blobText(node);
  return result.kind === 'ok' ? result.value : null;
}

async function readOverview(ctx: Ctx): Promise<Step<Overview>> {
  const data = await graphql(ctx.fetchImpl, ctx.token, overviewQuery(ctx));
  if (data.kind === 'error') return githubError(ctx);
  if (!isRecord(dig(data.value, 'template'))) return refuse(ctx, HTTP_CONFLICT, 'template-unreadable');
  const headOid = dig(data.value, 'learner', 'ref', 'target', 'oid');
  const headTreeOid = dig(data.value, 'learner', 'ref', 'target', 'tree', 'oid');
  if (typeof headOid !== 'string' || typeof headTreeOid !== 'string') return githubError(ctx);

  const manifestText = optionalText(dig(data.value, 'learner', 'manifest'));
  const manifest = manifestText === null ? null : parseManifest(manifestText);
  const versionText = optionalText(dig(data.value, 'learner', 'version'))?.trim() ?? '';
  const repoVersion = manifest?.version ?? (versionText === '' ? null : versionText);
  const tags = parseTags(dig(data.value, 'template', 'refs', 'nodes'));
  return ok({ headOid, headTreeOid, manifest, repoVersion, tags });
}

interface TemplateRead {
  readonly manifest: ParsedManifest;
  readonly baselineTreeOid: string | null;
}

async function readTemplate(ctx: Ctx, overview: Overview, latest: Tag): Promise<Step<TemplateRead>> {
  const baselineTag = overview.tags.find((tag) => tag.name === `v${overview.repoVersion}`);
  const upstreamSha = overview.manifest?.upstreamSha ?? null;
  const needsCommit = baselineTag === undefined && upstreamSha !== null;
  const target = `owner: ${JSON.stringify(ctx.templateOwner)}, name: ${JSON.stringify(ctx.templateRepo)}`;
  const baseSelection = needsCommit
    ? `base: object(oid: ${JSON.stringify(upstreamSha)}) { ... on Commit { tree { oid } } }`
    : '';
  const manifestSelection = blobSelection('manifest', `${latest.commitOid}:${MANIFEST_PATH}`);
  const query = `query { repository(${target}) { ${manifestSelection} ${baseSelection} } }`;

  const data = await graphql(ctx.fetchImpl, ctx.token, query);
  if (data.kind === 'error') return githubError(ctx);
  const text = optionalText(dig(data.value, 'repository', 'manifest'));
  const manifest = text === null ? null : parseManifest(text);
  if (manifest === null) return githubError(ctx);

  const baseOid = dig(data.value, 'repository', 'base', 'tree', 'oid');
  const baselineTreeOid = baselineTag?.treeOid ?? (typeof baseOid === 'string' ? baseOid : null);
  return ok({ manifest, baselineTreeOid });
}

async function readTrees(
  ctx: Ctx,
  headTreeOid: string,
  baselineTreeOid: string | null,
  upstreamTreeOid: string,
): Promise<Step<{ local: TreeMap; baseline: TreeMap; upstream: TreeMap }>> {
  const { fetchImpl, token } = ctx;
  const emptyBaseline: GitResult<Map<string, TreeEntry>> = { kind: 'ok', value: new Map() };
  const [local, baseline, upstream] = await Promise.all([
    getTree(fetchImpl, token, ctx.owner, ctx.repo, headTreeOid),
    baselineTreeOid === null
      ? Promise.resolve(emptyBaseline)
      : getTree(fetchImpl, token, ctx.templateOwner, ctx.templateRepo, baselineTreeOid),
    getTree(fetchImpl, token, ctx.templateOwner, ctx.templateRepo, upstreamTreeOid),
  ]);
  if (local.kind === 'error' || baseline.kind === 'error' || upstream.kind === 'error')
    return githubError(ctx);
  return ok({ local: local.value, baseline: baseline.value, upstream: upstream.value });
}

async function hasWorkflowsPermission(ctx: Ctx): Promise<boolean> {
  const url = `${API_BASE}/user/installations?per_page=${INSTALLATIONS_PAGE_SIZE}`;
  const response = await ctx.fetchImpl(url, { headers: apiHeaders(ctx.token) });
  if (response.status !== HTTP_OK) return false;
  const installations = dig(await readJson(response), 'installations');
  if (!Array.isArray(installations)) return false;
  return installations.some(
    (item) =>
      String(dig(item, 'account', 'login')).toLowerCase() === ctx.owner.toLowerCase() &&
      dig(item, 'permissions', 'workflows') === WORKFLOWS_WRITE,
  );
}

async function resolvePlan(
  ctx: Ctx,
  trees: { local: TreeMap; baseline: TreeMap; upstream: TreeMap },
  paths: ReadonlySet<string>,
): Promise<UpdatePlan> {
  const optimistic = planUpdate(trees, paths, true);
  if (!optimistic.write.some((entry) => isWorkflowPath(entry.path))) return optimistic;
  const canWrite = await hasWorkflowsPermission(ctx);
  return canWrite ? optimistic : planUpdate(trees, paths, false);
}

function today(): string {
  return new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
}

function summary(
  plan: UpdatePlan,
  versions: { repo: string | null; template: string | null },
  updated: readonly string[],
): Record<string, unknown> {
  return {
    version: versions,
    updated,
    skipped: plan.skipped,
    removedUpstream: plan.removedUpstream,
    ...(plan.withheldWorkflows ? { notice: NOTICE } : {}),
  };
}

interface Release {
  readonly tag: Tag;
  readonly version: string;
  readonly overview: Overview;
  readonly template: TemplateRead;
  readonly plan: UpdatePlan;
}

async function commitUpdate(ctx: Ctx, release: Release): Promise<Step<boolean>> {
  const { tag, version, overview, template, plan } = release;
  const complete = isComplete(plan);
  const paths = [...plan.write.map((entry) => entry.path), ...(complete ? [VERSION_PATH] : [])];
  if (paths.length === 0) return ok(false);

  const query = buildBlobQuery(ctx.templateOwner, ctx.templateRepo, tag.commitOid, paths);
  const data = await graphql(ctx.fetchImpl, ctx.token, query);
  if (data.kind === 'error') return githubError(ctx);
  const texts = parseBlobTexts(data.value, paths);
  if (texts.kind === 'error') return refuse(ctx, HTTP_BAD_GATEWAY, 'unwritable-file');

  const writes: NewTreeEntry[] = plan.write.map(({ path, mode }) => ({
    path,
    mode,
    content: texts.value.get(path) ?? '',
  }));
  const closing: NewTreeEntry[] = complete
    ? [
        { path: VERSION_PATH, mode: FILE_MODE, content: texts.value.get(VERSION_PATH) ?? '' },
        {
          path: MANIFEST_PATH,
          mode: FILE_MODE,
          content: nextManifest(template.manifest, {
            version,
            tagCommitOid: tag.commitOid,
            syncedAt: today(),
          }),
        },
      ]
    : [];
  const suffix = complete ? `to v${version}` : `toward v${version} (partial)`;
  return pushCommit(ctx, overview, [...writes, ...closing], `chore(engine): update ${suffix}`);
}

async function pushCommit(
  ctx: Ctx,
  overview: Overview,
  entries: readonly NewTreeEntry[],
  message: string,
): Promise<Step<boolean>> {
  const { fetchImpl, token, owner, repo } = ctx;
  const tree = await createTree(fetchImpl, token, owner, repo, overview.headTreeOid, entries);
  if (tree.kind === 'error') return githubError(ctx);
  const commit = await createCommit(fetchImpl, token, owner, repo, message, tree.value, overview.headOid);
  if (commit.kind === 'error') return githubError(ctx);
  const moved = await updateRef(fetchImpl, token, owner, repo, BRANCH, commit.value);
  if (moved.kind === 'moved') return refuse(ctx, HTTP_CONFLICT, 'moved');
  return moved.kind === 'ok' ? ok(true) : githubError(ctx);
}

function respond(ctx: Ctx, body: unknown): Response {
  return jsonResponse(HTTP_OK, body, ctx.cors);
}

async function planRelease(ctx: Ctx, overview: Overview, tag: Tag): Promise<Step<Release>> {
  const template = await readTemplate(ctx, overview, tag);
  if (template.kind === 'refused') return template;
  const trees = await readTrees(
    ctx,
    overview.headTreeOid,
    template.value.baselineTreeOid,
    tag.treeOid,
  );
  if (trees.kind === 'refused') return trees;
  const paths = new Set([...(overview.manifest?.files ?? []), ...template.value.manifest.files]);
  const plan = await resolvePlan(ctx, trees.value, paths);
  return ok({ tag, version: stripV(tag.name), overview, template: template.value, plan });
}

async function runUpdate(ctx: Ctx, request: UpdateRequest): Promise<Response> {
  const { dryRun, versionsOnly } = request;
  const overview = await readOverview(ctx);
  if (overview.kind === 'refused') return overview.response;
  const info = overview.value;
  const tag = latestTag(info.tags);
  if (versionsOnly) {
    const latest = tag === null ? null : stripV(tag.name);
    return respond(ctx, { version: { repo: info.repoVersion, template: latest } });
  }
  const empty = { skipped: [], removedUpstream: [], updated: [] };
  if (tag === null) return respond(ctx, { version: { repo: info.repoVersion, template: null }, ...empty });
  const template = stripV(tag.name);
  const isCurrent = info.repoVersion === null || !isNewer(tag.name, info.repoVersion);
  if (isCurrent) return respond(ctx, { version: { repo: info.repoVersion, template }, ...empty });

  const release = await planRelease(ctx, info, tag);
  if (release.kind === 'refused') return release.response;
  const { plan } = release.value;
  const updated = plan.write.map((entry) => entry.path);
  const unchanged = { repo: info.repoVersion, template };
  if (dryRun) return respond(ctx, summary(plan, unchanged, updated));

  const committed = await commitUpdate(ctx, release.value);
  if (committed.kind === 'refused') return committed.response;
  const advanced = committed.value && isComplete(plan);
  return respond(ctx, summary(plan, { repo: advanced ? template : info.repoVersion, template }, updated));
}

export async function handleEngineUpdate(
  request: Request,
  env: OnboardEnv,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const parsed = parseRequest(await request.text());
  if (parsed === null) return failure(HTTP_BAD_REQUEST, 'invalid-request', cors);

  const target = { owner: parsed.owner, repo: parsed.repo, branch: BRANCH };
  const refusal = await checkOwner(fetchImpl, token, target, cors);
  if (refusal !== null) return refusal;

  const ctx: Ctx = {
    fetchImpl,
    token,
    owner: parsed.owner,
    repo: parsed.repo,
    templateOwner: env.TEMPLATE_OWNER,
    templateRepo: env.TEMPLATE_REPO,
    cors,
  };
  try {
    return await runUpdate(ctx, parsed);
  } catch {
    return failure(HTTP_BAD_GATEWAY, 'github-error', cors);
  }
}
