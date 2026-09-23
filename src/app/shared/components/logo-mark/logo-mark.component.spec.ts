import { TestBed } from '@angular/core/testing';

import { LogoMarkComponent } from './logo-mark.component';

const DEFAULT_SIZE_PX = 28;
const DEFAULT_LABEL = 'Progressive Overflow';
const RECT_COUNT = 5;

function createFixture(opts: { size?: number; label?: string } = {}) {
  TestBed.configureTestingModule({ imports: [LogoMarkComponent] });
  const fixture = TestBed.createComponent(LogoMarkComponent);
  if (opts.size !== undefined) fixture.componentRef.setInput('size', opts.size);
  if (opts.label !== undefined) fixture.componentRef.setInput('label', opts.label);
  fixture.detectChanges();
  return fixture;
}

describe('LogoMarkComponent', () => {
  it('renders an svg at the default size with 5 rects', () => {
    const fixture = createFixture();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('width')).toBe(`${DEFAULT_SIZE_PX}`);
    expect(svg.getAttribute('height')).toBe(`${DEFAULT_SIZE_PX}`);
    expect(svg.getAttribute('viewBox')).toBe('0 0 64 64');
    expect(fixture.nativeElement.querySelectorAll('rect').length).toBe(RECT_COUNT);
  });

  it('renders an svg at a given size', () => {
    const fixture = createFixture({ size: 40 });

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('40');
    expect(svg.getAttribute('height')).toBe('40');
  });

  it('labels the svg with the default label by default', () => {
    const fixture = createFixture();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(DEFAULT_LABEL);
    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('labels the svg with a custom label', () => {
    const fixture = createFixture({ label: 'Progressive Overflow — home' });

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-label')).toBe('Progressive Overflow — home');
  });

  it('renders aria-hidden with no role or label when label is empty', () => {
    const fixture = createFixture({ label: '' });

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('role')).toBe(false);
    expect(svg.hasAttribute('aria-label')).toBe(false);
  });
});
