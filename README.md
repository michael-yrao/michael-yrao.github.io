# Progressive Overflow

Source for **[progressiveoverflow.com](https://progressiveoverflow.com)** — an Angular
app of interactive, step-by-step algorithm visualizations.

## Develop

```sh
npm install
npm start            # dev server at http://localhost:4200
npm run build        # production build -> dist/progressive-overflow
```

## Deploy

Deploys to GitHub Pages **automatically** on every push to the default branch via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The custom domain
(`progressiveoverflow.com`) is preserved because `src/CNAME` is copied into the build
output through `angular.json` `assets`.

**One-time setup:** in **Settings → Pages**, set **Source: GitHub Actions**.

Manual fallback (if ever needed):

```sh
npm run build
npx angular-cli-ghpages --dir=dist/progressive-overflow
```

## Progress

The [Progress page](https://progressiveoverflow.com/progress) renders a learner's
[cse-coach](https://github.com/michael-yrao/cse-coach)-driven practice log. Point it at your own
log with a `?repo=owner/name` query param, optionally `@branch`; with no param it shows the site
author's own log by default. See `/coach` for what cse-coach is.

Built by a human, with Claude in the loop.
