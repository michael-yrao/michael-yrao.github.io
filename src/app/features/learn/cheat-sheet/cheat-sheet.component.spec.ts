import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CheatSheetComponent } from './cheat-sheet.component';
import cheatSheetsAsset from '../../../../assets/cheat-sheets.json';

// Renders every real technique from the bundled asset — a parser/content mismatch in any one
// of them (a missing required field, a variant with no complexity, etc.) fails this test
// instead of surfacing as a runtime error on the live page.
function createFixture(
  techniqueId: string,
  http: { get: (url: string, opts?: unknown) => unknown } = { get: () => of(cheatSheetsAsset) },
) {
  TestBed.configureTestingModule({
    imports: [CheatSheetComponent],
    providers: [
      provideRouter([]),
      { provide: HttpClient, useValue: http },
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

describe('CheatSheetComponent — source footer', () => {
  const techniqueId = cheatSheetsAsset.techniques[0].id;

  it('shows a "Generated <date> from <repo>" footer on a successful repo fetch', () => {
    const fixture = createFixture(techniqueId);

    const footer = fixture.nativeElement.querySelector('.cs-source-footer');

    expect(footer?.textContent).toBe(
      `Generated ${cheatSheetsAsset.generatedAt} from michael-yrao/cse-progress`,
    );
  });

  it('shows a "Bundled copy" footer when the repo fetch fails', () => {
    const http = {
      get: (url: string) =>
        url.startsWith('assets/') ? of(cheatSheetsAsset) : throwError(() => ({ status: 404 })),
    };
    const fixture = createFixture(techniqueId, http);

    const footer = fixture.nativeElement.querySelector('.cs-source-footer');

    expect(footer?.textContent).toBe(`Bundled copy (generated ${cheatSheetsAsset.generatedAt})`);
  });
});
