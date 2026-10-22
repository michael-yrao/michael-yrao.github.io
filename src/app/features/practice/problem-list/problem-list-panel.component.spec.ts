import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { RepoRef } from '../../../core/services/github-file.service';
import { ProgressService } from '../../../core/services/progress.service';
import { CatalogueEntry } from '../practice-catalogue';
import { ProblemListPanelComponent } from './problem-list-panel.component';

const REPO: RepoRef = { owner: 'Owner', repo: 'cse-progress', branch: 'main' };
const CURRENT_NUMBER = 2;
const MATCH_COUNT = 9;
const POPOVER = '.problem-list__pop';

function entry(number: number, title: string): CatalogueEntry {
  return { number, title, difficulty: 'Easy', category: null, tags: [], isRunnable: true, url: null, isVisualized: false, hasSolution: true };
}

const DEFAULT_CATALOGUE = [entry(1, 'Two Sum'), entry(CURRENT_NUMBER, 'Add Two Numbers'), entry(3, 'Longest Substring')];

@Component({
  imports: [ProblemListPanelComponent],
  template: `<app-problem-list-panel [catalogue]="catalogue" [currentNumber]="2" [repo]="repo" />`,
})
class HostComponent {
  catalogue: readonly CatalogueEntry[] = DEFAULT_CATALOGUE;
  readonly repo = REPO;
}

function setUp(login: string | null, catalogue: readonly CatalogueEntry[] = DEFAULT_CATALOGUE) {
  const progress = {
    details: signal(null),
    detailsSource: signal<RepoRef | null>(null),
    loadSummary: vi.fn(),
    loadDetails: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isSignedIn: () => login !== null, login: () => login } },
      { provide: ProgressService, useValue: progress },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.catalogue = catalogue;
  fixture.detectChanges();
  return { fixture, progress, navigate };
}

function openPopover(fixture: ReturnType<typeof setUp>['fixture']): void {
  fixture.nativeElement.querySelector('button').click();
  fixture.detectChanges();
}

function type(fixture: ReturnType<typeof setUp>['fixture'], text: string): HTMLInputElement {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('app-search-box input');
  input.value = text;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  return input;
}

describe('ProblemListPanelComponent', () => {
  const LOAD_CASES: readonly { name: string; login: string | null; isLoaded: boolean }[] = [
    { name: 'the repo owner (case-insensitive) loads progress', login: 'owner', isLoaded: true },
    { name: 'signed out does not', login: null, isLoaded: false },
    { name: 'another login does not', login: 'visitor', isLoaded: false },
  ];

  it.each(LOAD_CASES)('$name', ({ login, isLoaded }) => {
    const { fixture, progress } = setUp(login);
    openPopover(fixture);

    expect(progress.loadSummary.mock.calls).toEqual(isLoaded ? [['Owner/cse-progress@main']] : []);
    expect(progress.loadDetails).toHaveBeenCalledTimes(isLoaded ? 1 : 0);
  });

  it("marks the current problem's row as the current page", () => {
    const { fixture } = setUp(null);
    openPopover(fixture);

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
    expect(rows.filter((row) => row.getAttribute('aria-current') === 'page').map((row) => row.textContent)).toEqual([
      expect.stringContaining(`#${CURRENT_NUMBER}`),
    ]);
  });

  it('Enter opens the active result with query params kept, and closes', () => {
    const { fixture, navigate } = setUp(null);
    openPopover(fixture);
    const input = type(fixture, 'two');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/practice', 1], { queryParamsHandling: 'preserve' });
    expect(fixture.nativeElement.querySelector(POPOVER)).toBeNull();
  });

  it('Escape with text clears and does not close; a second Escape closes', () => {
    const { fixture } = setUp(null);
    openPopover(fixture);
    const input = type(fixture, 'two');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(fixture.nativeElement.querySelector(POPOVER)).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(POPOVER)).toBeNull();
  });

  it('lists every match', () => {
    const catalogue = Array.from({ length: MATCH_COUNT }, (_, i) => entry(i + 1, `Alpha ${i + 1}`));
    const { fixture } = setUp(null, catalogue);
    openPopover(fixture);
    type(fixture, 'a');

    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(MATCH_COUNT);
    expect(fixture.nativeElement.textContent).not.toMatch(/more…/);
  });

  it('Ctrl+K opens the popover', () => {
    const { fixture } = setUp(null);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(POPOVER)).not.toBeNull();
  });
});
