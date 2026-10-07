import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbEntry {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class PageHeaderComponent {
  readonly breadcrumb = input.required<BreadcrumbEntry[]>();
  readonly eyebrow = input<string | null>(null);
  // Optional (not required): the practice page renders its own rich title row (LC
  // number, external link, difficulty badge, tags) below this header and only
  // needs the breadcrumb + meta slot from here, so it omits `heading` entirely.
  // Named `heading`, not `title` — `title` collides with the native HTML
  // `title` attribute (tooltip-on-hover), which every element already has.
  readonly heading = input('');
  readonly icon = input<string | null>(null);
}
