// Regenerates every brand asset in src/assets/brand/ from mark.svg + the palettes below.
// Run: npm run gen:brand
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BRAND_DIR = fileURLToPath(new URL('../src/assets/brand/', import.meta.url));
const FONT_DIR = fileURLToPath(new URL('../src/assets/fonts/', import.meta.url));

const PALETTE_ON_DARK = { tile: '#e8e6e3', ink: '#111315', accent: '#f5b942' };
const PALETTE_ON_LIGHT = { tile: '#111315', ink: '#e8e6e3', accent: '#f5b942' };
const PALETTE_FAVICON = { tile: '#f5b942', ink: '#e8e6e3', accent: '#111315' };

const GRAPHITE = '#111315';
const BONE = '#e8e6e3';
const AMBER = '#f5b942';
const AMBER_ON_LIGHT = '#b7791f';
const LEDE_COLOUR = '#9a9890';

const MONO_TILE =
  '<rect x="6" y="10" width="52" height="52" rx="13" fill="none" stroke="currentColor" stroke-width="4"/>';
const CURRENT_COLOR = 'currentColor';

const LOCKUP_WIDTH = 640;
const LOCKUP_HEIGHT = 96;
const LOCKUP_MARK_TRANSFORM = 'translate(0 12) scale(1.125)';
const LOCKUP_TEXT_X = 96;
const LOCKUP_TEXT_Y = 68;
const LOCKUP_FONT_SIZE = 56;
const LOCKUP_LETTER_SPACING = -1.7;
const LOCKUP_FONT_FAMILY = 'Manrope, system-ui, sans-serif';
const LOCKUP_FONT_WEIGHT = 700;
const LOCKUP_MARK_INDENT = '    ';

const FAVICON_SIZES_PX = [32, 192, 512];
const TOUCH_ICON_SIZE_PX = 180;
const TOUCH_ICON_MARK_PX = 132;
const OG_WIDTH_PX = 1200;
const OG_HEIGHT_PX = 630;
const OG_LOCKUP_SCALE = 1.6;
const OG_LEDE_TEXT = 'Spaced-repetition interview prep';
const OG_LEDE_SIZE_PX = 28;
const OG_LEDE_GAP_PX = 24;
const DEVICE_SCALE_FACTOR = 1;

const PREVIEW_NAV_MARK_PX = 28;
const PREVIEW_MONO_MARK_PX = 64;
const PREVIEW_FAVICON_SIZES_PX = [16, 32];
const PREVIEW_TOUCH_ICON_PX = 60;
const PREVIEW_OG_WIDTH_PX = 600;

const PLACEHOLDERS = ['tile', 'ink', 'accent'];
const SVG_OPEN_RE = /<svg\b[^>]*>/;
const SVG_CLOSE = '</svg>';

function fail(message) {
  throw new Error(message);
}

function fill(template, palette) {
  return Object.entries(palette).reduce(
    (svg, [key, value]) => svg.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function innerOf(svg) {
  const open = svg.match(SVG_OPEN_RE);
  if (!open) fail('mark.svg has no <svg> element');
  const start = open.index + open[0].length;
  return svg.slice(start, svg.lastIndexOf(SVG_CLOSE)).trim();
}

function assertPlaceholders(source) {
  for (const name of PLACEHOLDERS) {
    if (!source.includes(`{{${name}}}`)) fail(`mark.svg is missing the {{${name}}} placeholder`);
  }
}

function monoOf(source) {
  const tileTags = source.match(/<[a-zA-Z][^<>]*\{\{tile\}\}[^<>]*>/g) ?? [];
  if (tileTags.length !== 1) {
    fail(`mark.svg must have exactly one element using {{tile}}, found ${tileTags.length}`);
  }
  return fill(source.replace(tileTags[0], MONO_TILE), {
    ink: CURRENT_COLOR,
    accent: CURRENT_COLOR,
  });
}

function lockupOf(source, palette, wordColour, accentColour) {
  const mark = innerOf(fill(source, palette))
    .split('\n')
    .map((line) => `${LOCKUP_MARK_INDENT}${line.trim()}`)
    .join('\n');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}" ` +
    `width="${LOCKUP_WIDTH}" height="${LOCKUP_HEIGHT}" role="img" aria-label="Progressive Overflow">\n` +
    `  <g transform="${LOCKUP_MARK_TRANSFORM}">\n${mark}\n  </g>\n` +
    `  <text x="${LOCKUP_TEXT_X}" y="${LOCKUP_TEXT_Y}" font-family="${LOCKUP_FONT_FAMILY}" ` +
    `font-weight="${LOCKUP_FONT_WEIGHT}" font-size="${LOCKUP_FONT_SIZE}" ` +
    `letter-spacing="${LOCKUP_LETTER_SPACING}">` +
    `<tspan fill="${wordColour}">progressive</tspan><tspan fill="${accentColour}">overflow</tspan></text>\n` +
    `</svg>\n`
  );
}

