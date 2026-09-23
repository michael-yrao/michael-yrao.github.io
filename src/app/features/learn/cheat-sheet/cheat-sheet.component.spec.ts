import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CheatSheetComponent } from './cheat-sheet.component';
import cheatSheetsAsset from '../../../../assets/cheat-sheets.json';

// Renders every real technique from the bundled asset — a parser/content mismatch in any one
// of them (a missing required field, a variant with no complexity, etc.) fails this test
// instead of surfacing as a runtime error on the live page.
function createFixture(techniqueId: string) {
  TestBed.configureTestingModule({
    imports: [CheatSheetComponent],
    providers: [
      provideRouter([]),
      { provide: HttpClient, useValue: { get: () => of(cheatSheetsAsset) } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ technique: techniqueId })) },
      },
    ],
  });
  const fixture = TestBed.createComponent(CheatSheetComponent);
  fixture.detectChanges();
  return fixture;
}

describe('CheatSheetComponent — every technique in cheat-sheets.json', () => {
  for (const technique of cheatSheetsAsset.techniques) {
    it(`renders ${technique.id} with its name in the heading, no error thrown`, () => {
      const fixture = createFixture(technique.id);

      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading?.textContent).toContain(technique.name);
    });
  }
});
