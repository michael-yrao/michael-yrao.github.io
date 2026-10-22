import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  model,
  output,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';

const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

@Component({
  selector: 'app-search-box',
  imports: [IconComponent],
  templateUrl: './search-box.component.html',
  styleUrl: './search-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onDocumentKey($event)' },
})
export class SearchBoxComponent {
  readonly value = model('');
  readonly placeholder = input.required<string>();
  readonly label = input<string>();
  readonly shortcut = input(false);

  readonly submitted = output<void>();
  readonly arrowDown = output<void>();
  readonly arrowUp = output<void>();
  /** The id of the option a combobox owner marks active (focus stays in the field). */
  readonly activeDescendant = input<string | null>(null);

  protected readonly ariaLabel = computed(() => this.label() ?? this.placeholder());

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol in the
  // practice chunk's shared bundle.
  @ViewChild('input', { static: true }) private readonly inputRef!: ElementRef<HTMLInputElement>;

  focus(): void {
    this.inputRef.nativeElement.focus();
  }

  protected onEscape(event: Event): void {
    if (this.value() === '') return;
    this.value.set('');
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDocumentKey(event: KeyboardEvent): void {
    if (!this.shortcut() || event.key !== '/') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest(TEXT_ENTRY_SELECTOR)) return;
    event.preventDefault();
    this.focus();
  }
}
