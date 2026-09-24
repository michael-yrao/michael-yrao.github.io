import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LearnListComponent, LEARN_DECISION_TREE_ENABLED } from './learn-list.component';
import cheatSheetsAsset from '../../../../assets/cheat-sheets.json';

// The bundled asset is a copy of cse-progress's generated dashboard/cheat-sheets.json, which
// carries a real decisionTree.
const cheatSheetsWithTree = cheatSheetsAsset;
// Explicit "no tree" payload, independent of what the bundled asset itself contains — keeps
// these two tests meaning "no tree present" even if a future asset refresh changes shape.
const cheatSheetsWithoutTree = { ...cheatSheetsAsset, decisionTree: undefined };

// `queryParamMap`'s Observable is static per test — none of these tests navigate for real
// (router.navigate is spied where it matters), so a fixed param map is enough.
function makeActivatedRouteStub(view: string | null) {
  const paramMap = convertToParamMap(view ? { view } : {});
  return { queryParamMap: of(paramMap), snapshot: { queryParamMap: paramMap } };
}

function createFixture(
  http: { get: (url: string, opts?: unknown) => unknown } = { get: () => of(cheatSheetsAsset) },
  view: string | null = null,
  treeEnabled = false,
) {
  TestBed.configureTestingModule({
    imports: [LearnListComponent],
    providers: [
      provideRouter([]),
      { provide: HttpClient, useValue: http },
      { provide: ActivatedRoute, useValue: makeActivatedRouteStub(view) },
      ...(treeEnabled ? [{ provide: LEARN_DECISION_TREE_ENABLED, useValue: true }] : []),
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

  describe('Table / Decision tree toggle', () => {
    it('with the flag off, renders the table and hides the toggle even when the payload has a tree', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) });

      expect(fixture.nativeElement.querySelector('.ll-viewbar')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('app-decision-tree')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.ll-table')).toBeTruthy();
    });

    it('renders no view tablist when the payload has no decisionTree', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithoutTree) }, null, true);

      expect(fixture.nativeElement.querySelector('.ll-viewbar')).toBeFalsy();
    });

    it('renders both view tabs with Table selected by default', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, null, true);

      const tableTab: HTMLButtonElement = fixture.nativeElement.querySelector('#view-table');
      const treeTab: HTMLButtonElement = fixture.nativeElement.querySelector('#view-tree');

      expect(tableTab).toBeTruthy();
      expect(treeTab).toBeTruthy();
      expect(tableTab.getAttribute('aria-selected')).toBe('true');
      expect(treeTab.getAttribute('aria-selected')).toBe('false');
    });

    it('gives #learn-view-panel a tabpanel role labelled by the active (Table) tab', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, null, true);

      const panel: HTMLElement = fixture.nativeElement.querySelector('#learn-view-panel');

      expect(panel.getAttribute('role')).toBe('tabpanel');
      expect(panel.getAttribute('aria-labelledby')).toBe('view-table');
    });

    it('relabels #learn-view-panel to the Tree tab on ?view=tree', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, 'tree', true);

      const panel: HTMLElement = fixture.nativeElement.querySelector('#learn-view-panel');

      expect(panel.getAttribute('aria-labelledby')).toBe('view-tree');
    });

    it('?view=tree renders the decision tree, hides the table, and keeps the family cards', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, 'tree', true);

      expect(fixture.nativeElement.querySelector('app-decision-tree')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.ll-table')).toBeFalsy();
      expect(fixture.nativeElement.querySelectorAll('.ll-card').length).toBeGreaterThan(0);
    });

    it('falls back to the table on an invalid ?view= value', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, 'bogus', true);

      expect(fixture.nativeElement.querySelector('.ll-table')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-decision-tree')).toBeFalsy();
    });

    it('falls back to the table on ?view=tree when the payload has no decisionTree', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithoutTree) }, 'tree', true);

      expect(fixture.nativeElement.querySelector('.ll-table')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-decision-tree')).toBeFalsy();
    });

    it('clicking the Decision tree tab calls router.navigate with the tree view param', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, null, true);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const treeTab: HTMLButtonElement = fixture.nativeElement.querySelector('#view-tree');
      treeTab.click();
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: 'tree' }, queryParamsHandling: 'merge' }),
      );
    });

    it('ArrowRight on the Table tab navigates and moves focus to the Tree tab', () => {
      const fixture = createFixture({ get: () => of(cheatSheetsWithTree) }, null, true);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const tableTab: HTMLButtonElement = fixture.nativeElement.querySelector('#view-table');
      tableTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: 'tree' }, queryParamsHandling: 'merge' }),
      );
      const treeTab: HTMLButtonElement = fixture.nativeElement.querySelector('#view-tree');
      expect(document.activeElement).toBe(treeTab);
    });
  });
});
