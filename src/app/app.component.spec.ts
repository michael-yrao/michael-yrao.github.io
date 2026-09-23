import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { NavContextService, NavContextEntry } from './core/services/nav-context.service';

// Standard fixture for the nav-context popover tests below — only the fields
// the popover template and isDescriptionOpen actually read need real values.
function makeCtx(num: number): NavContextEntry {
  return { num, title: `Problem ${num}`, description: 'desc', examples: [], constraints: [] };
}

// A minimal routed target so clicking a real nav link (routerLink, not a
// synthetic call) resolves instead of throwing NG04002 for an unmatched URL.
@Component({
  selector: 'app-test-blank',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BlankComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let navCtx: NavContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([{ path: '**', component: BlankComponent }])],
    });
    fixture = TestBed.createComponent(AppComponent);
    navCtx = TestBed.inject(NavContextService);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the Progressive Overflow brand in the nav', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.po-nav__wordmark')?.textContent?.trim()).toBe(
      'progressiveoverflow',
    );
    expect(compiled.querySelector('.po-nav__brand')?.getAttribute('aria-label')).toBe(
      'Progressive Overflow — home',
    );
    expect(compiled.querySelector('.po-nav__brand app-logo-mark svg')).toBeTruthy();
  });

  it('renders the hamburger as the first child of the nav bar, before the brand', () => {
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.po-nav__inner') as HTMLElement;
    const children = Array.from(inner.children);
    expect(children[0]?.classList.contains('po-nav__hamburger')).toBe(true);
    expect(children.findIndex((el) => el.classList.contains('po-nav__hamburger'))).toBeLessThan(
      children.findIndex((el) => el.classList.contains('po-nav__brand')),
    );
  });

  it('renders the footer with exactly the human line and copyright, and no anchors', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('.po-footer') as HTMLElement;
    expect(footer.textContent?.trim()).toBe(
      `Built by a human, with Claude in the loop.© ${new Date().getFullYear()}`,
    );
    expect(footer.querySelectorAll('a').length).toBe(0);
  });

  describe('Menu drawer', () => {
    it('opens on hamburger click, flipping aria-expanded and aria-label, and closes again on a second click', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector(
        '.po-nav__hamburger',
      ) as HTMLButtonElement;

      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger.getAttribute('aria-label')).toBe('Open menu');

      hamburger.click();
      fixture.detectChanges();
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(hamburger.getAttribute('aria-label')).toBe('Close menu');
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeTruthy();

      hamburger.click();
      fixture.detectChanges();
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger.getAttribute('aria-label')).toBe('Open menu');
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();
    });

    it('lists exactly Progress, Library, Coach, Human in order with the right routerLinks', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector(
        '.po-nav__hamburger',
      ) as HTMLButtonElement;
      hamburger.click();
      fixture.detectChanges();

      const drawer = fixture.nativeElement.querySelector('.po-nav__drawer') as HTMLElement;
      const links = Array.from(drawer.querySelectorAll<HTMLAnchorElement>('a.po-nav__drawer-link'));

      expect(links.map((a) => a.textContent?.trim())).toEqual([
        'Progress',
        'Library',
        'Coach',
        'Human',
      ]);
      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        '/',
        '/library',
        '/coach',
        '/about',
      ]);

      const secondary = drawer.querySelector('.po-nav__drawer-secondary') as HTMLElement;
      const [progressLink, libraryLink, coachLink, humanLink] = links;
      expect(secondary.contains(coachLink)).toBe(true);
      expect(secondary.contains(humanLink)).toBe(true);
      expect(secondary.contains(progressLink)).toBe(false);
      expect(secondary.contains(libraryLink)).toBe(false);

      expect(links.every((a) => !(a.getAttribute('href') ?? '').startsWith('http'))).toBe(true);
    });

    it('closes on a link click, on Escape, and on the backdrop', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector(
        '.po-nav__hamburger',
      ) as HTMLButtonElement;

      hamburger.click();
      fixture.detectChanges();
      const humanLink = Array.from(
        fixture.nativeElement.querySelectorAll('.po-nav__drawer a'),
      ).find((a) => (a as HTMLElement).textContent?.trim() === 'Human') as HTMLElement;
      humanLink.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();

      hamburger.click();
      fixture.detectChanges();
      fixture.componentInstance.onEscape();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();

      hamburger.click();
      fixture.detectChanges();
      const backdrop = fixture.nativeElement.querySelector('.po-nav__backdrop') as HTMLElement;
      expect(backdrop).toBeTruthy();
      backdrop.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();
    });
  });

  describe('Description popover', () => {
    it('stays closed after ctx clears, even once a new ctx arrives', () => {
      navCtx.set(makeCtx(1));
      fixture.detectChanges();
      const contextButton = fixture.nativeElement.querySelector('.po-nav__context') as HTMLButtonElement;
      contextButton.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__popover')).toBeTruthy();

      navCtx.clear();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__popover')).toBeFalsy();

      // The bug: a plain "user asked for it" boolean survived the clear and
      // reopened as soon as ANY ctx (even a different problem) arrived again.
      navCtx.set(makeCtx(2));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__popover')).toBeFalsy();
    });

    it('reopens for the same problem it was toggled open for', () => {
      navCtx.set(makeCtx(1));
      fixture.detectChanges();
      const contextButton = fixture.nativeElement.querySelector('.po-nav__context') as HTMLButtonElement;
      contextButton.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__popover')).toBeTruthy();

      contextButton.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__popover')).toBeFalsy();
    });
  });
});
