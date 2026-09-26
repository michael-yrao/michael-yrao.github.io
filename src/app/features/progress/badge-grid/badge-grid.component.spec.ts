import { TestBed } from '@angular/core/testing';

import { BadgeGridComponent } from './badge-grid.component';
import { Badge } from '../../../core/models/progress.model';

function makeBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: 'streak-7',
    title: '7-Day Streak',
    icon: '🔥',
    description: 'Study 7 days in a row.',
    earned: false,
    ...overrides,
  };
}

function createFixture(badges: Badge[]) {
  TestBed.configureTestingModule({ imports: [BadgeGridComponent] });
  const fixture = TestBed.createComponent(BadgeGridComponent);
  fixture.componentRef.setInput('badges', badges);
  fixture.detectChanges();
  return fixture;
}

describe('BadgeGridComponent', () => {
  it('renders the earned/total count in the summary row', () => {
    const fixture = createFixture([
      makeBadge({ id: 'a', earned: true }),
      makeBadge({ id: 'b', earned: true }),
      makeBadge({ id: 'c', earned: false }),
    ]);

    expect(fixture.nativeElement.querySelector('.badges__count')?.textContent).toContain('2 / 3');
  });

  it('defaults to showing all badges, earned first', () => {
    const fixture = createFixture([
      makeBadge({ id: 'locked-one', earned: false }),
      makeBadge({ id: 'earned-one', earned: true }),
    ]);

    const tiles = fixture.nativeElement.querySelectorAll('.badge');
    expect(tiles.length).toBe(2);
    expect(tiles[0].classList.contains('earned')).toBe(true);
    expect(tiles[1].classList.contains('locked')).toBe(true);
  });

  it('the Earned filter hides locked badges', () => {
    const fixture = createFixture([
      makeBadge({ id: 'locked-one', earned: false }),
      makeBadge({ id: 'earned-one', earned: true }),
    ]);

    const earnedBtn: HTMLButtonElement = Array.from(
      fixture.nativeElement.querySelectorAll('.badges__filter'),
    ).find((el) => (el as HTMLElement).textContent?.startsWith('Earned')) as HTMLButtonElement;
    earnedBtn.click();
    fixture.detectChanges();

    const tiles = fixture.nativeElement.querySelectorAll('.badge');
    expect(tiles.length).toBe(1);
    expect(tiles[0].classList.contains('earned')).toBe(true);
    expect(earnedBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('the Locked filter hides earned badges', () => {
    const fixture = createFixture([
      makeBadge({ id: 'locked-one', earned: false }),
      makeBadge({ id: 'earned-one', earned: true }),
    ]);

    const lockedBtn: HTMLButtonElement = Array.from(
      fixture.nativeElement.querySelectorAll('.badges__filter'),
    ).find((el) => (el as HTMLElement).textContent?.startsWith('Locked')) as HTMLButtonElement;
    lockedBtn.click();
    fixture.detectChanges();

    const tiles = fixture.nativeElement.querySelectorAll('.badge');
    expect(tiles.length).toBe(1);
    expect(tiles[0].classList.contains('locked')).toBe(true);
    expect(lockedBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows "20 / 25" on a locked counter badge carrying progress', () => {
    const fixture = createFixture([
      makeBadge({ id: 'trophies-25', earned: false, progress: { current: 20, target: 25 } }),
    ]);

    expect(fixture.nativeElement.querySelector('.badge__progress')?.textContent).toContain('20 / 25');
  });

  it('never shows a meter on an earned badge, even if it carries progress', () => {
    const fixture = createFixture([
      makeBadge({ id: 'trophies-25', earned: true, progress: { current: 25, target: 25 } }),
    ]);

    expect(fixture.nativeElement.querySelector('.badge__progress')).toBeFalsy();
  });

  it('shows no meter on a badge without progress', () => {
    const fixture = createFixture([makeBadge({ id: 'first-graduate', earned: false, progress: undefined })]);

    expect(fixture.nativeElement.querySelector('.badge__progress')).toBeFalsy();
  });

  it('shows the empty state when the Locked filter matches nothing', () => {
    const fixture = createFixture([makeBadge({ id: 'earned-one', earned: true })]);

    const lockedBtn: HTMLButtonElement = Array.from(
      fixture.nativeElement.querySelectorAll('.badges__filter'),
    ).find((el) => (el as HTMLElement).textContent?.startsWith('Locked')) as HTMLButtonElement;
    lockedBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.badges__empty')?.textContent).toContain(
      'Nothing locked — every badge is earned.',
    );
  });
});
