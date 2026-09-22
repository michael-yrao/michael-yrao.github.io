import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { NavContextService, NavContextEntry } from './core/services/nav-context.service';

// Standard fixture for the nav-context popover tests below — only the fields
// the popover template and isDescriptionOpen actually read need real values.
function makeCtx(num: number): NavContextEntry {
  return { num, title: `Problem ${num}`, description: 'desc', examples: [], constraints: [] };
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let navCtx: NavContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
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
    expect(compiled.querySelector('.po-nav__title')?.textContent).toContain('Progressive Overflow');
  });

  it('renders exactly Progress · Library · Human in the top-level nav links', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const topLevelLinks = compiled.querySelectorAll(
      '.po-nav__links > a, .po-nav__links > .po-nav__dropdown > a',
    );
    const linkText = Array.from(topLevelLinks).map((a) => a.textContent?.trim());
    expect(linkText).toEqual(['Progress', 'Library', 'Human']);
  });

  it('renders the footer with the exact wording and links', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('.po-footer');
    expect(footer?.textContent).toContain('Built by a human, with Claude in the loop.');
    expect(footer?.querySelector('a[href="https://github.com/michael-yrao/michael-yrao.github.io"]')?.textContent)
      .toContain('GitHub ↗');
    expect(footer?.textContent).toContain('Get the coach');
    expect(footer?.textContent).toContain(`© ${new Date().getFullYear()}`);
  });

  describe('Library dropdown', () => {
    it('opens on click and sets aria-expanded, closes again on a second click', () => {
      fixture.detectChanges();
      const toggle = fixture.nativeElement.querySelector('.po-nav__dropdown-toggle') as HTMLButtonElement;

      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeTruthy();

      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeFalsy();
    });

    it('opens on hover', () => {
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector('.po-nav__dropdown') as HTMLElement;

      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeTruthy();

      wrapper.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeFalsy();
    });

    it('closes on Escape', () => {
      fixture.detectChanges();
      const toggle = fixture.nativeElement.querySelector('.po-nav__dropdown-toggle') as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeTruthy();

      fixture.componentInstance.onEscape();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeFalsy();
    });

    it('closes on outside click (the backdrop)', () => {
      fixture.detectChanges();
      const toggle = fixture.nativeElement.querySelector('.po-nav__dropdown-toggle') as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();

      const backdrop = fixture.nativeElement.querySelector('.po-nav__backdrop') as HTMLElement;
      expect(backdrop).toBeTruthy();
      backdrop.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeFalsy();
    });

    it('⌄ click while hovered-open closes the panel outright, not just unpins it', () => {
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector('.po-nav__dropdown') as HTMLElement;
      const toggle = fixture.nativeElement.querySelector('.po-nav__dropdown-toggle') as HTMLButtonElement;

      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeTruthy();

      // Previously this only flipped isLibraryPinned, so isLibraryHovered stayed
      // true and the panel (hovered || pinned) never actually closed.
      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeFalsy();

      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__dropdown-panel')).toBeTruthy();
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

  describe('Mobile drawer', () => {
    it('opens the drawer on hamburger click and lists all links flat', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector('.po-nav__hamburger') as HTMLButtonElement;

      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      hamburger.click();
      fixture.detectChanges();

      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      const drawer = fixture.nativeElement.querySelector('.po-nav__drawer') as HTMLElement;
      const drawerText = drawer.textContent ?? '';
      expect(drawerText).toContain('Progress');
      expect(drawerText).toContain('Algorithms');
      expect(drawerText).toContain('Patterns');
      expect(drawerText).toContain('Games');
      expect(drawerText).toContain('Human');
    });

    it('closes the drawer again on a second hamburger click', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector('.po-nav__hamburger') as HTMLButtonElement;
      hamburger.click();
      fixture.detectChanges();
      hamburger.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();
    });

    it('closes on resize above the nav breakpoint', () => {
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector('.po-nav__hamburger') as HTMLButtonElement;
      hamburger.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeTruthy();

      const ABOVE_BREAKPOINT_PX = 1024;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: ABOVE_BREAKPOINT_PX });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.po-nav__drawer')).toBeFalsy();
    });
  });
});