function buildSvgs(source) {
  return {
    'mark-on-dark.svg': fill(source, PALETTE_ON_DARK),
    'mark-on-light.svg': fill(source, PALETTE_ON_LIGHT),
    'mark-mono.svg': monoOf(source),
    'favicon.svg': fill(source, PALETTE_FAVICON),
    'lockup-on-dark.svg': lockupOf(source, PALETTE_ON_DARK, BONE, AMBER),
    'lockup-on-light.svg': lockupOf(source, PALETTE_ON_LIGHT, GRAPHITE, AMBER_ON_LIGHT),
  };
}

function fontFaceCss() {
  const dataUrl = (file) =>
    `data:font/woff2;base64,${readFileSync(`${FONT_DIR}${file}`).toString('base64')}`;
  return (
    `@font-face{font-family:Manrope;font-weight:700;src:url('${dataUrl('manrope-latin.woff2')}') format('woff2')}` +
    `@font-face{font-family:Inter;font-weight:400 800;src:url('${dataUrl('inter-latin.woff2')}') format('woff2')}`
  );
}

function pageHtml(css, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

function fillViewportHtml(fontCss, svg, background) {
  const css = `${fontCss}html,body{margin:0;padding:0;background:${background}}svg{display:block;width:100%;height:100%}`;
  return pageHtml(css, svg);
}

function touchIconHtml(fontCss, svg) {
  const css =
    `${fontCss}html,body{margin:0;height:100%;background:${GRAPHITE}}` +
    `body{display:flex;align-items:center;justify-content:center}` +
    `svg{width:${TOUCH_ICON_MARK_PX}px;height:${TOUCH_ICON_MARK_PX}px}`;
  return pageHtml(css, svg);
}

function ogHtml(fontCss, lockupSvg) {
  const lockupWidth = LOCKUP_WIDTH * OG_LOCKUP_SCALE;
  const lockupHeight = LOCKUP_HEIGHT * OG_LOCKUP_SCALE;
  const css =
    `${fontCss}html,body{margin:0;height:100%;background:${GRAPHITE}}` +
    `body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${OG_LEDE_GAP_PX}px}` +
    `svg{display:block;width:${lockupWidth}px;height:${lockupHeight}px}` +
    `p{margin:0;font:400 ${OG_LEDE_SIZE_PX}px Inter,system-ui,sans-serif;color:${LEDE_COLOUR}}`;
  return pageHtml(css, `${lockupSvg}<p>${OG_LEDE_TEXT}</p>`);
}

async function assertFontsLoaded(page) {
  const isLoaded = await page.evaluate(
    () => document.fonts.check('700 56px Manrope') && document.fonts.check('400 28px Inter'),
  );
  if (!isLoaded) fail('Manrope or Inter did not load; check src/assets/fonts/*.woff2');
}

async function screenshot(context, { path, width, height, html, omitBackground }) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width, height });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.fonts].map((font) => font.load())));
    await assertFontsLoaded(page);
    await page.screenshot({ path, omitBackground });
    console.log(`wrote ${path.slice(BRAND_DIR.length)} ${width}x${height}`);
  } finally {
    await page.close();
  }
}

function rasterJobs(svgs) {
  const fontCss = fontFaceCss();
  const faviconJobs = FAVICON_SIZES_PX.map((size) => ({
    path: `${BRAND_DIR}favicon-${size}.png`,
    width: size,
    height: size,
    html: fillViewportHtml(fontCss, svgs['favicon.svg'], 'transparent'),
    omitBackground: true,
  }));
  return [
    ...faviconJobs,
    {
      path: `${BRAND_DIR}apple-touch-icon.png`,
      width: TOUCH_ICON_SIZE_PX,
      height: TOUCH_ICON_SIZE_PX,
      html: touchIconHtml(fontCss, svgs['mark-on-dark.svg']),
      omitBackground: false,
    },
    {
      path: `${BRAND_DIR}og-image.png`,
      width: OG_WIDTH_PX,
      height: OG_HEIGHT_PX,
      html: ogHtml(fontCss, svgs['lockup-on-dark.svg']),
      omitBackground: false,
    },
  ];
}

