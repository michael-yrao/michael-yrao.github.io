import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { BuildResult, ENGINE_DELAY, EngineService } from '../../../core/engine/engine.service';
import { EngineStatus, NO_ENGINE_RUN } from '../../../core/engine/engine-status';
import { EngineUpdate } from '../../../core/engine/engine-update';
import { ProgressService } from '../../../core/services/progress.service';
import { ENGINE_POLL_MAX, EngineMenuComponent } from './engine-menu.component';

const REF = { owner: 'ada', repo: 'cse-progress', branch: 'main' };
const OLD_RUN: EngineStatus = { state: 'ok', runId: 1, htmlUrl: null };
const NEW_OK: EngineStatus = { state: 'ok', runId: 2, htmlUrl: null };
const NEW_RUNNING: EngineStatus = { state: 'running', runId: 2, htmlUrl: null };
const FAILED: EngineStatus = { state: 'failed', runId: 3, htmlUrl: null };
const WEDNESDAY_NOON = new Date(2026, 9, 21, 12);
const SUNDAY_NOON = new Date(2026, 9, 18, 12);

interface PollCase {
  readonly name: string;
  readonly polls: readonly EngineStatus[];
  readonly expectedPolls: number;
  readonly expectedRefreshes: number;
}

describe('EngineMenuComponent build()', () => {
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
    const fixture = TestBed.createComponent(EngineMenuComponent);
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
  version: { repo: '0.12.0', template: '0.12.0' },
  updated: ['a', 'b'],
  skipped: [{ path: 'scripts/x.py', reason: 'conflict' }],
  removedUpstream: [],
};

interface MountOptions {
  readonly status?: EngineStatus;
  readonly plan?: EngineUpdate | null;
  readonly isWeekMissing?: boolean;
  readonly buildResult?: BuildResult;
}

async function mountMenu({
  status = NO_ENGINE_RUN,
  plan = null,
  isWeekMissing = false,
  buildResult = 'dispatched',
}: MountOptions = {}) {
  const buildNextWeek = vi.fn(async () => buildResult);
  const update = vi.fn(async () => DONE);
  TestBed.configureTestingModule({
    providers: [
      { provide: EngineService, useValue: { status$: () => of(status), buildNextWeek, update, versions: async () => plan?.version ?? null } },
      { provide: ProgressService, useValue: { refresh: vi.fn() } },
      { provide: ENGINE_DELAY, useValue: async () => undefined },
    ],
  });
  const fixture = TestBed.createComponent(EngineMenuComponent);
  fixture.componentRef.setInput('repoRef', REF);
  fixture.componentRef.setInput('isWeekMissing', isWeekMissing);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const openMenu = () => {
    (el.querySelector('.menu__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  return { fixture, el, buildNextWeek, update, settle, openMenu };
}

function item(el: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(el.querySelectorAll<HTMLButtonElement>('button.menu__item')).find((b) =>
    b.textContent?.trim().startsWith(label),
  );
}

const meta = (button: HTMLElement | undefined) => button?.querySelector('.menu__meta')?.textContent?.trim();
const rowTexts = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.engine-menu__status, .engine-menu__result')).map((row) =>
    Array.from(row.querySelectorAll(':scope > span, :scope > details > summary'))
      .map((part) => part.textContent?.trim())
      .join(' '),
  );

describe('EngineMenuComponent', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it.each<{ name: string; status: EngineStatus; dot: string | null }>([
    { name: 'no run draws nothing', status: NO_ENGINE_RUN, dot: null },
    { name: 'a finished run draws nothing', status: NEW_OK, dot: null },
    { name: 'a running run reads running', status: NEW_RUNNING, dot: 'running' },
    { name: 'a failed run reads failed', status: FAILED, dot: 'failed' },
  ])('the dot: $name', async ({ status, dot }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { el } = await mountMenu({ status });
    expect(el.querySelector('.menu__dot')?.getAttribute('data-state') ?? null).toBe(dot);
  });

  it.each<{ name: string; buildResult: BuildResult; isAwaited: boolean; dot: string }>([
    { name: 'a no-config refusal reads failed', buildResult: 'no-config', isAwaited: true, dot: 'failed' },
    { name: 'a dispatched build reads running while it waits', buildResult: 'dispatched', isAwaited: false, dot: 'running' },
  ])('the dot after building: $name', async ({ buildResult, isAwaited, dot }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { fixture, el, openMenu, settle } = await mountMenu({ buildResult });
    openMenu();
    item(el, 'Build next week')?.click();
    fixture.detectChanges();
    (Array.from(el.querySelectorAll('dialog button')).find((b) => b.textContent?.trim() === 'Build') as HTMLElement).click();
    fixture.detectChanges();
    if (isAwaited) await settle();
    expect(el.querySelector('.menu__dot')?.getAttribute('data-state')).toBe(dot);
  });

  it.each<{
    name: string;
    now: Date;
    options: MountOptions;
    isBuildEnabled: boolean;
    isBuilding?: boolean;
    buildMeta: string;
    isUpdateEnabled: boolean;
    updateMeta: string;
  }>([
    {
      name: 'a Sunday with a newer template',
      now: SUNDAY_NOON,
      options: { plan: PLAN('0.11.0', '0.12.0') },
      isBuildEnabled: true,
      buildMeta: 'today',
      isUpdateEnabled: true,
      updateMeta: 'v0.11.0 → v0.12.0',
    },
    {
      name: 'a Wednesday with a current engine',
      now: WEDNESDAY_NOON,
      options: { plan: PLAN('0.11.0', '0.11.0') },
      isBuildEnabled: true,
      buildMeta: 'closes this week',
      isUpdateEnabled: false,
      updateMeta: 'v0.11.0',
    },
    {
      name: 'a build in progress disables Build',
      now: WEDNESDAY_NOON,
      options: { plan: PLAN('0.11.0', '0.11.0') },
      isBuildEnabled: false,
      isBuilding: true,
      buildMeta: 'closes this week',
      isUpdateEnabled: false,
      updateMeta: 'v0.11.0',
    },
  ])('the items: $name', async ({ now, options, isBuildEnabled, isBuilding, buildMeta, isUpdateEnabled, updateMeta }) => {
    vi.setSystemTime(now);
    const { fixture, el, openMenu, settle } = await mountMenu(options);
    if (isBuilding === true) {
      (fixture.componentInstance as unknown as { isBuilding: { set(v: boolean): void } }).isBuilding.set(true);
    }
    openMenu();
    await settle();
    const build = item(el, 'Build next week');
    const update = item(el, 'Update engine');
    expect(build?.disabled).toBe(!isBuildEnabled);
    expect(meta(build)).toBe(buildMeta);
    expect(update?.disabled).toBe(!isUpdateEnabled);
    expect(meta(update)).toBe(updateMeta);
  });

  it.each<{ name: string; isWeekMissing: boolean; label: string; meta: string; heading: string; lines: string[] }>([
    {
      name: 'the week is present',
      isWeekMissing: false,
      label: 'Build next week',
      meta: 'closes this week',
      heading: 'Build next week now?',
      lines: ['Archives this week', 'Re-seats what is left into next week', 'Runs in your repo as a commit'],
    },
    {
      name: 'the week is missing',
      isWeekMissing: true,
      label: 'Build this week',
      meta: 'missing',
      heading: 'Build this week now?',
      lines: ['Archives last week', 'Re-seats what is left into this week', 'Runs in your repo as a commit'],
    },
  ])('the Build item and dialog wording: $name', async ({ isWeekMissing, label, meta: expectedMeta, heading, lines }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { fixture, el, openMenu } = await mountMenu({ isWeekMissing });
    openMenu();
    const build = item(el, label);
    expect(build?.disabled).toBe(false);
    expect(meta(build)).toBe(expectedMeta);
    build?.click();
    fixture.detectChanges();
    expect(el.querySelector('.modal__heading')?.textContent?.trim()).toBe(heading);
    expect(Array.from(el.querySelectorAll('.engine-menu__confirm li')).map((li) => li.textContent?.trim())).toEqual(lines);
  });

  it.each(
    [false, true].flatMap((isWeekMissing) => [
      { name: 'the Build item asks first', isWeekMissing, presses: [] as string[], isModalOpen: true, calls: 0 },
      { name: 'Cancel closes it without building', isWeekMissing, presses: ['Cancel'], isModalOpen: false, calls: 0 },
      { name: 'Build closes it and builds once', isWeekMissing, presses: ['Build'], isModalOpen: false, calls: 1 },
    ]),
  )('the build flow (week missing: $isWeekMissing): $name', async ({ isWeekMissing, presses, isModalOpen, calls }) => {
    vi.setSystemTime(SUNDAY_NOON);
    const { fixture, el, buildNextWeek, openMenu, settle } = await mountMenu({ isWeekMissing });
    openMenu();
    item(el, isWeekMissing ? 'Build this week' : 'Build next week')?.click();
    fixture.detectChanges();
    for (const label of presses) {
      (Array.from(el.querySelectorAll('dialog button')).find((b) => b.textContent?.trim() === label) as HTMLElement).click();
      fixture.detectChanges();
    }
    await settle();
    expect((el.querySelector('dialog') as HTMLDialogElement).open).toBe(isModalOpen);
    expect(buildNextWeek).toHaveBeenCalledTimes(calls);
  });

  it.each<{ name: string; status: EngineStatus; row: string | null }>([
    { name: 'a finished run', status: NEW_OK, row: '✓ last run ok' },
    { name: 'a running run', status: NEW_RUNNING, row: '⟳ running' },
    { name: 'a failed run', status: FAILED, row: '✗ last run failed' },
    { name: 'no run shows no row', status: NO_ENGINE_RUN, row: null },
  ])('the status row: $name', async ({ status, row }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { el, openMenu } = await mountMenu({ status });
    openMenu();
    expect(rowTexts(el)).toEqual(row === null ? [] : [row]);
  });

  it.each<{ name: string; buildResult: BuildResult; row: string }>([
    { name: 'a no-config refusal shows its row', buildResult: 'no-config', row: '✗ no cse.config.yml' },
  ])('the status row after building: $name', async ({ buildResult, row }) => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { fixture, el, openMenu, settle } = await mountMenu({ buildResult });
    openMenu();
    item(el, 'Build next week')?.click();
    fixture.detectChanges();
    (Array.from(el.querySelectorAll('dialog button')).find((b) => b.textContent?.trim() === 'Build') as HTMLElement).click();
    await settle();
    expect(el.querySelector('.menu__panel') !== null).toBe(true);
    expect(rowTexts(el)).toEqual([row]);
    expect(el.querySelector('.engine-menu__run')).toBeNull();
  });

  it('the status row after an update lists what was updated and kept', async () => {
    vi.setSystemTime(WEDNESDAY_NOON);
    const { el, update, openMenu, settle } = await mountMenu({ plan: PLAN('0.11.0', '0.12.0') });
    openMenu();
    item(el, 'Update engine')?.click();
    await settle();
    expect(update).toHaveBeenCalledWith(REF, { dryRun: false });
    expect(rowTexts(el)).toEqual(['✓ 2 updated · △ 1 kept']);
    expect(el.querySelector('.menu__panel') !== null).toBe(true);
    expect(meta(item(el, 'Update engine'))).toBe('v0.12.0');
    expect(item(el, 'Update engine')?.disabled).toBe(true);
  });
});
