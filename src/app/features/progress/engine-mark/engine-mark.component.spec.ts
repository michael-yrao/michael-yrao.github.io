import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ENGINE_DELAY, EngineService } from '../../../core/engine/engine.service';
import { EngineStatus } from '../../../core/engine/engine-status';
import { ProgressService } from '../../../core/services/progress.service';
import { ENGINE_POLL_MAX, EngineMarkComponent } from './engine-mark.component';

const REF = { owner: 'ada', repo: 'cse-progress', branch: 'main' };
const OLD_RUN: EngineStatus = { state: 'ok', runId: 1, htmlUrl: null };
const NEW_OK: EngineStatus = { state: 'ok', runId: 2, htmlUrl: null };
const NEW_RUNNING: EngineStatus = { state: 'running', runId: 2, htmlUrl: null };

interface PollCase {
  readonly name: string;
  readonly polls: readonly EngineStatus[];
  readonly expectedPolls: number;
  readonly expectedRefreshes: number;
}

describe('EngineMarkComponent build()', () => {
  it.each<PollCase>([
    { name: 'a new finished run stops polling and refreshes', polls: [NEW_OK], expectedPolls: 1, expectedRefreshes: 1 },
    {
      name: 'a running new run keeps polling until it finishes',
      polls: [NEW_RUNNING, NEW_RUNNING, NEW_RUNNING, NEW_OK],
      expectedPolls: 4,
      expectedRefreshes: 1,
    },
    {
      name: 'no new run gives up after the poll limit without refreshing',
      polls: [OLD_RUN],
      expectedPolls: ENGINE_POLL_MAX,
      expectedRefreshes: 0,
    },
  ])('$name', async ({ polls, expectedPolls, expectedRefreshes }) => {
    let calls = 0;
    const status$ = vi.fn(() => {
      const scripted = calls === 0 ? OLD_RUN : polls[Math.min(calls - 1, polls.length - 1)];
      calls++;
      return of(scripted);
    });
    const refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: EngineService, useValue: { status$, buildNextWeek: async () => 'dispatched' } },
        { provide: ProgressService, useValue: { refresh } },
        { provide: ENGINE_DELAY, useValue: async () => undefined },
      ],
    });
    const fixture = TestBed.createComponent(EngineMarkComponent);
    fixture.componentRef.setInput('repoRef', REF);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(status$).toHaveBeenCalledTimes(1);

    await (fixture.componentInstance as unknown as { build(): Promise<void> }).build();

    expect(status$).toHaveBeenCalledTimes(1 + expectedPolls);
    expect(refresh).toHaveBeenCalledTimes(expectedRefreshes);
  });
});
