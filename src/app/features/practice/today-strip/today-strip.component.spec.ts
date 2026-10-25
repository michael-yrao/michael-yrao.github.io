import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PracticeService } from '../../../core/services/practice.service';
import { TodaySessionService } from '../../../core/today-session/today-session.service';
import { TodayStripComponent } from './today-strip.component';

const QUEUE = [1, 2, 3];
const DONE = new Set([1]);
const TITLES: Readonly<Record<number, string>> = { 1: 'Two Sum', 2: 'Add Two Numbers' };

function render(isActive: boolean, contains: boolean, current: number): HTMLElement {
  TestBed.configureTestingModule({
    imports: [TodayStripComponent],
    providers: [
      provideRouter([]),
      {
        provide: TodaySessionService,
        useValue: {
          active: signal(isActive),
          queue: signal(QUEUE),
          contains: () => contains,
          isDone: (n: number) => DONE.has(n),
        },
      },
      { provide: PracticeService, useValue: { problemFor: (n: number) => (TITLES[n] ? { title: TITLES[n] } : null) } },
    ],
  });
  const fixture = TestBed.createComponent(TodayStripComponent);
  fixture.componentRef.setInput('number', current);
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

  it('active session: one link per queue item with done, current and label', () => {
    const dots = Array.from(render(true, true, 2).querySelectorAll('a'));

    expect(dots.map((d) => d.getAttribute('href'))).toEqual(['/practice/1', '/practice/2', '/practice/3']);
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual(['#1 Two Sum', '#2 Add Two Numbers', '#3']);
    expect(dots.map((d) => d.classList.contains('today-strip__dot--done'))).toEqual([true, false, false]);
    expect(dots.map((d) => d.classList.contains('today-strip__dot--current'))).toEqual([false, true, false]);
  });
});
