import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PracticeHeaderComponent, PracticeHeaderPane } from './practice-header.component';

@Component({ selector: 'app-today-strip', template: '' })
class TodayStripStub {
  readonly number = input<unknown>();
  readonly isCelebrating = input<unknown>();
}

function createFixture(
  isTitleShown: boolean,
  pane: PracticeHeaderPane | null,
  titleUrl: string | null = null,
): ComponentFixture<PracticeHeaderComponent> {
  TestBed.configureTestingModule({
    imports: [PracticeHeaderComponent],
    providers: [provideRouter([])],
  }).overrideComponent(PracticeHeaderComponent, {
    set: { imports: [NgClass, RouterLink, IconComponent, TodayStripStub] },
  });
  const fixture = TestBed.createComponent(PracticeHeaderComponent);
  fixture.componentRef.setInput('number', 2);
  fixture.componentRef.setInput('title', 'Add Two Numbers');
  fixture.componentRef.setInput('titleUrl', titleUrl);
  fixture.componentRef.setInput('difficulty', null);
  fixture.componentRef.setInput('isTitleShown', isTitleShown);
  fixture.componentRef.setInput('pane', pane);
  fixture.detectChanges();
  return fixture;
}

function render(isTitleShown = true, titleUrl: string | null = null): HTMLElement {
  return createFixture(isTitleShown, null, titleUrl).nativeElement;
}

describe('PracticeHeaderComponent title', () => {
  it('shows the heading with the whole title as its tooltip, and hides it when the page names the problem', () => {
    const shown = render();
    const heading = shown.querySelector('.practice-header__heading')!;
    expect(heading.getAttribute('title')).toBe('Add Two Numbers');
    TestBed.resetTestingModule();

    const hidden = render(false);
    expect(hidden.querySelector('.practice-header__heading')).toBeNull();
  });

  it.each<{ titleUrl: string | null }>([
    { titleUrl: null },
    { titleUrl: 'https://leetcode.com/problems/x/' },
  ])('titleUrl $titleUrl: the title links to practice and the external arrow is its own link', ({ titleUrl }) => {
    const root = render(true, titleUrl);
    const titleLink = root.querySelector('a.practice-header__title-link')!;
    const arrow = root.querySelector('a.practice-header__arrow');

    expect(titleLink.getAttribute('href')).toBe('/practice/2');
    if (titleUrl === null) {
      expect(arrow).toBeNull();
      return;
    }
    expect(arrow!.getAttribute('href')).toBe(titleUrl);
    expect(arrow!.getAttribute('target')).toBe('_blank');
  });
});

interface PaneCase {
  readonly name: string;
  readonly pane: PracticeHeaderPane | null;
  readonly tabs: readonly (readonly [string, string])[];
  readonly active: string | null;
}

describe('PracticeHeaderComponent pane tabs', () => {
  it.each<PaneCase>([
    { name: 'no pane (solution page)', pane: null, tabs: [], active: null },
    { name: 'solving: statement shown', pane: { shown: 'description', hasCode: false }, tabs: [], active: null },
    { name: 'solving: pane collapsed', pane: { shown: null, hasCode: false }, tabs: [], active: null },
    { name: 'code shown', pane: { shown: 'code', hasCode: true }, tabs: [['BUTTON', 'Description'], ['BUTTON', 'Code']], active: 'Code' },
    { name: 'statement shown beside code', pane: { shown: 'description', hasCode: true }, tabs: [['BUTTON', 'Description'], ['BUTTON', 'Code']], active: 'Description' },
  ])('$name: tabs, their elements and the active one', ({ pane, tabs, active }) => {
    const root: HTMLElement = createFixture(true, pane).nativeElement;
    const rendered = Array.from(root.querySelectorAll('.practice-header__tab'));

    expect(rendered.map((el) => [el.tagName, el.textContent?.trim()])).toEqual(tabs);
    expect(root.querySelector('.practice-header__tabs') !== null).toBe(tabs.length > 0);
    const activeTexts = rendered.filter((el) => el.classList.contains('practice-header__tab--active')).map((el) => el.textContent?.trim());
    expect(activeTexts).toEqual(active === null ? [] : [active]);
  });

  it('clicking a button tab emits its pane', () => {
    const fixture = createFixture(true, { shown: 'description', hasCode: true });
    const emitted: string[] = [];
    fixture.componentInstance.paneSelect.subscribe((view) => emitted.push(view));
    const [description, code] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.practice-header__tab'));

    code.click();
    description.click();

    expect(emitted).toEqual(['code', 'description']);
  });
});
