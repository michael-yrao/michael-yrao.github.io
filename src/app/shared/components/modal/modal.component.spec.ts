import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-modal-host',
  imports: [ModalComponent],
  template: `
    <app-modal heading="Title" [isOpen]="isOpen()" (closed)="closeCount = closeCount + 1">
      <p class="inside">Inside</p>
    </app-modal>
  `,
})
class HostComponent {
  readonly isOpen = signal(false);
  closeCount = 0;
}

interface Setup {
  readonly fixture: ComponentFixture<HostComponent>;
  readonly host: HostComponent;
  readonly dialog: HTMLDialogElement;
}

function setUp(isOpen: boolean): Setup {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.isOpen.set(isOpen);
  fixture.detectChanges();
  const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
  return { fixture, host: fixture.componentInstance, dialog };
}

const OPEN_CASES: readonly { readonly name: string; readonly isOpenAfter: boolean; readonly expectedOpen: boolean }[] = [
  { name: 'opening shows the dialog', isOpenAfter: true, expectedOpen: true },
  { name: 'the parent closing it hides the dialog without a closed event', isOpenAfter: false, expectedOpen: false },
];

const USER_CLOSE_CASES: readonly { readonly name: string; readonly click: (dialog: HTMLElement) => void; readonly closeCount: number }[] = [
  { name: 'the Close button emits once', click: (dialog) => dialog.querySelector<HTMLElement>('button[aria-label="Close"]')!.click(), closeCount: 1 },
  { name: 'a click on the backdrop (the dialog itself) emits', click: (dialog) => dialog.click(), closeCount: 1 },
  { name: 'a click inside the body does not emit', click: (dialog) => dialog.querySelector<HTMLElement>('.modal__body')!.click(), closeCount: 0 },
  { name: 'an Escape keydown emits once', click: (dialog) => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })), closeCount: 1 },
];

describe('ModalComponent', () => {
  describe('open state', () => {
    it.each(OPEN_CASES)('$name', ({ isOpenAfter, expectedOpen }) => {
      const { fixture, host, dialog } = setUp(true);
      expect(dialog.open).toBe(true);

      host.isOpen.set(isOpenAfter);
      fixture.detectChanges();

      expect(dialog.open).toBe(expectedOpen);
      expect(host.closeCount).toBe(0);
    });
  });

  describe('user close', () => {
    it.each(USER_CLOSE_CASES)('$name', ({ click, closeCount }) => {
      const { host, dialog } = setUp(true);

      click(dialog);

      expect(host.closeCount).toBe(closeCount);
    });
  });
});
