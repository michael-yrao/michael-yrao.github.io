import { TestBed } from '@angular/core/testing';

import { SettingsMenuComponent } from './settings-menu.component';
import { SolutionLinkModeService } from '../solution-link-mode.service';
import { SOLUTION_LINK_MODE_STORAGE_KEY } from '../solution-link-mode';

function openPanel(fixture: { nativeElement: HTMLElement; detectChanges: () => void }): HTMLButtonElement {
  const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.settings-menu__btn')!;
  btn.click();
  fixture.detectChanges();
  return btn;
}

describe('SettingsMenuComponent', () => {
  // The GitHub-choice test below sets the shared SolutionLinkModeService — clear its
  // persisted key after each test so that choice never leaks into a later test's fixture.
  afterEach(() => localStorage.removeItem(SOLUTION_LINK_MODE_STORAGE_KEY));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SettingsMenuComponent] });
  });

  // Table-driven: three ways to interact with an open panel — a click outside it (on
  // document.body), an Escape keydown (from the toggle button), and a click INSIDE the panel
  // itself — only the first two close it.
  const cases: [string, (fixture: ReturnType<typeof TestBed.createComponent>, btn: HTMLButtonElement) => void, boolean][] = [
    ['a click on document.body closes the panel', () => document.body.click(), false],
    [
      'an Escape keydown on the button closes the panel',
      (_fixture, btn) =>
        btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      false,
    ],
    [
      'a click inside the panel leaves it open',
      (fixture) =>
        fixture.nativeElement
          .querySelector('.settings-menu__menu')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true })),
      true,
    ],
  ];

  it.each(cases)('%s', (_label, act, staysOpen) => {
    const fixture = TestBed.createComponent(SettingsMenuComponent);
    fixture.detectChanges();
    const btn = openPanel(fixture);
    expect(fixture.nativeElement.querySelector('.settings-menu__menu')).toBeTruthy();

    act(fixture, btn);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('.settings-menu__menu');
    if (staysOpen) {
      expect(menu).toBeTruthy();
    } else {
      expect(menu).toBeFalsy();
    }
  });

  it('choosing GitHub sets SolutionLinkModeService.mode() to github and leaves the panel open', () => {
    const fixture = TestBed.createComponent(SettingsMenuComponent);
    fixture.detectChanges();
    openPanel(fixture);

    const githubOption = Array.from(
      fixture.nativeElement.querySelectorAll('.settings-menu__option'),
    ).find((b) => (b as HTMLElement).textContent?.trim() === 'GitHub') as HTMLButtonElement;
    githubOption.click();
    fixture.detectChanges();

    expect(TestBed.inject(SolutionLinkModeService).mode()).toBe('github');
    expect(fixture.nativeElement.querySelector('.settings-menu__menu')).toBeTruthy();
  });
});
