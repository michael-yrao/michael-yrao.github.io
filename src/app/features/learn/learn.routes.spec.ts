import cheatSheetsAsset from '../../../assets/cheat-sheets.json';
import { LEARN_ROUTES, LEARN_SLUG_REDIRECTS } from './learn.routes';

// The 10 category slugs the site used before the technique-keyed rebuild. LEARN_SLUG_REDIRECTS
// must cover exactly these, so no old link silently 404s.
const OLD_SLUGS = [
  'arrays-hash',
  'two-pointers',
  'sliding-window',
  'binary-search',
  'linked-list',
  'trees',
  'graphs',
  'stack',
  'greedy',
  'dynamic-programming',
];

describe('LEARN_SLUG_REDIRECTS', () => {
  it('covers all 10 old category slugs', () => {
    expect(Object.keys(LEARN_SLUG_REDIRECTS).sort()).toEqual([...OLD_SLUGS].sort());
  });

  it('maps every old slug either to a known technique id or to the /learn landing page', () => {
    // 'arrays-hash' has no dedicated hash-map technique page, so it maps to '' (landing page)
    // instead of a technique id — every other old slug must resolve to a real technique.
    const techniqueIds = new Set(cheatSheetsAsset.techniques.map((t) => t.id));
    expect(LEARN_SLUG_REDIRECTS['arrays-hash']).toBe('');
    for (const [oldSlug, newSlug] of Object.entries(LEARN_SLUG_REDIRECTS)) {
      if (newSlug === '') continue;
      expect(techniqueIds.has(newSlug), `${oldSlug} -> ${newSlug} is not a known technique id`).toBe(
        true,
      );
    }
  });
});

describe('LEARN_ROUTES generated redirects', () => {
  it('never generates a redirect route whose old slug equals its new slug', () => {
    const redirectRoutes = LEARN_ROUTES.filter(
      (route) => typeof route.redirectTo === 'string' && route.path !== ':technique' && route.path !== '',
    );
    for (const route of redirectRoutes) {
      const target = (route.redirectTo as string).replace('/learn/', '');
      expect(route.path).not.toBe(target);
    }
  });

  it('redirects arrays-hash to the /learn landing page, not a technique route', () => {
    const route = LEARN_ROUTES.find((r) => r.path === 'arrays-hash');
    expect(route?.redirectTo).toBe('/learn');
  });

  it('skips a redirect route for slugs that map to themselves (sliding-window, binary-search)', () => {
    const paths = LEARN_ROUTES.map((r) => r.path);
    expect(paths).not.toContain('sliding-window');
    expect(paths).not.toContain('binary-search');
  });

  it('places every redirect route before the :technique catch-all', () => {
    const catchAllIdx = LEARN_ROUTES.findIndex((r) => r.path === ':technique');
    const redirectIdxs = LEARN_ROUTES.map((r, i) => (r.redirectTo ? i : -1)).filter((i) => i >= 0);
    for (const idx of redirectIdxs) {
      expect(idx).toBeLessThan(catchAllIdx);
    }
  });
});

// Collects every string leaf value in a JSON-shaped structure, so a single walk can check
// the whole asset for a leftover extraction placeholder.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  } else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}

describe('cheat-sheets.json content', () => {
  it('has no leftover "TODO" placeholder string anywhere in the asset', () => {
    const todoCount = collectStrings(cheatSheetsAsset).filter((s) => s === 'TODO').length;
    expect(todoCount).toBe(0);
  });

  it('gives every technique a non-empty picking.feature and whenToUse', () => {
    for (const technique of cheatSheetsAsset.techniques) {
      expect(technique.picking.feature.trim().length, `${technique.id}: empty picking.feature`).toBeGreaterThan(
        0,
      );
      expect(technique.whenToUse.trim().length, `${technique.id}: empty whenToUse`).toBeGreaterThan(0);
    }
  });
});
