import cheatSheetsAsset from '../../../assets/cheat-sheets.json';
import { SITE_COUNTS } from './site-counts';

describe('SITE_COUNTS', () => {
  it('cheatSheetCount matches the bundled cheat-sheets.json techniques', () => {
    expect(SITE_COUNTS.cheatSheetCount).toBe(cheatSheetsAsset.techniques.length);
  });
});
