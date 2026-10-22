import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProgressService } from '../../../core/services/progress.service';
import { RecognitionPageComponent } from './recognition-page.component';

const NO_REPO_LINE = 'Probes are logged by the coach in your repo.';
const LOADING_LINE = 'Loading…';

describe('RecognitionPageComponent', () => {
  const A_B_REF = { owner: 'a', repo: 'b' };
  it.each([
    { name: 'with repo a/b', resolved: 'a/b', status: 'ready', hasPanel: true, hasLoading: false, loadedWith: 'a/b' },
    { name: 'loading repo a/b', resolved: 'a/b', status: 'loading', hasPanel: false, hasLoading: true, loadedWith: 'a/b' },
    { name: 'signed out, no repo', resolved: null, status: 'ready', hasPanel: false, hasLoading: false, loadedWith: null },
  ])('$name', ({ resolved, status, hasPanel, hasLoading, loadedWith }) => {
    const loadSummary = vi.fn();
    const paramMap = convertToParamMap({});
    TestBed.configureTestingModule({
      imports: [RecognitionPageComponent],
      providers: [
        {
          provide: ProgressService,
          useValue: {
            data: signal({ probes: { total: 0, cleanRate: 0, items: [] } }),
            status: signal(status),
            error: signal(null),
            source: signal(A_B_REF),
            repoRef: signal(null),
            loadSummary,
          },
        },
        {
          provide: AuthService,
          useValue: {
            resolveRepo: () => resolved,
            isSignedIn: signal(false),
            isEnabled: true,
            signIn: vi.fn(),
          },
        },
        {
          provide: PracticeService,
          useValue: {
            data: signal(null),
            indexNumbers: signal(null),
            ref: signal(null),
            indexRef: signal(null),
            load: vi.fn(),
            loadIndex: vi.fn(),
          },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(paramMap), snapshot: { queryParamMap: paramMap } } },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(RecognitionPageComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-recognition-panel') !== null).toBe(hasPanel);
    expect(el.querySelector('[role="status"]')?.textContent?.trim() === LOADING_LINE).toBe(hasLoading);
    expect(el.textContent?.includes(NO_REPO_LINE)).toBe(resolved === null);
    if (loadedWith) expect(loadSummary).toHaveBeenCalledWith(loadedWith);
    else expect(loadSummary).not.toHaveBeenCalled();
  });
});
