import { TestBed } from '@angular/core/testing';

import { ChartSegment, PieChartComponent } from './pie-chart.component';

const SEGMENTS: ChartSegment[] = [
  { key: 'a', label: 'Alpha', value: 30, cls: 'seg-easy' },
  { key: 'b', label: 'Beta', value: 10, cls: 'seg-medium' },
  { key: 'c', label: 'Gamma', value: 60, cls: 'seg-hard' },
];

function createFixture(clickable: boolean) {
  TestBed.configureTestingModule({ imports: [PieChartComponent] });
  const fixture = TestBed.createComponent(PieChartComponent);
  fixture.componentRef.setInput('segments', SEGMENTS);
  fixture.componentRef.setInput('clickable', clickable);
  fixture.detectChanges();
  const clicked: ChartSegment[] = [];
  fixture.componentInstance.segmentClick.subscribe((s) => clicked.push(s));
  return { root: fixture.nativeElement as HTMLElement, clicked };
}

describe('PieChartComponent', () => {
  it('when clickable, a slice click and its legend entry both emit segmentClick', () => {
    const { root, clicked } = createFixture(true);

    const slice = root.querySelectorAll('.pie__slice')[1] as SVGElement;
    expect(slice.getAttribute('tabindex')).toBe('0');
    slice.dispatchEvent(new Event('click'));
    (root.querySelectorAll('button.pie__legend-btn')[2] as HTMLButtonElement).click();

    expect(clicked.map((s) => s.key)).toEqual(['b', 'c']);
  });

  it('when not clickable, nothing is focusable and nothing emits', () => {
    const { root, clicked } = createFixture(false);

    const slice = root.querySelectorAll('.pie__slice')[1] as SVGElement;
    slice.dispatchEvent(new Event('click'));

    expect(root.querySelectorAll('[tabindex], button').length).toBe(0);
    expect(clicked).toEqual([]);
  });
});
