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

function entry(number: number, title: string): CatalogueEntry {
  return { number, title, difficulty: 'Easy', category: null, tags: [], isRunnable: true, url: null, isVisualized: false, hasSolution: true };
}

@Component({
  imports: [ProblemListPanelComponent],
  template: `<app-problem-list-panel
    [isOpen]="isOpen()"
    [catalogue]="catalogue"
    [currentNumber]="2"
    [repo]="repo"
    (closed)="closeCount = closeCount + 1"
  />`,
})
class HostComponent {
  readonly isOpen = signal(false);
  readonly catalogue = [entry(1, 'Two Sum'), entry(CURRENT_NUMBER, 'Add Two Numbers'), entry(3, 'Longest Substring')];
  readonly repo = REPO;
  closeCount = 0;
}

function setUp(login: string | null) {
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
  fixture.detectChanges();
  fixture.componentInstance.isOpen.set(true);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, progress, navigate };
}

describe('ProblemListPanelComponent', () => {
  beforeEach(() => {
    // jsdom has no dialog modality or layout.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  });

  const LOAD_CASES: ReadonlyArray<{ name: string; login: string | null; isLoaded: boolean }> = [
    { name: 'the repo owner (case-insensitive) loads progress', login: 'owner', isLoaded: true },
    { name: 'signed out does not', login: null, isLoaded: false },
    { name: 'another login does not', login: 'visitor', isLoaded: false },
  ];

  it.each(LOAD_CASES)('$name', ({ login, isLoaded }) => {
    const { progress } = setUp(login);

    expect(progress.loadSummary.mock.calls).toEqual(isLoaded ? [['Owner/cse-progress@main']] : []);
    expect(progress.loadDetails).toHaveBeenCalledTimes(isLoaded ? 1 : 0);
  });

  it("marks the current problem's row as the current page", () => {
    const { fixture } = setUp(null);

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.problem-list__row'));
    expect(rows.filter((row) => row.getAttribute('aria-current') === 'page').map((row) => row.textContent)).toEqual([
      expect.stringContaining(`#${CURRENT_NUMBER}`),
    ]);
  });

  it('Enter in the search box opens the first result with query params kept, and closes', () => {
    const { fixture, host, navigate } = setUp(null);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('app-search-box input');
    input.value = 'two';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(navigate).toHaveBeenCalledWith(['/practice', 1], { queryParamsHandling: 'preserve' });
    expect(host.closeCount).toBe(1);
  });

  it('Escape with text in the search box clears it and does not close', () => {
    const { fixture, host } = setUp(null);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('app-search-box input');
    input.value = 'two';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(input.value).toBe('');
    expect(host.closeCount).toBe(0);
  });
});
