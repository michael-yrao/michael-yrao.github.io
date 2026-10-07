// Owns the inline `?repo=` picker's state (input text, invalid hint, open flag) and its submit rule.
import { signal } from '@angular/core';

export interface RepoPickerDeps {
  /** Shape check for a non-blank `owner/name[@branch]` entry. */
  readonly isValid: (raw: string) => boolean;
  /** Navigates to `?repo=<raw>` once a valid entry is submitted. */
  readonly navigate: (raw: string) => void;
}

export class RepoPicker {
  readonly inputValue = signal('');
  readonly isInvalid = signal(false);
  // Toggled by the header slug link's "change" control; the error state's own picker
  // outlet is unconditional and doesn't read this signal at all.
  readonly isOpen = signal(false);

  constructor(private readonly deps: RepoPickerDeps) {}

  onInputChange(value: string): void {
    this.inputValue.set(value);
    if (this.isInvalid()) this.isInvalid.set(false);
  }

  /** The header slug link's "change" control — reveals/hides the inline picker. */
  toggle(): void {
    this.isOpen.set(!this.isOpen());
  }

  /** Submits the picker form: navigates on a valid entry, otherwise leaves the URL alone and
   *  raises the same error hint the load-error state uses. A blank entry is rejected here
   *  explicitly, since `parseRepo('')` would resolve to the default repo. */
  submit(): void {
    const raw = this.inputValue().trim();
    if (!raw || !this.deps.isValid(raw)) {
      this.isInvalid.set(true);
      return;
    }
    this.isInvalid.set(false);
    this.isOpen.set(false);
    this.deps.navigate(raw);
  }
}
