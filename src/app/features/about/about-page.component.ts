import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SITE_LINKS } from '../../core/data/site-links';

@Component({
  selector: 'app-about-page',
  templateUrl: './about-page.component.html',
  styleUrls: ['./about-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  readonly SITE_LINKS = SITE_LINKS;
}
