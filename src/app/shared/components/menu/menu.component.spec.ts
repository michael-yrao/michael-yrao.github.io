import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuComponent, MenuDotState, MenuIcon } from './menu.component';

@Component({
  imports: [MenuComponent],
  template: `
    <app-menu label="More" [dotState]="dot()" [icon]="icon()" [text]="text()">
      <button type="button" role="menuitem" class="menu__item first">One</button>
      <button type="button" role="menuitem" class="menu__item second">Two</button>
      <button type="button" role="menuitem" class="menu__item last">Three</button>
      <div class="menu__row">status</div>
    </app-menu>
  `,
})
class HostComponent {
  readonly dot = signal<MenuDotState>('none');
  readonly icon = signal<MenuIcon>('dots');
  readonly text = signal<string | null>(null);
}

function mount(): { fixture: ComponentFixture<HostComponent>; el: HTMLElement } {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const trigger = (el: HTMLElement) => el.querySelector('.menu__trigger') as HTMLButtonElement;
const panel = (el: HTMLElement) => el.querySelector('.menu__panel');
const pick = (el: HTMLElement, selector: string) => el.querySelector(selector) as HTMLElement;

describe('MenuComponent open and close', () => {
  it.each<{ name: string; act: (el: HTMLElement, render: () => void) => void; isOpen: boolean; isTriggerFocused: boolean }>([
    { name: 'a trigger click opens it', act: (el) => trigger(el).click(), isOpen: true, isTriggerFocused: false },
    {
      name: 'Escape closes it',
      act: (el) => {
        trigger(el).click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      },
      isOpen: false,
      isTriggerFocused: true,
    },
    {
      name: 'an outside click closes it',
      act: (el) => {
        trigger(el).click();
        document.body.click();
      },
      isOpen: false,
      isTriggerFocused: false,
    },
    {
      name: 'a click on a non-item inside stays open',
      act: (el, render) => {
        trigger(el).click();
        render();
        pick(el, '.menu__row').click();
      },
      isOpen: true,
      isTriggerFocused: false,
    },
    {
      name: 'an item click closes it and refocuses the trigger',
      act: (el, render) => {
        trigger(el).click();
        render();
        pick(el, '.first').click();
      },
      isOpen: false,
      isTriggerFocused: true,
    },
  ])('$name', ({ act, isOpen, isTriggerFocused }) => {
    const { fixture, el } = mount();
    act(el, () => fixture.detectChanges());
    fixture.detectChanges();
    expect(panel(el) !== null).toBe(isOpen);
    expect(document.activeElement === trigger(el)).toBe(isTriggerFocused);
  });
});

describe('MenuComponent keyboard', () => {
  it.each<{ name: string; focus: string | null; key: string; focused: string }>([
    { name: 'ArrowDown from the trigger focuses the first item', focus: null, key: 'ArrowDown', focused: 'first' },
    { name: 'ArrowDown from an item moves to the next', focus: 'first', key: 'ArrowDown', focused: 'second' },
    { name: 'ArrowUp from the trigger wraps to the last', focus: null, key: 'ArrowUp', focused: 'last' },
    { name: 'ArrowDown from the last wraps to the first', focus: 'last', key: 'ArrowDown', focused: 'first' },
    { name: 'Home focuses the first', focus: 'last', key: 'Home', focused: 'first' },
    { name: 'End focuses the last', focus: 'first', key: 'End', focused: 'last' },
  ])('$name', ({ focus, key, focused }) => {
    const { fixture, el } = mount();
    trigger(el).click();
    fixture.detectChanges();
    const origin = focus === null ? trigger(el) : pick(el, `.${focus}`);
    origin.focus();
    origin.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(document.activeElement).toBe(pick(el, `.${focused}`));
  });
});

describe('MenuComponent icon', () => {
  it.each<{ icon: MenuIcon; shape: string }>([
    { icon: 'dots', shape: 'circle' },
    { icon: 'bars', shape: 'rect' },
  ])('$icon draws three $shape', ({ icon, shape }) => {
    const { fixture, el } = mount();
    fixture.componentInstance.icon.set(icon);
    fixture.detectChanges();
    expect(trigger(el).getAttribute('data-icon')).toBe(icon);
    expect(trigger(el).querySelectorAll(`svg ${shape}`).length).toBe(3);
  });
});

describe('MenuComponent text', () => {
  it.each<{ text: string | null; hasSvg: boolean; label: string | null }>([
    { text: 'ada', hasSvg: false, label: 'ada' },
    { text: null, hasSvg: true, label: null },
  ])('text $text: svg present is $hasSvg', ({ text, hasSvg, label }) => {
    const { fixture, el } = mount();
    fixture.componentInstance.text.set(text);
    fixture.detectChanges();
    expect(trigger(el).querySelector(':scope > svg') !== null).toBe(hasSvg);
    expect(trigger(el).querySelector('.menu__trigger-text')?.textContent ?? null).toBe(label);
  });
});

describe('MenuComponent dot', () => {
  it.each<{ dot: MenuDotState; state: string | null }>([
    { dot: 'none', state: null },
    { dot: 'running', state: 'running' },
    { dot: 'failed', state: 'failed' },
    { dot: 'off', state: 'off' },
  ])('$dot draws $state', ({ dot, state }) => {
    const { fixture, el } = mount();
    fixture.componentInstance.dot.set(dot);
    fixture.detectChanges();
    expect(el.querySelector('.menu__dot')?.getAttribute('data-state') ?? null).toBe(state);
  });
});
