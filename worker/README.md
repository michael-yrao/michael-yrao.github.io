# po-api

A small Cloudflare Worker with two jobs for progressiveoverflow.com. It polls a curated list of
public tech-event feeds (Meetup/Luma iCal + the Snowflake Bevy JSON API), normalizes them to the
`EventsFeed` contract in `src/contract.ts`, and serves them with CORS. It also serves the
interview directory under `/interviews/`: the lookup that turns an interview code into the
record the browser needs, stored in Workers KV.

Self-contained toolchain: everything below runs inside `worker/`, with its own
`package.json`/`package-lock.json`, independent of the Angular app at the repo root. Node 24
is required (`export PATH=/opt/homebrew/opt/node@24/bin:$PATH` on a Mac with Homebrew's
keg-only `node@24`).

## Local development

```sh
cd worker
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run dev          # wrangler dev, defaults to http://localhost:8787
```

`wrangler dev` fetches the real upstream feeds (no live-data mocking), so the first request
after startup takes a couple of seconds while all 5 sources are polled concurrently; after
that the in-memory 5-minute memo in `src/index.ts` answers instantly.

`/interviews/` uses a local KV store under `worker/.wrangler/state`, so codes prepared against
`wrangler dev` exist only on this machine. Rate limiting is simulated locally from the `[[ratelimits]]` bindings.

## One-time Cloudflare setup (before the first deploy)

1. Create a free Cloudflare account (or use an existing one) and copy its **Account ID** from
   the dashboard sidebar.
2. Create an API token: **My Profile → API Tokens → Create Token**, using the **"Edit
   Cloudflare Workers"** template.
3. In this GitHub repo's **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN` — the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID` — the account ID from step 1
4. Create the KV namespace: `npx wrangler login`, then `npx wrangler kv namespace create
   INTERVIEWS`, and paste the printed id over `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.toml`.
   The API token must include **Workers KV Storage: Edit**.
5. Trigger the first deploy either by pushing a change under `worker/**` to `main`, or via
   **Actions → Deploy events worker → Run workflow** (workflow_dispatch). Alternatively,
   deploy locally once with `npx wrangler login && npx wrangler deploy`.
6. The resulting URL, `https://po-api.<your-subdomain>.workers.dev/`, goes into
   `WORKER_API_URL` in `src/app/core/data/site-links.ts` (Angular app, not this directory). Set
   `INTERVIEW_CODES_ENABLED` to true in the same edit.

### Optional: a custom domain

Only if progressiveoverflow.com's DNS is already on Cloudflare. Uncomment the `[[routes]]`
block in `wrangler.toml`, point `pattern` at a subdomain of your choosing (e.g.
`events-api.progressiveoverflow.com/*`), and add a DNS record for that hostname set to
**DNS only** (grey cloud) so it doesn't proxy through Cloudflare's CDN in a way that fights
GitHub Pages' own DNS records for the apex/`www` hostnames.

## Interview directory

`src/interviews/` serves `GET /interviews/c/{id}`, and `GET`, `PUT` and `DELETE /interviews/i/{id}`.
The wire types are in `src/interviews/contract.ts`, mirrored byte for byte in the Angular app's
`directory-contract.ts`.

The browser encrypts the interviewer's key and the problem before sending them, so the interviewer
record is ciphertext. The candidate record holds the interview's public key in the clear. Records
expire 180 days after the last save.

Rate limiting is on: the two `[[ratelimits]]` blocks in `wrangler.toml` are required, and a request
gets a 503 when a binding is missing.

## Pattern Sense sign-in

`src/auth/` serves two routes, `src/pattern-sense/` one and `src/practice/` two, for the site's GitHub sign-in and saves:

- `src/auth/`: `POST /auth/token` swaps GitHub's one-time login code for a token and returns your GitHub login.
- `src/auth/`: `POST /auth/refresh` swaps a refresh token for a new token.
- `src/pattern-sense/`: `POST /pattern-sense/save` writes `dashboard/pattern_sense_results/<YYYYMMDD>.json` to a repo you own.
- `src/practice/`: `POST /practice/save` writes an attempt to `dsa/attempts/<YYYYMMDD>/` in a repo you own.
- `src/practice/`: `POST /practice/latest` returns your newest saved attempt for a problem.

Only the origins in `ALLOWED_ORIGINS` (a `[vars]` entry in `wrangler.toml`) are served.

Setup:

1. Register a GitHub App (Settings → Developer settings → GitHub Apps → New GitHub App):
   - Visibility: public, so other cse-coach users can give it permission on their own repos.
   - Repository permissions: Contents → Read and write; every other permission off.
   - Callback URL: `https://progressiveoverflow.com/auth/callback` (plus `http://localhost:4200/auth/callback` for local dev)
   - "Request user authorization (OAuth) during installation": off.
   - "Expire user authorization tokens": on.
   - Webhook: off.

   After creating it, note the Client ID and the app slug (the last part of the app's public URL), and generate a client secret.
2. Give the app permission on your own `cse-progress` repo only: on the app's page, choose "Only select repositories" and pick it.
3. In `worker/`: put the Client ID in `wrangler.toml` as `GITHUB_CLIENT_ID`, run `npx wrangler secret put GITHUB_CLIENT_SECRET` and paste the client secret, then run `npx wrangler deploy`.
4. Fill `PATTERN_SENSE_GITHUB_APP` in `src/app/core/data/site-links.ts` with the `clientId` and `appSlug`. The Sign in and Save buttons stay hidden until both are real values.

## Source list

`src/sources.ts` is the one curated list of feeds; the Angular app never duplicates it — it
renders whatever chips `EventsFeed.sources` reports at request time. See the repo-root
`CLAUDE.md` "Events" section for where each source came from and any known data-quality caveat.
