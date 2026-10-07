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

## Source list

`src/sources.ts` is the one curated list of feeds; the Angular app never duplicates it — it
renders whatever chips `EventsFeed.sources` reports at request time. See the repo-root
`CLAUDE.md` "Events" section for where each source came from and any known data-quality caveat.
