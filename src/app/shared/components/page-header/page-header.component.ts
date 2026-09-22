import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
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
  @Input({ required: true }) breadcrumb: BreadcrumbEntry[] = [];
  @Input() eyebrow: string | null = null;
  // Optional (not required): problem-page renders its own rich title row (LC
  // number, external link, difficulty badge, tags) below this header and only
  // needs the breadcrumb + meta slot from here, so it omits `heading` entirely.
  // Named `heading`, not `title` — `title` collides with the native HTML
  // `title` attribute (tooltip-on-hover), which every element already has.
  @Input() heading = '';
  @Input() icon: string | null = null;
}
