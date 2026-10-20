import { TestBed } from '@angular/core/testing';

import { EngineService } from '../../../../core/engine/engine.service';
import { ProblemProgress } from '../../../../core/models/progress.model';
import { HoldControlComponent } from './hold-control.component';

const TODAY = '2026-10-20';
const MAX_DATE = '2027-01-18'; // TODAY + 90 days

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

function render(heldUntil?: string) {
  TestBed.configureTestingModule({
    providers: [{ provide: EngineService, useValue: { hold: async () => 'held' } }],
  });
  const fixture = TestBed.createComponent(HoldControlComponent);
  fixture.componentRef.setInput('problem', problem(heldUntil));
  fixture.componentRef.setInput('itemTitle', 'Car Fleet');
  fixture.componentRef.setInput('lcNumber', 853);
  fixture.componentRef.setInput('todayISO', TODAY);
  fixture.detectChanges();
  return fixture;
}

describe('HoldControlComponent', () => {
  it.each<{ name: string; heldUntil?: string; mark: string | null }>([
    { name: 'no heldUntil shows no mark', mark: null },
    { name: 'a past heldUntil shows no mark', heldUntil: '2026-10-19', mark: null },
    { name: 'heldUntil today shows the mark', heldUntil: TODAY, mark: '⏸ 10/20' },
    { name: 'a future heldUntil shows the mark', heldUntil: '2026-11-03', mark: '⏸ 11/03' },
  ])('$name', ({ heldUntil, mark }) => {
    const element: HTMLElement = render(heldUntil).nativeElement;
    const shown = element.querySelector('.hold-control__mark')?.textContent?.trim() ?? null;
    expect(shown).toBe(mark);
  });

  it.each([{ name: 'the date input bounds are tomorrow and today plus the cap', min: '2026-10-21', max: MAX_DATE }])(
    '$name',
    ({ min, max }) => {
      const fixture = render();
      (fixture.nativeElement.querySelector('.hold-control__button') as HTMLButtonElement).click();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input.min).toBe(min);
      expect(input.max).toBe(max);
    },
  );
});
