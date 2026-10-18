import { TestBed } from '@angular/core/testing';

import { StreakCalendarComponent } from './streak-calendar.component';
import { addDaysISO, todayLocalISO } from '../../../core/utils/local-date';

describe('StreakCalendarComponent cell classes', () => {
  const today = todayLocalISO();
  const studiedDay = addDaysISO(today, -3);
  const frozenDay = addDaysISO(today, -2);
  const emptyDay = addDaysISO(today, -1);

  const cases: { name: string; date: string; frozenDays?: string[]; cls: string | null; title: string }[] = [
    { name: 'a studied day', date: studiedDay, frozenDays: [frozenDay], cls: 'streak-cal__cell--filled', title: `${studiedDay} · studied` },
    { name: 'a frozen day', date: frozenDay, frozenDays: [frozenDay], cls: 'streak-cal__cell--frozen', title: `${frozenDay} · freeze used` },
    { name: 'an empty day', date: emptyDay, frozenDays: [frozenDay], cls: null, title: emptyDay },
    { name: 'a day when frozenDays is unset', date: frozenDay, frozenDays: undefined, cls: null, title: frozenDay },
  ];

  for (const { name, date, frozenDays, cls, title } of cases) {
    it(`styles ${name}`, () => {
      const fixture = TestBed.createComponent(StreakCalendarComponent);
      fixture.componentRef.setInput('studyDays', [studiedDay]);
      if (frozenDays !== undefined) fixture.componentRef.setInput('frozenDays', frozenDays);
      fixture.detectChanges();

      const cell = Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('.streak-cal__grid .streak-cal__cell'),
      ).find((el) => el.getAttribute('title')?.startsWith(date));

      expect(cell).toBeTruthy();
      expect(cell!.getAttribute('title')).toBe(title);
      for (const other of ['streak-cal__cell--filled', 'streak-cal__cell--frozen']) {
        expect(cell!.classList.contains(other)).toBe(other === cls);
      }
    });
  }
});
