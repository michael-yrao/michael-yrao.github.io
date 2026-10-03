import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { InterviewSessionService } from '../interview-session.service';
import { InterviewBarComponent } from './interview-bar.component';

const INVITE_URL = 'https://example.com/practice/1?repo=me/notes&join=abc';
const NAME_INPUT = 'input[aria-label="Your name"]';
const SHARE_BUTTON = '[aria-label="Share invite link"]';
const EDIT_BUTTON = '[aria-label="Edit name"]';
const NAME_LABEL = '.interview-bar__name-label';

function setup(storedName: string, hasShare: boolean) {
  TestBed.resetTestingModule();
  const myName = signal(storedName);
  const setMyName = vi.fn((name: string) => myName.set(name.trim()));
  const stub = {
    role: signal('interviewer'),
    status: signal('open'),
    inviteUrl: signal<string | null>(INVITE_URL),
    peerName: signal(''),
    myName,
    setMyName,
    end: () => undefined,
  };
  Object.defineProperty(navigator, 'share', { value: hasShare ? () => Promise.resolve() : undefined, configurable: true });
  TestBed.configureTestingModule({ providers: [{ provide: InterviewSessionService, useValue: stub }] });
  const fixture = TestBed.createComponent(InterviewBarComponent);
  fixture.detectChanges();
  return { fixture, setMyName };
}

const query = (fixture: ComponentFixture<InterviewBarComponent>, selector: string): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector(selector);

describe('InterviewBarComponent', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'share'));

  it('shows Share only when the browser supports it', () => {
    expect(query(setup('', true).fixture, SHARE_BUTTON)).not.toBeNull();
    expect(query(setup('', false).fixture, SHARE_BUTTON)).toBeNull();
  });

  it('starts in editing with no stored name and as a label with one', () => {
    expect(query(setup('', false).fixture, NAME_INPUT)).not.toBeNull();
    const { fixture } = setup('Alex', false);
    expect(query(fixture, NAME_INPUT)).toBeNull();
    expect(query(fixture, NAME_LABEL)?.textContent?.trim()).toBe('Alex');
    expect(query(fixture, EDIT_BUTTON)).not.toBeNull();
  });

  it('edits from the pencil, commits on Enter and turns back into a label', () => {
    const { fixture, setMyName } = setup('Alex', false);
    query(fixture, EDIT_BUTTON)!.click();
    fixture.detectChanges();
    const input = query(fixture, NAME_INPUT) as HTMLInputElement;
    input.value = 'Sam';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(setMyName).toHaveBeenCalledExactlyOnceWith('Sam');
    expect(query(fixture, NAME_INPUT)).toBeNull();
    expect(query(fixture, NAME_LABEL)?.textContent?.trim()).toBe('Sam');
  });

  it('stays in editing and stores nothing when the name is only spaces', () => {
    const { fixture, setMyName } = setup('', false);
    const input = query(fixture, NAME_INPUT) as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(setMyName).not.toHaveBeenCalled();
    expect(query(fixture, NAME_INPUT)).not.toBeNull();
  });
});
