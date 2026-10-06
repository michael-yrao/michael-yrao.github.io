import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';

import { COPY_FEEDBACK_MS, copyText, type CopyMark } from '../copy-text';

/** An icon button that copies `text` to the clipboard and shows a check or a cross for a moment; disabled when there is no text. */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="copy-button" [attr.aria-label]="label()" [title]="label()" [disabled]="text() === null" (click)="copy()">
      @switch (mark()) {
        @case ('ok') {
          <svg class="copy-button__icon--ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        }
        @case ('fail') {
          <svg class="copy-button__icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        }
        @default {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </svg>
        }
      }
    </button>
  `,
  // The few `practice__btn practice__btn--icon` rules, inlined: the practice stylesheet also holds the practice page's layout.
  styles: `
    $icon-size: 1.1rem;
    .copy-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xs);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-raised);
      color: var(--color-text);
      font: inherit;
      cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .copy-button:hover:not(:disabled) { border-color: var(--color-accent); }
    .copy-button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .copy-button:disabled { opacity: 0.5; cursor: not-allowed; }
    .copy-button svg { width: $icon-size; height: $icon-size; }
    .copy-button__icon--ok { color: var(--color-found); }
    .copy-button__icon--fail { color: var(--color-hard); }
  `,
})
export class CopyButtonComponent {
  readonly text = input<string | null>(null);
  /** Both the accessible name and the hover name. */
  readonly label = input.required<string>();

  protected readonly mark = signal<CopyMark | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  /** The click calls `copyText` with no await before it, or Safari drops the gesture. */
  protected copy(): void {
    const text = this.text();
    if (text === null) return;
    copyText(text).then((isCopied) => this.showMark(isCopied ? 'ok' : 'fail'));
  }

  private showMark(mark: CopyMark): void {
    this.clearTimer();
    this.mark.set(mark);
    this.timer = setTimeout(() => this.mark.set(null), COPY_FEEDBACK_MS);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
