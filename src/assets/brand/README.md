# Progressive Overflow logo

Source of truth: `mark.svg` (the geometry, with `{{tile}}`, `{{ink}}`, `{{accent}}` placeholders) and `scripts/gen-brand.mjs` (the palettes and every output).

Regenerate everything with `npm run gen:brand`. Do not edit the generated files by hand.

## Palettes

| Variant | Tile | Ink | Accent |
|---|---|---|---|
| onDark | `#e8e6e3` | `#111315` | `#f5b942` |
| onLight | `#111315` | `#e8e6e3` | `#f5b942` |
| favicon | `#f5b942` | `#e8e6e3` | `#111315` |

| Lockup | `progressive` | `overflow` |
|---|---|---|
| on dark | `#e8e6e3` | `#f5b942` |
| on light | `#111315` | `#b7791f` |

## Files

- `mark.svg` the source mark with placeholders
- `mark-on-dark.svg` mark with the onDark palette
- `mark-on-light.svg` mark with the onLight palette
- `mark-mono.svg` one colour, outlined tile, uses `currentColor`
- `favicon.svg` mark with the favicon palette
- `favicon-32.png`, `favicon-192.png`, `favicon-512.png` favicon rasters, transparent
- `apple-touch-icon.png` 180x180 mark-on-dark on graphite
- `lockup-on-dark.svg`, `lockup-on-light.svg` mark + wordmark
- `og-image.png` 1200x630 social card
- `preview.html` every output at real size on graphite and white

The favicon uses the accent tile because Chromium ignores `prefers-color-scheme` inside an SVG favicon.

The lockups' wordmark is live `<text>` in Manrope 700, so load Manrope on the page, or convert the text to outlines, before using them elsewhere.
