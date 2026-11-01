import { TestBed } from '@angular/core/testing';

import { LineState } from '../../../core/models/algorithm.model';
import { LineVisualizerComponent } from './line-visualizer.component';

function setUp(state: LineState): HTMLElement {
  TestBed.configureTestingModule({ imports: [LineVisualizerComponent] });
  const fixture = TestBed.createComponent(LineVisualizerComponent);
  fixture.componentRef.setInput('state', state);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('LineVisualizerComponent', () => {
  const rows: { name: string; state: LineState; gaps: string[]; accented: string[]; label: string }[] = [
    {
      name: 'both gaps tie for smallest',
      state: { type: 'line', positions: [1, 2, 3, 4, 7], picks: [1, 4, 7] },
      gaps: ['3', '3'],
      accented: ['3', '3'],
      label: 'Baskets on a line; balls at 1, 4, 7; smallest gap 3',
    },
    {
      name: 'only the smallest gap is accented',
      state: { type: 'line', positions: [1, 2, 4, 8], picks: [1, 2, 8] },
      gaps: ['1', '6'],
      accented: ['1'],
      label: 'Baskets on a line; balls at 1, 2, 8; smallest gap 1',
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      const root = setUp(row.state);
      const texts = (selector: string): string[] => Array.from(root.querySelectorAll(selector)).map((t) => t.textContent ?? '');
      expect(texts('.lv__gap')).toEqual(row.gaps);
      expect(texts('.lv__gap--smallest')).toEqual(row.accented);
      expect(root.querySelectorAll('.lv__bracket--smallest').length).toBe(row.accented.length);
      expect(root.querySelector('svg')?.getAttribute('aria-label')).toBe(row.label);
      expect(root.querySelectorAll('.lv__ball').length).toBe(row.state.picks.length);
    });
  }
});
