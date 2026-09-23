import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const DEFAULT_SIZE_PX = 28;
const DEFAULT_LABEL = 'Progressive Overflow';

/**
 * The 64×64 Progressive Overflow mark, drawn as inline SVG from the site's own
 * theme tokens (`--color-text`, `--color-bg`, `--color-accent`) rather than a
 * static asset. This reproduces `mark-on-dark.svg` (see
 * `src/assets/brand/README.md` for the source kit).
 *
 * `label` doubles as the a11y toggle: the default announces the wordmark for a
 * bare mark (e.g. a favicon-style use), while an empty string means the mark is
 * purely decorative next to a text wordmark that already carries the name (the
 * nav brand block) — in that case the SVG is `aria-hidden` instead of labelled.
 */
@Component({
  selector: 'app-logo-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 64 64"
      [attr.role]="isDecorative() ? null : 'img'"
      [attr.aria-label]="isDecorative() ? null : label()"
      [attr.aria-hidden]="isDecorative() ? 'true' : null"
    >
      <rect x="4" y="8" width="56" height="56" rx="14" fill="var(--color-text)" />
      <rect x="8" y="42" width="9" height="16" rx="4.5" fill="var(--color-bg)" />
      <rect x="21" y="32" width="9" height="26" rx="4.5" fill="var(--color-bg)" />
      <rect x="34" y="22" width="9" height="36" rx="4.5" fill="var(--color-bg)" />
      <rect x="47" y="0" width="9" height="58" rx="4.5" fill="var(--color-accent)" />
    </svg>
  `,
})
export class LogoMarkComponent {
  readonly size = input(DEFAULT_SIZE_PX);
  readonly label = input(DEFAULT_LABEL);

  readonly isDecorative = computed(() => this.label() === '');
}
