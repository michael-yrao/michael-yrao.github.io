import { TestBed } from '@angular/core/testing';

import { BarsState } from '../../../core/models/algorithm.model';
import { BarsVisualizerComponent } from './bars-visualizer.component';

function setUp(state: BarsState): { root: HTMLElement; component: BarsVisualizerComponent } {
  TestBed.configureTestingModule({ imports: [BarsVisualizerComponent] });
  const fixture = TestBed.createComponent(BarsVisualizerComponent);
  fixture.componentRef.setInput('state', state);
  fixture.detectChanges();
  return { root: fixture.nativeElement, component: fixture.componentInstance };
}

describe('BarsVisualizerComponent', () => {
  it('scales the tallest bar to the plot, labels values and indices, and shades the rect over its bars', () => {
    const { root, component } = setUp({ type: 'bars', bars: [2, 1, 5, 6, 2, 3], rect: { left: 2, right: 3, height: 5 } });

    const bars = component.drawnBars();
    const tallest = bars[3];
    expect(tallest.y + tallest.height).toBe(component.baseline);
    // Coordinates round to hundredths, so a third of the plot is 46.67 and three of them 140.01.
    expect(bars[0].height * 3).toBeCloseTo(tallest.height, 1);
    expect(bars.map((bar) => bar.x)).toEqual([0, 1, 2, 3, 4, 5].map((i) => i * component.barWidth));

    const rect = component.drawnRect()!;
    expect(rect.x).toBe(bars[2].x);
    expect(rect.width).toBe(2 * component.barWidth);
    expect(rect.height).toBe(bars[2].height);

    expect(Array.from(root.querySelectorAll('.bv__value')).map((t) => t.textContent)).toEqual(['2', '1', '5', '6', '2', '3']);
    expect(Array.from(root.querySelectorAll('.bv__index')).map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(root.querySelectorAll('.bv__rect').length).toBe(1);
  });

  it('draws flat bars and no rect for a histogram of zeros', () => {
    const { root, component } = setUp({ type: 'bars', bars: [0, 0] });
    expect(component.drawnBars().every((bar) => bar.height === 0)).toBe(true);
    expect(component.drawnRect()).toBeNull();
    expect(root.querySelector('.bv__rect')).toBeNull();
  });
});
