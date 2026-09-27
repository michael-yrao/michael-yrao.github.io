import { TestBed } from '@angular/core/testing';

import { DsaGrowthStats, GrowthAreasComponent } from './growth-areas.component';

const DEFAULT_STATS: DsaGrowthStats = {
  streakDays: 5,
  problemsMastered: 12,
  coverage: { started: 3, total: 10 },
};

function createFixture(stats: DsaGrowthStats = DEFAULT_STATS) {
  TestBed.configureTestingModule({ imports: [GrowthAreasComponent] });
  const fixture = TestBed.createComponent(GrowthAreasComponent);
  fixture.componentRef.setInput('dsaStats', stats);
  fixture.detectChanges();
  return fixture;
}

describe('GrowthAreasComponent', () => {
  it('renders one live DSA card and two coming-soon cards', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelectorAll('.growth-card--live').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.growth-card--soon').length).toBe(2);
  });

  it('emits open when the live card\'s button is clicked', () => {
    const fixture = createFixture();
    const opened: void[] = [];
    fixture.componentInstance.open.subscribe(() => opened.push(undefined));

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.growth-card__btn');
    expect(btn).toBeTruthy();
    btn.click();

    expect(opened.length).toBe(1);
  });
});
