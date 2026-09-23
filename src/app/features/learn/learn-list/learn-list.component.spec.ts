import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LearnListComponent } from './learn-list.component';
import cheatSheetsAsset from '../../../../assets/cheat-sheets.json';

function createFixture() {
  TestBed.configureTestingModule({
    imports: [LearnListComponent],
    providers: [
      provideRouter([]),
      { provide: HttpClient, useValue: { get: () => of(cheatSheetsAsset) } },
    ],
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
});
