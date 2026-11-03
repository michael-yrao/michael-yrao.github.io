import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PracticeService } from '../../../core/services/practice.service';
import { FINALE_STAGGER_MS, Handoff, TodaySessionService } from '../../../core/today-session/today-session.service';
import { TodayStripComponent } from './today-strip.component';

const QUEUE = [1, 2, 3];
const DONE = new Set([1]);
const TITLES: Readonly<Record<number, string>> = { 1: 'Two Sum', 2: 'Add Two Numbers' };

function render(
  isActive: boolean,
  contains: boolean,
  current: number,
  isCelebrating = false,
  handoff: Handoff | null = null,
  isAllDone = false,
): HTMLElement {
  TestBed.configureTestingModule({
    imports: [TodayStripComponent],
    providers: [
      provideRouter([]),
      {
        provide: TodaySessionService,
        useValue: {
          active: signal(isActive),
          queue: signal(QUEUE),
          handoff: signal(handoff),
          isRunning: () => isActive && contains,
          isDone: (n: number) => isAllDone || DONE.has(n),
        },
      },
      { provide: PracticeService, useValue: { problemFor: (n: number) => (TITLES[n] ? { title: TITLES[n] } : null) } },
    ],
  });
  const fixture = TestBed.createComponent(TodayStripComponent);
  fixture.componentRef.setInput('number', current);
  fixture.componentRef.setInput('isCelebrating', isCelebrating);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('TodayStripComponent', () => {
  it.each([
    { name: 'no active session', isActive: false, contains: true },
    { name: 'problem outside the queue', isActive: true, contains: false },
  ])('$name: renders nothing', ({ isActive, contains }) => {
    expect(render(isActive, contains, 2).querySelectorAll('a')).toHaveLength(0);
  });

  it('active session: one link per queue item with done, page and label', () => {
    const root = render(true, true, 2);
    const dots = Array.from(root.querySelectorAll('a'));

    expect(dots.map((d) => d.getAttribute('href'))).toEqual(['/practice/1', '/practice/2', '/practice/3']);
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual(['#1 Two Sum', '#2 Add Two Numbers', '#3']);
    expect(dots.map((d) => d.classList.contains('today-strip__dot--done'))).toEqual([true, false, false]);
    expect(dots.map((d) => d.classList.contains('today-strip__dot--current'))).toEqual([false, true, false]);
    expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual([null, 'page', null]);
  });

  it.each([
    { isCelebrating: false, expected: [false, false, false] },
    { isCelebrating: true, expected: [false, true, false] },
  ])('isCelebrating $isCelebrating: ripple class on $expected', ({ isCelebrating, expected }) => {
    const dots = Array.from(render(true, true, 2, isCelebrating).querySelectorAll('a'));

    expect(dots.map((d) => d.classList.contains('today-strip__dot--celebrating'))).toEqual(expected);
  });

  it.each([
    {
      name: 'hand-off: landing on from, receiving on to',
      handoff: { from: 1, to: 2 },
      isRunning: true,
      isAllDone: false,
      landing: [true, false, false],
      receiving: [false, true, false],
      finale: [false, false, false],
      delays: ['', '', ''],
    },
    {
      name: 'finale: every dot pulses in sequence, strip shown with all done',
      handoff: { from: 3, to: null },
      isRunning: false,
      isAllDone: true,
      landing: [false, false, true],
      receiving: [false, false, false],
      finale: [true, true, true],
      delays: ['0ms', `${FINALE_STAGGER_MS}ms`, `${FINALE_STAGGER_MS * 2}ms`],
    },
    {
      name: 'no hand-off: none of the classes',
      handoff: null,
      isRunning: true,
      isAllDone: false,
      landing: [false, false, false],
      receiving: [false, false, false],
      finale: [false, false, false],
      delays: ['', '', ''],
    },
  ])('$name', ({ handoff, isRunning, isAllDone, landing, receiving, finale, delays }) => {
    const current = handoff?.from ?? 2;
    const dots = Array.from(render(isRunning, true, current, false, handoff, isAllDone).querySelectorAll('a'));
    const has = (cls: string) => dots.map((d) => d.classList.contains(`today-strip__dot--${cls}`));

    expect(dots).toHaveLength(QUEUE.length);
    expect(has('landing')).toEqual(landing);
    expect(has('receiving')).toEqual(receiving);
    expect(has('finale')).toEqual(finale);
    expect(dots.map((d) => d.style.animationDelay)).toEqual(delays);
  });
});
