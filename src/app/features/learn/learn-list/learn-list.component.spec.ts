import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LearnListComponent } from './learn-list.component';
import cheatSheetsAsset from '../../../../assets/cheat-sheets.json';

function createFixture(http: { get: (url: string, opts?: unknown) => unknown } = { get: () => of(cheatSheetsAsset) }) {
  TestBed.configureTestingModule({
    imports: [LearnListComponent],
    providers: [provideRouter([]), { provide: HttpClient, useValue: http }],
  });
  const fixture = TestBed.createComponent(LearnListComponent);
  fixture.detectChanges();
  return fixture;
}

describe('LearnListComponent', () => {
  it('renders one signals-table row per entry in cheat-sheets.json', () => {
    const fixture = createFixture();

    const rows = fixture.nativeElement.querySelectorAll('.ll-table tbody tr');

    expect(rows.length).toBe(cheatSheetsAsset.signals.length);
    expect(rows.length).toBe(23);
  });

  it('shows a "Generated <date> from <repo>" footer on a successful repo fetch', () => {
    const fixture = createFixture();

    const footer = fixture.nativeElement.querySelector('.ll-source-footer');

    expect(footer?.textContent).toBe(
      `Generated ${cheatSheetsAsset.generatedAt} from michael-yrao/cse-progress`,
    );
  });

  it('shows a "Bundled copy" footer when the repo fetch fails', () => {
    const http = {
      get: (url: string) =>
        url.startsWith('assets/') ? of(cheatSheetsAsset) : throwError(() => ({ status: 404 })),
    };
    const fixture = createFixture(http);

    const footer = fixture.nativeElement.querySelector('.ll-source-footer');

    expect(footer?.textContent).toBe(`Bundled copy (generated ${cheatSheetsAsset.generatedAt})`);
  });
});
