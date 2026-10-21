import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { EngineService, HoldResult } from '../../../../core/engine/engine.service';
import { ProblemProgress } from '../../../../core/models/progress.model';
import { RowMenuComponent } from './row-menu.component';

const TODAY = '2026-10-20';
const MAX_DATE = '2027-01-18'; // TODAY + 90 days
const REF = { owner: 'ada', repo: 'cse-progress', branch: 'main' };

function problem(heldUntil?: string): ProblemProgress {
  return {
    lcNumber: 853,
    title: 'Car Fleet',
    comfort: '🟡',
    level: 1,
    streak: 0,
    repDates: [],
    timeline: [],
    ...(heldUntil === undefined ? {} : { heldUntil }),
  };
}

function render(heldUntil?: string, holdResult: HoldResult = 'held') {
  const hold = vi.fn(async () => holdResult);
  TestBed.configureTestingModule({ providers: [{ provide: EngineService, useValue: { hold } }] });
  const fixture = TestBed.createComponent(RowMenuComponent);
  fixture.componentRef.setInput('problem', problem(heldUntil));
  fixture.componentRef.setInput('itemTitle', 'Car Fleet');
  fixture.componentRef.setInput('lcNumber', 853);
  fixture.componentRef.setInput('repoRef', REF);
  fixture.componentRef.setInput('todayISO', TODAY);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const refresh = () => fixture.detectChanges();
  const openMenu = () => {
    (el.querySelector('.menu__trigger') as HTMLButtonElement).click();
    refresh();
  };
  return { fixture, el, hold, refresh, openMenu };
}

const labels = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.menu__item')).map((item) => item.textContent?.trim());
const press = (el: HTMLElement, label: string) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.menu__item')).find((b) => b.textContent?.trim() === label)?.click();

function pickDate(el: HTMLElement, value: string): void {
  const input = el.querySelector('input[type="date"]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('change'));
}

describe('RowMenuComponent', () => {
  it.each<{ name: string; heldUntil?: string; mark: string | null }>([
    { name: 'no heldUntil shows no mark', mark: null },
    { name: 'a past heldUntil shows no mark', heldUntil: '2026-10-19', mark: null },
    { name: 'heldUntil today shows the mark', heldUntil: TODAY, mark: '⏸ 10/20' },
    { name: 'a future heldUntil shows the mark', heldUntil: '2026-11-03', mark: '⏸ 11/03' },
  ])('$name', ({ heldUntil, mark }) => {
    const shown = render(heldUntil).el.querySelector('.row-menu__mark')?.textContent?.trim() ?? null;
    expect(shown).toBe(mark);
  });

  it.each<{ name: string; heldUntil?: string; items: string[] }>([
    { name: 'not held offers Hold until… only', items: ['Hold until…'] },
    { name: 'held offers Hold until… and Release', heldUntil: '2026-11-03', items: ['Hold until…', 'Release'] },
  ])('the items: $name', ({ heldUntil, items }) => {
    const { el, openMenu } = render(heldUntil);
    openMenu();
    expect(labels(el)).toEqual(items);
  });

  it('Hold until… shows the date input with the bounds, Cancel brings the items back', () => {
    const { el, refresh, openMenu } = render();
    openMenu();
    press(el, 'Hold until…');
    refresh();
    const input = el.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input.min).toBe('2026-10-21');
    expect(input.max).toBe(MAX_DATE);
    expect(el.querySelector('.menu__panel') !== null).toBe(true);
    press(el, 'Cancel');
    refresh();
    expect(el.querySelector('input[type="date"]')).toBeNull();
    expect(labels(el)).toEqual(['Hold until…']);
  });

  it.each<{ name: string; value: string; calls: number }>([
    { name: 'a date in range sends the hold', value: '2026-11-03', calls: 1 },
    { name: 'today is out of range', value: TODAY, calls: 0 },
    { name: 'past the cap is out of range', value: '2027-01-19', calls: 0 },
  ])('picking a date: $name', ({ value, calls }) => {
    const { el, hold, refresh, openMenu } = render();
    openMenu();
    press(el, 'Hold until…');
    refresh();
    pickDate(el, value);
    expect(hold).toHaveBeenCalledTimes(calls);
    if (calls > 0) expect(hold).toHaveBeenCalledWith(REF, { number: 853, title: 'Car Fleet', until: value, today: TODAY });
  });

  it('Release sends a hold with until null', () => {
    const { el, hold, refresh, openMenu } = render('2026-11-03');
    openMenu();
    press(el, 'Release');
    refresh();
    expect(hold).toHaveBeenCalledWith(REF, { number: 853, title: 'Car Fleet', until: null, today: TODAY });
  });

  it.each<{ result: HoldResult; message: string }>([
    { result: 'no-row', message: 'This problem has no tracker row yet. Finish one rep first.' },
    { result: 'owned', message: 'This hold was set by a coach decision. Change it in the repo.' },
  ])('a $result refusal shows its approved message and keeps the menu open', async ({ result, message }) => {
    const { fixture, el, refresh, openMenu } = render(undefined, result);
    openMenu();
    press(el, 'Hold until…');
    refresh();
    pickDate(el, '2026-11-03');
    await fixture.whenStable();
    refresh();
    expect(el.querySelector('.row-menu__refusal')?.textContent?.trim()).toBe(message);
    expect(el.querySelector('.menu__panel') !== null).toBe(true);
  });
});
