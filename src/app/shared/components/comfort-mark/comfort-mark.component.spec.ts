import { TestBed } from '@angular/core/testing';

import { ComfortMarkComponent } from './comfort-mark.component';

function createFixture(comfort: string | null, label?: string, streak?: number | null) {
  TestBed.configureTestingModule({ imports: [ComfortMarkComponent] });
  const fixture = TestBed.createComponent(ComfortMarkComponent);
  fixture.componentRef.setInput('comfort', comfort);
  if (label !== undefined) fixture.componentRef.setInput('label', label);
  if (streak !== undefined) fixture.componentRef.setInput('streak', streak);
  fixture.detectChanges();
  return fixture;
}

describe('ComfortMarkComponent', () => {
  const cases: readonly {
    comfort: string;
    streak?: number;
    level: number;
    key: string;
    spoken: string;
    // [selector, attribute, expected value] for each element the stage must draw.
    drawn: readonly (readonly [string, string, string])[];
  }[] = [
    {
      comfort: '🔴', level: 1, key: 'blank', spoken: 'Comfort: blank',
      drawn: [['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-hard)']],
    },
    {
      comfort: '🟡', level: 2, key: 'shaky', spoken: 'Comfort: shaky',
      drawn: [['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-medium)']],
    },
    {
      comfort: '🟢', streak: 0, level: 3, key: 's0', spoken: 'Comfort: clean, streak 0',
      drawn: [['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-easy)']],
    },
    {
      comfort: '🟢', streak: 1, level: 4, key: 's1', spoken: 'Comfort: clean, streak 1',
      drawn: [['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-easy)'], ['path', 'fill', 'var(--color-easy)']],
    },
    { comfort: '🟢', streak: 2, level: 5, key: 's2', spoken: 'Comfort: clean, streak 2 or more', drawn: [['circle', 'fill', 'var(--color-easy)']] },
    { comfort: '🟢', level: 5, key: 'clean', spoken: 'Comfort: clean', drawn: [['circle', 'fill', 'var(--color-easy)']] },
    { comfort: '🎓', level: 6, key: 'graduated', spoken: 'Comfort: graduated', drawn: [['circle', 'fill', 'var(--color-graduated)'], ['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-graduated)']] },
    { comfort: '🏆', level: 7, key: 'retired', spoken: 'Comfort: retired', drawn: [['polygon', 'fill', 'var(--color-trophy)']] },
    {
      comfort: '?', level: 0, key: 'unknown', spoken: 'Comfort: unknown',
      drawn: [['circle', 'fill', 'none'], ['circle', 'stroke', 'var(--color-border)']],
    },
  ];

  it.each(cases)('draws $key at level $level and speaks "$spoken"', ({ comfort, streak, level, key, spoken, drawn }) => {
    const fixture = createFixture(comfort, undefined, streak);

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('data-level')).toBe(String(level));
    expect(svg.getAttribute('data-key')).toBe(key);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(spoken);
    for (const [selector, attribute, value] of drawn) {
      expect(fixture.nativeElement.querySelector(`${selector}[${attribute}="${value}"]`)).not.toBeNull();
    }
  });

  it('renders aria-hidden with no role when label is empty', () => {
    const fixture = createFixture('🟢', '');

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('role')).toBe(false);
  });
});
