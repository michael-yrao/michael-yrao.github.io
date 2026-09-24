import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutPageComponent } from './about-page.component';
import { SITE_LINKS } from '../../core/data/site-links';

describe('AboutPageComponent', () => {
  let component: AboutPageComponent;
  let fixture: ComponentFixture<AboutPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AboutPageComponent],
    });
    fixture = TestBed.createComponent(AboutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders two bio paragraphs, the first mentioning Finance Command Center', () => {
    const el = fixture.nativeElement as HTMLElement;
    const bios = el.querySelectorAll('.hero__bio');
    expect(bios.length).toBe(2);
    expect(bios[0].textContent).toContain('Finance Command Center');
  });

  it('renders a support link to Venmo that opens in a new tab', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector('a.support-link');
    expect(cta?.getAttribute('href')).toBe(SITE_LINKS.venmo);
    expect(cta?.getAttribute('target')).toBe('_blank');
    const rel = cta?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });
});
