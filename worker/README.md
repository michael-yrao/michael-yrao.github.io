# po-events

A small Cloudflare Worker that polls a curated list of public tech-event feeds (Meetup/Luma
iCal + the Snowflake Bevy JSON API), normalizes them to the `EventsFeed` contract in
`src/contract.ts`, and serves them with CORS to progressiveoverflow.com.

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

## One-time Cloudflare setup (before the first deploy)

1. Create a free Cloudflare account (or use an existing one) and copy its **Account ID** from
   the dashboard sidebar.
2. Create an API token: **My Profile → API Tokens → Create Token**, using the **"Edit
   Cloudflare Workers"** template.
3. In this GitHub repo's **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN` — the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID` — the account ID from step 1
4. Trigger the first deploy either by pushing a change under `worker/**` to `main`, or via
   **Actions → Deploy events worker → Run workflow** (workflow_dispatch). Alternatively,
   deploy locally once with `npx wrangler login && npx wrangler deploy`.
5. The resulting URL, `https://po-events.<your-subdomain>.workers.dev/`, goes into
   `EVENTS_API_URL` in `src/app/core/data/site-links.ts` (Angular app, not this directory).

### Optional: a custom domain

Only if progressiveoverflow.com's DNS is already on Cloudflare. Uncomment the `[[routes]]`
block in `wrangler.toml`, point `pattern` at a subdomain of your choosing (e.g.
`events-api.progressiveoverflow.com/*`), and add a DNS record for that hostname set to
**DNS only** (grey cloud) so it doesn't proxy through Cloudflare's CDN in a way that fights
GitHub Pages' own DNS records for the apex/`www` hostnames.

## Source list

`src/sources.ts` is the one curated list of feeds; the Angular app never duplicates it — it
renders whatever chips `EventsFeed.sources` reports at request time. See the repo-root
`CLAUDE.md` "Events" section for where each source came from and any known data-quality caveat.
