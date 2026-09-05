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
