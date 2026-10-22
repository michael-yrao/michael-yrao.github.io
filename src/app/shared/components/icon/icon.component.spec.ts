import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';
import { ICON_PATHS, IconName } from './icon-paths';

function createFixture(name: IconName, label?: string) {
  TestBed.configureTestingModule({ imports: [IconComponent] });
  const fixture = TestBed.createComponent(IconComponent);
  fixture.componentRef.setInput('name', name);
  if (label !== undefined) fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture;
}

describe('IconComponent', () => {
  const names: readonly IconName[] = ['flame', 'check'];

  it.each(names)('renders one path with the %s data', (name) => {
    const fixture = createFixture(name);

    const paths = fixture.nativeElement.querySelectorAll('path');
    expect(paths.length).toBe(1);
    expect(paths[0].getAttribute('d')).toBe(ICON_PATHS[name]);
  });

  it('exposes the input name as data-name', () => {
    const svg = createFixture('check').nativeElement.querySelector('svg');
    expect(svg.getAttribute('data-name')).toBe('check');
  });

  it('is decorative by default and labelled when given a label', () => {
    const decorative = createFixture('flame').nativeElement.querySelector('svg');
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.hasAttribute('role')).toBe(false);

    TestBed.resetTestingModule();
    const labelled = createFixture('flame', 'Streak').nativeElement.querySelector('svg');
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Streak');
  });
});
