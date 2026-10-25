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
}

function render(isRunning: boolean): HTMLElement {
  TestBed.configureTestingModule({
    imports: [PracticeHeaderComponent],
    providers: [provideRouter([]), { provide: TodaySessionService, useValue: { isRunning: () => isRunning } }],
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
