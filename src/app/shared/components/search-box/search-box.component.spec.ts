import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchBoxComponent } from './search-box.component';

@Component({
  imports: [SearchBoxComponent],
  template: `
    <div class="parent">
      <app-search-box
        placeholder="Search"
        [shortcut]="shortcut()"
        [(value)]="value"
        (submitted)="submits = submits + 1"
        (arrowDown)="downs = downs + 1"
      />
    </div>
  `,
})
class HostComponent {
  readonly shortcut = signal(false);
  readonly value = signal('');
  submits = 0;
  downs = 0;
}

function mount(): { fixture: ComponentFixture<HostComponent>; host: HostComponent; input: HTMLInputElement } {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  document.body.appendChild(fixture.nativeElement);
  return { fixture, host: fixture.componentInstance, input };
}

function press(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('SearchBoxComponent', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('typing updates the bound value', () => {
    const { fixture, host, input } = mount();
    input.value = 'two';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.value()).toBe('two');
  });

  it.each([
    { name: 'Escape with text clears and does not bubble', text: 'two', bubbles: false, cleared: true },
    { name: 'Escape when empty bubbles', text: '', bubbles: true, cleared: true },
  ])('$name', ({ text, bubbles, cleared }) => {
    const { fixture, host, input } = mount();
    host.value.set(text);
    fixture.detectChanges();
    let reachedParent = false;
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', () => (reachedParent = true));
    press(input, 'Escape');
    fixture.detectChanges();
    expect(reachedParent).toBe(bubbles);
    expect(host.value() === '').toBe(cleared);
  });

  it.each<{ name: string; isShortcutOn: boolean; origin: 'body' | 'textarea'; isFocused: boolean }>([
    { name: '/ on body focuses when shortcut is on', isShortcutOn: true, origin: 'body', isFocused: true },
    { name: '/ on body does nothing when shortcut is off', isShortcutOn: false, origin: 'body', isFocused: false },
    { name: '/ from a textarea does nothing', isShortcutOn: true, origin: 'textarea', isFocused: false },
  ])('$name', ({ isShortcutOn, origin, isFocused }) => {
    const { fixture, host, input } = mount();
    host.shortcut.set(isShortcutOn);
    fixture.detectChanges();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    press(origin === 'body' ? document.body : textarea, '/');
    textarea.remove();
    expect(document.activeElement === input).toBe(isFocused);
  });

  it('Enter emits submitted once and ArrowDown emits arrowDown once', () => {
    const { host, input } = mount();
    press(input, 'Enter');
    press(input, 'ArrowDown');
    expect(host.submits).toBe(1);
    expect(host.downs).toBe(1);
  });
});
