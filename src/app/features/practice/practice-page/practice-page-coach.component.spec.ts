import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SESSION_KEY } from '../../../core/auth/auth.service';
import { CoachContextService } from '../../../core/coach/coach-context.service';
import { COACH_OWNER_LOGIN } from '../../../core/data/site-links';
import { createMemoryStorage } from '../../../core/memory-storage.testing';
import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { CONTENT_REPO } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { PracticePageComponent } from './practice-page.component';

const PROBLEM: PracticeProblem = {
  number: 90,
  title: 'Subsets II',
  url: 'https://leetcode.com/problems/subsets-ii/',
  statement: 'Return all subsets.',
  stub: 'stub\n',
  entry: { className: 'Solution', method: 'subsetsWithDup' },
  compare: 'unordered-nested',
  cases: [{ args: [[1, 2]], expected: [[1], [2]], example: true }],
};

@Component({ selector: 'app-code-editor', template: '' })
class StubEditorComponent {
  readonly initialText = input.required<string>();
  readonly textChange = output<string>();
  setText(): void {}
  setErrorLine(): void {}
}

function signIn(login: string): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: 'ghu_secret', login, expiresAt: null, refreshToken: null, refreshExpiresAt: null }),
  );
}

function render(coach: { publish: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> }) {
  const params = convertToParamMap({ number: '90' });
  const query = convertToParamMap({});
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems: [PROBLEM] };
  TestBed.configureTestingModule({
    imports: [PracticePageComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: CoachContextService, useValue: coach },
      {
        provide: PracticeService,
        useValue: {
          status: signal('ready'),
          error: signal(null),
          data: signal(data),
          ref: signal(CONTENT_REPO),
          load: vi.fn(),
          problemFor: () => PROBLEM,
        },
      },
      { provide: ShowcaseService, useValue: { data: signal(null), load: vi.fn(), entryFor: () => null } },
      { provide: PythonRunnerService, useValue: { run: vi.fn() } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(params), queryParamMap: of(query), snapshot: { paramMap: params, queryParamMap: query } },
      },
    ],
  });
  TestBed.overrideComponent(PracticePageComponent, {
    remove: { imports: [CodeEditorComponent] },
    add: { imports: [StubEditorComponent] },
  });
  const fixture = TestBed.createComponent(PracticePageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('PracticePageComponent coach context', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { name: 'owner: publishes the problem and the editor text', login: COACH_OWNER_LOGIN, isPublished: true },
    { name: 'non-owner: never publishes', login: 'visitor', isPublished: false },
  ])('$name', ({ login, isPublished }) => {
    signIn(login);
    const coach = { publish: vi.fn(), clear: vi.fn() };
    render(coach);
    TestBed.tick();

    if (isPublished) {
      expect(coach.publish).toHaveBeenCalledWith(
        expect.objectContaining({ number: PROBLEM.number, title: PROBLEM.title, code: PROBLEM.stub, run: null }),
      );
    } else {
      expect(coach.publish).not.toHaveBeenCalled();
    }
  });

  it('destroy clears the snapshot', () => {
    signIn(COACH_OWNER_LOGIN);
    const coach = { publish: vi.fn(), clear: vi.fn() };
    const fixture = render(coach);
    coach.clear.mockClear();

    fixture.destroy();

    expect(coach.clear).toHaveBeenCalled();
  });
});
