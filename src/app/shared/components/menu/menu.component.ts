import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export type MenuDotState = 'none' | 'running' | 'failed' | 'off';
export type MenuSize = 'sm' | 'md' | 'lg';
export type MenuIcon = 'dots' | 'bars';
export type MenuAlign = 'end' | 'start';

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])';
const ANY_ITEM_SELECTOR = '[role="menuitem"]';
const KEEPS_OPEN_SELECTOR = '[data-keeps-open]';
const NAVIGATION_KEYS: ReadonlySet<string> = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

let nextMenuId = 0;

/** Index of the item to focus for a navigation key; `current` is -1 when focus is not on an item. */
function nextItemIndex(key: string, current: number, count: number): number {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
}

/**
 * A ghost "more" (three dots) trigger with a popup menu. Items are projected `button` / `a`
 * elements carrying `role="menuitem"`; an item with `data-keeps-open` leaves the menu open when
 * activated (its owner calls `close()` once the action succeeded).
 */
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'menu' },
})
export class MenuComponent {
  /** The trigger's accessible name. */
  readonly label = input.required<string>();
  readonly size = input<MenuSize>('md');
  readonly icon = input<MenuIcon>('dots');
  readonly dotState = input<MenuDotState>('none');
  readonly align = input<MenuAlign>('end');
  readonly opened = output<void>();

  protected readonly isOpen = signal(false);
  protected readonly panelId = `menu-panel-${nextMenuId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.dismiss(false));
  }

  open(): void {
    if (this.isOpen()) return;
    this.isOpen.set(true);
    this.opened.emit();
  }

  /** Closes the menu and hands focus back to the trigger. */
  close(): void {
    this.dismiss(true);
  }

  protected toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  /** A click on a projected item closes the menu unless the item asks to keep it open (activation is the item's own). */
  @HostListener('click', ['$event'])
  protected onPanelClick(event: MouseEvent): void {
    const panel = this.panel()?.nativeElement;
    if (panel === undefined || !(event.target instanceof Element) || !panel.contains(event.target)) return;
    const item = event.target.closest(ANY_ITEM_SELECTOR);
    if (item !== null && item.closest(KEEPS_OPEN_SELECTOR) === null) this.close();
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.isOpen()) this.close();
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    // composedPath is fixed at dispatch, so a click on an item the menu has since removed still counts as inside.
    if (this.isOpen() && !event.composedPath().includes(this.host.nativeElement)) this.dismiss(false);
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && this.isOpen()) {
      this.close();
      return;
    }
    if (!NAVIGATION_KEYS.has(event.key) || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    if (this.isOpen()) {
      this.focusByKey(event.key);
      return;
    }
    this.open();
    afterNextRender(() => this.focusByKey(event.key), { injector: this.injector });
  }

  private focusByKey(key: string): void {
    const items = this.items();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[nextItemIndex(key, current, items.length)].focus();
  }

  private items(): HTMLElement[] {
    const panel = this.panel()?.nativeElement;
    return panel === undefined ? [] : Array.from(panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  }

  private dismiss(shouldRefocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    if (shouldRefocus) this.trigger()?.nativeElement.focus();
  }
}
