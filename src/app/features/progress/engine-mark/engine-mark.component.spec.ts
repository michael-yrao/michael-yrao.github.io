import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ENGINE_DELAY, EngineService } from '../../../core/engine/engine.service';
import { EngineStatus, NO_ENGINE_RUN } from '../../../core/engine/engine-status';
import { EngineUpdate } from '../../../core/engine/engine-update';
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
        { provide: EngineService, useValue: { status$, buildNextWeek: async () => 'dispatched', versions: async () => null } },
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

const PLAN = (repo: string | null, template: string | null): EngineUpdate => ({
  version: { repo, template },
  updated: [],
  skipped: [],
  removedUpstream: [],
});
const DONE: EngineUpdate = {
  version: { repo: '0.11.0', template: '0.11.0' },
  updated: ['a', 'b', 'c'],
  skipped: [
    { path: 'scripts/x.py', reason: 'conflict' },
    { path: 'scripts/y.py', reason: 'keep-local' },
  ],
  removedUpstream: [],
  notice: 'needs-workflows-permission',
};
const UPDATE_BUTTON = 'Update engine';

interface MarkCase {
  readonly name: string;
  readonly plan: EngineUpdate | null;
  readonly isClicked: boolean;
  readonly marks: readonly string[];
  readonly hasButton: boolean;
}

