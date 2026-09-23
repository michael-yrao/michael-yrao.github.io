import { ALL_ALGORITHMS } from './algorithms.data';
import cheatSheetsAsset from '../../../assets/cheat-sheets.json';
import { GAMES } from './games.data';
import {
  ALGORITHM_WALKTHROUGH_COUNT,
  CHEAT_SHEET_COUNT,
  LIBRARY_SECTIONS,
  PLAYABLE_GAME_COUNT,
} from './library-sections';

// library-sections.ts hardcodes these three counts (see its own comment) so the root nav
// doesn't drag the whole algorithm corpus into the initial bundle. This spec is what keeps
// them honest: it imports the real, heavy sources — something only a spec should do — and
// asserts each literal still matches that source's own count.
describe('library-sections counts', () => {
  const availableGameCount = GAMES.filter((game) => game.status === 'available').length;

  it('keeps ALGORITHM_WALKTHROUGH_COUNT in sync with ALL_ALGORITHMS.length', () => {
    expect(ALGORITHM_WALKTHROUGH_COUNT).toBe(ALL_ALGORITHMS.length);
  });

  it('keeps CHEAT_SHEET_COUNT in sync with the bundled cheat-sheets.json technique count', () => {
    expect(CHEAT_SHEET_COUNT).toBe(cheatSheetsAsset.techniques.length);
  });

  it("keeps PLAYABLE_GAME_COUNT in sync with the hub's own available-games count", () => {
    expect(PLAYABLE_GAME_COUNT).toBe(availableGameCount);
  });

  it('gives each library section a hint that contains its count', () => {
    const hintsByLabel = new Map(LIBRARY_SECTIONS.map((section) => [section.label, section.hint]));

    expect(hintsByLabel.get('Algorithms')).toContain(`${ALGORITHM_WALKTHROUGH_COUNT}`);
    expect(hintsByLabel.get('Patterns')).toContain(`${CHEAT_SHEET_COUNT}`);
    expect(hintsByLabel.get('Games')).toContain(`${PLAYABLE_GAME_COUNT}`);
  });
});