async function writeRasters(svgs) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ deviceScaleFactor: DEVICE_SCALE_FACTOR });
    for (const job of rasterJobs(svgs)) await screenshot(context, job);
  } finally {
    await browser.close();
  }
}

// Inline markup, not <img>: an SVG loaded via <img> cannot use the page's @font-face or currentColor.
function inlineSvg(svg, width) {
  return svg.trim().replace(SVG_OPEN_RE, (open) =>
    open.replace(/ width="\d+" height="\d+"/, ` width="${width}"`),
  );
}

function previewCell(label, img) {
  return `<figure>${img}<figcaption>${label}</figcaption></figure>`;
}

function previewPanel(background, name, svgs) {
  const image = (file, width) => `<img src="${file}" width="${width}" alt="">`;
  const cells = [
    previewCell('mark-on-dark.svg 64', image('mark-on-dark.svg', 64)),
    previewCell('mark-on-light.svg 64', image('mark-on-light.svg', 64)),
    previewCell('mark-mono.svg 64', inlineSvg(svgs['mark-mono.svg'], PREVIEW_MONO_MARK_PX)),
    previewCell('favicon.svg 64', image('favicon.svg', 64)),
    previewCell(`nav ${PREVIEW_NAV_MARK_PX}`, image('mark-on-dark.svg', PREVIEW_NAV_MARK_PX)),
    ...PREVIEW_FAVICON_SIZES_PX.map((size) =>
      previewCell(`favicon-32.png ${size}`, image('favicon-32.png', size)),
    ),
    previewCell('favicon-192.png 192', image('favicon-192.png', 192)),
    previewCell('favicon-512.png 512', image('favicon-512.png', 512)),
    previewCell(`apple-touch-icon.png ${PREVIEW_TOUCH_ICON_PX}`, image('apple-touch-icon.png', PREVIEW_TOUCH_ICON_PX)),
    previewCell(`apple-touch-icon.png ${TOUCH_ICON_SIZE_PX}`, image('apple-touch-icon.png', TOUCH_ICON_SIZE_PX)),
    previewCell(`lockup-on-dark.svg ${LOCKUP_WIDTH}`, inlineSvg(svgs['lockup-on-dark.svg'], LOCKUP_WIDTH)),
    previewCell(`lockup-on-light.svg ${LOCKUP_WIDTH}`, inlineSvg(svgs['lockup-on-light.svg'], LOCKUP_WIDTH)),
    previewCell(`og-image.png ${PREVIEW_OG_WIDTH_PX}`, image('og-image.png', PREVIEW_OG_WIDTH_PX)),
  ];
  const colour = background === GRAPHITE ? BONE : GRAPHITE;
  return `<section style="background:${background};color:${colour}"><h2>${name}</h2><div class="grid">${cells.join('')}</div></section>`;
}

function previewHtml(svgs) {
  const css =
    `@font-face{font-family:Manrope;font-weight:700;src:url('../fonts/manrope-latin.woff2') format('woff2')}` +
    `body{margin:0;font:12px system-ui,sans-serif;background:#808080}` +
    `section{padding:24px}h2{margin:0 0 16px;font-size:14px}` +
    `.grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end}` +
    `figure{margin:0}figcaption{margin-top:6px}img,figure>svg{display:block}`;
  const panels = [
    previewPanel(GRAPHITE, 'graphite', svgs),
    previewPanel('#ffffff', 'white', svgs),
  ].join('');
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>Brand preview</title><style>${css}</style></head><body>${panels}</body></html>\n`;
}

function writeSvgs(svgs) {
  for (const [name, svg] of Object.entries(svgs)) {
    writeFileSync(`${BRAND_DIR}${name}`, svg.endsWith('\n') ? svg : `${svg}\n`);
    console.log(`wrote ${name}`);
  }
}

async function main() {
  const source = readFileSync(`${BRAND_DIR}mark.svg`, 'utf8');
  assertPlaceholders(source);
  const svgs = buildSvgs(source);
  writeSvgs(svgs);
  await writeRasters(svgs);
  writeFileSync(`${BRAND_DIR}preview.html`, previewHtml(svgs));
  console.log('wrote preview.html');
}

main().catch((error) => {
  console.error(`gen-brand failed: ${error.message}`);
  process.exit(1);
});
