import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, input, output } from '@angular/core';

let nextModalId = 0;

/** A native `<dialog>` opened while `isOpen` is true; `closed` says the user asked to close it (Escape, backdrop or Close). */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly isOpen = input(false);
  readonly heading = input.required<string>();
  readonly closed = output<void>();

  @ViewChild('dialog', { static: true }) private readonly dialog!: ElementRef<HTMLDialogElement>;

  protected readonly headingId = `modal-heading-${nextModalId++}`;

  constructor() {
    effect(() => this.sync(this.isOpen()));
  }

  /** Brings the dialog in line with `isOpen`, touching it only when it differs so a repeat never throws. */
  private sync(isOpen: boolean): void {
    const dialog = this.dialog.nativeElement;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }

  /** The native close (Escape) counts only while the parent still has the modal open; a close the parent asked for does not echo. */
  protected onNativeClose(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }

  /** The dialog has no padding, so a click whose target is the dialog itself landed on the backdrop. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) {
      this.closed.emit();
    }
  }
}