describe('EngineMarkComponent version marks', () => {
  it.each<MarkCase>([
    {
      name: 'a newer template shows both versions and the button',
      plan: PLAN('0.10.1', '0.11.0'),
      isClicked: false,
      marks: ['v0.10.1', '↑ v0.11.0 update available'],
      hasButton: true,
    },
    { name: 'equal versions show the repo version only', plan: PLAN('0.10.1', '0.10.1'), isClicked: false, marks: ['v0.10.1'], hasButton: false },
    { name: 'no template version shows the repo version only', plan: PLAN('0.10.1', null), isClicked: false, marks: ['v0.10.1'], hasButton: false },
    { name: 'a failed dry run shows nothing', plan: null, isClicked: false, marks: [], hasButton: false },
    {
      name: 'a real update shows its result marks and drops the button',
      plan: PLAN('0.10.1', '0.11.0'),
      isClicked: true,
      marks: ['v0.11.0', '✓ 3 updated', '⚠ 2 kept (edited by you)', '⛔ workflow files need one new permission'],
      hasButton: false,
    },
  ])('$name', async ({ plan, isClicked, marks, hasButton }) => {
    const versions = vi.fn(async () => plan?.version ?? null);
    const update = vi.fn(async () => DONE);
    TestBed.configureTestingModule({
      providers: [
        { provide: EngineService, useValue: { status$: () => of(NO_ENGINE_RUN), versions, update } },
        { provide: ProgressService, useValue: { refresh: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(EngineMarkComponent);
    fixture.componentRef.setInput('repoRef', REF);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(versions).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    const el = fixture.nativeElement as HTMLElement;
    const findButton = () =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === UPDATE_BUTTON);

    if (isClicked) {
      findButton()?.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(REF, { dryRun: false });
    }

    const shown = Array.from(
      el.querySelectorAll('.engine-mark__versions > span:not(.engine-mark__sep), .engine-mark__versions summary'),
    ).map((node) => node.textContent?.trim());
    expect(shown).toEqual(marks);
    const paths = Array.from(el.querySelectorAll('.engine-mark__skipped li')).map((li) => li.textContent?.trim());
    expect(paths).toEqual(isClicked ? ['scripts/x.py', 'scripts/y.py'] : []);
    expect(findButton() !== undefined).toBe(hasButton);
  });
});

const WEDNESDAY_NOON = new Date(2026, 9, 21, 12);
const SUNDAY_NOON = new Date(2026, 9, 18, 12);
const RUNNING: EngineStatus = { state: 'running', runId: 3, htmlUrl: null };
const FAILED: EngineStatus = { state: 'failed', runId: 3, htmlUrl: null };
const OFF_KEY_LINE = '⏻ weekly build is off in cse.config.yml';

async function mountMark(status: EngineStatus, buildNextWeek = vi.fn(async () => 'dispatched')) {
  TestBed.configureTestingModule({
    providers: [
      { provide: EngineService, useValue: { status$: () => of(status), buildNextWeek, versions: async () => null } },
      { provide: ProgressService, useValue: { refresh: vi.fn() } },
      { provide: ENGINE_DELAY, useValue: async () => undefined },
    ],
  });
  const fixture = TestBed.createComponent(EngineMarkComponent);
  fixture.componentRef.setInput('repoRef', REF);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, details: el.querySelector('details.engine') as HTMLDetailsElement, buildNextWeek };
}

/** What a gear click does: the browser opens the details and fires `toggle`. */
function openByHand(fixture: ComponentFixture<EngineMarkComponent>): void {
  const details = (fixture.nativeElement as HTMLElement).querySelector('details.engine') as HTMLDetailsElement;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  fixture.detectChanges();
}

function pressButton(el: HTMLElement, label: string): void {
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)?.click();
}

describe('EngineMarkComponent disclosure', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it.each([
    { name: 'no run reads none', status: NO_ENGINE_RUN, dot: 'none' },
    { name: 'a running run reads running', status: RUNNING, dot: 'running' },
    { name: 'a finished run reads ok', status: NEW_OK, dot: 'ok' },
    { name: 'a failed run reads failed', status: FAILED, dot: 'failed' },
  ])('the dot: $name', async ({ status, dot }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { el } = await mountMark(status);
    expect(el.querySelector('.engine__dot')?.getAttribute('data-state')).toBe(dot);
  });

  it.each<{
    name: string;
    now: Date;
    act: (fixture: ComponentFixture<EngineMarkComponent>) => void;
    isOpen: boolean;
    isBuildDay: boolean;
  }>([
    { name: 'a Wednesday starts closed with no ring', now: WEDNESDAY_NOON, act: () => undefined, isOpen: false, isBuildDay: false },
    { name: 'clicking the gear opens the panel', now: WEDNESDAY_NOON, act: openByHand, isOpen: true, isBuildDay: false },
    {
      name: 'Escape closes it',
      now: WEDNESDAY_NOON,
      act: (fixture) => {
        openByHand(fixture);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      },
      isOpen: false,
      isBuildDay: false,
    },
    {
      name: 'a click outside closes it',
      now: WEDNESDAY_NOON,
      act: (fixture) => {
        openByHand(fixture);
        document.body.click();
      },
      isOpen: false,
      isBuildDay: false,
    },
    {
      name: 'a click inside the panel keeps it open',
      now: WEDNESDAY_NOON,
      act: (fixture) => {
        openByHand(fixture);
        ((fixture.nativeElement as HTMLElement).querySelector('.engine__panel') as HTMLElement).click();
      },
      isOpen: true,
      isBuildDay: false,
    },
    { name: 'a Sunday rings the gear and stays closed', now: SUNDAY_NOON, act: () => undefined, isOpen: false, isBuildDay: true },
  ])('$name', async ({ now, act, isOpen, isBuildDay }) => {
    vi.setSystemTime(now);
    const { fixture, el, details } = await mountMark(NO_ENGINE_RUN);
    act(fixture);
    fixture.detectChanges();
    expect(details.open).toBe(isOpen);
    expect(el.querySelector('.engine__gear')?.classList.contains('engine__gear--build-day')).toBe(isBuildDay);
  });

  it.each([
    { name: 'pressing Build next week now asks first', presses: ['Build next week now'], isModalOpen: true, calls: 0 },
    { name: 'Cancel closes it without building', presses: ['Build next week now', 'Cancel'], isModalOpen: false, calls: 0 },
    { name: 'Build closes it and builds once', presses: ['Build next week now', 'Build'], isModalOpen: false, calls: 1 },
  ])('$name', async ({ presses, isModalOpen, calls }) => {
    vi.setSystemTime(SUNDAY_NOON);
    const { fixture, el, buildNextWeek } = await mountMark(NO_ENGINE_RUN);
    for (const label of presses) {
      pressButton(el, label);
      fixture.detectChanges();
    }
    await fixture.whenStable();
    expect((el.querySelector('dialog') as HTMLDialogElement).open).toBe(isModalOpen);
    expect(buildNextWeek).toHaveBeenCalledTimes(calls);
  });

  it('a build refused as off shows the off key line, opens the panel and sets the dot to off', async () => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { fixture, el, details } = await mountMark(NO_ENGINE_RUN, vi.fn(async () => 'off'));
    expect(details.open).toBe(false);
    pressButton(el, 'Build next week now');
    fixture.detectChanges();
    pressButton(el, 'Build');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.engine-mark__key')?.textContent?.trim()).toBe(OFF_KEY_LINE);
    expect(details.open).toBe(true);
    expect(el.querySelector('.engine__dot')?.getAttribute('data-state')).toBe('off');
    const glyph = el.querySelector('.engine-mark__glyph');
    expect(glyph?.getAttribute('data-state')).toBe('off');
    expect(glyph?.getAttribute('href')).toBeNull();
  });
});
