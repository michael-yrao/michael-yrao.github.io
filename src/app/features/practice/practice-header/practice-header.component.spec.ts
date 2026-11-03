import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';

import { TodaySessionService } from '../../../core/today-session/today-session.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PracticeHeaderComponent } from './practice-header.component';

@Component({ selector: 'app-problem-list-panel', template: '' })
class ProblemListPanelStub {
  readonly catalogue = input<unknown>();
  readonly currentNumber = input<unknown>();
  readonly repo = input<unknown>();
}

@Component({ selector: 'app-today-strip', template: '' })
class TodayStripStub {
  readonly number = input<unknown>();
  readonly isCelebrating = input<unknown>();
}

function render(isRunning: boolean, isTitleShown = true): HTMLElement {
  TestBed.configureTestingModule({
    imports: [PracticeHeaderComponent],
    providers: [provideRouter([]), { provide: TodaySessionService, useValue: { isRunning: () => isRunning, handoff: () => null } }],
  }).overrideComponent(PracticeHeaderComponent, {
    set: { imports: [NgClass, RouterLink, IconComponent, ProblemListPanelStub, TodayStripStub] },
  });
  const fixture = TestBed.createComponent(PracticeHeaderComponent);
  fixture.componentRef.setInput('number', 2);
  fixture.componentRef.setInput('title', 'Add Two Numbers');
  fixture.componentRef.setInput('titleUrl', null);
  fixture.componentRef.setInput('difficulty', null);
  fixture.componentRef.setInput('neighbors', { prev: { number: 1 }, next: { number: 3 } });
  fixture.componentRef.setInput('activeTab', 'description');
  fixture.componentRef.setInput('hasSolution', false);
  fixture.componentRef.setInput('catalogue', []);
  fixture.componentRef.setInput('repo', null);
  fixture.componentRef.setInput('isTitleShown', isTitleShown);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('PracticeHeaderComponent neighbor links', () => {
  it.each([
    { name: 'during a run-through', isRunning: true, count: 0 },
    { name: 'outside a run-through', isRunning: false, count: 2 },
  ])('$name: renders $count prev / next links', ({ isRunning, count }) => {
    expect(render(isRunning).querySelectorAll('.neighbor-btn')).toHaveLength(count);
  });
});

describe('PracticeHeaderComponent title', () => {
  it('shows the heading with the whole title as its tooltip, and hides it when the page names the problem', () => {
    const shown = render(false);
    const heading = shown.querySelector('.practice-header__heading')!;
    expect(heading.getAttribute('title')).toBe('Add Two Numbers');
    expect(shown.querySelector('.practice-header__tabs .practice-header__tab')?.textContent?.trim()).toBe('Description');
    TestBed.resetTestingModule();

    const hidden = render(false, false);
    expect(hidden.querySelector('.practice-header__heading')).toBeNull();
    expect(hidden.querySelector('.practice-header__tab')).not.toBeNull();
  });
});
