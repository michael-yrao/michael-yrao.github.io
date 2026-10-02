import { TestBed } from '@angular/core/testing';
import { GraphState } from '../../../core/models/algorithm.model';
import { GraphVisualizerComponent } from './graph-visualizer.component';

const nodes: GraphState['nodes'] = [
  { id: 0, x: 0, y: 0, state: 'default' },
  { id: 1, x: 100, y: 0, state: 'default' },
];

function render(state: GraphState): HTMLElement {
  const fixture = TestBed.createComponent(GraphVisualizerComponent);
  fixture.componentInstance.state = state;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('GraphVisualizerComponent edges', () => {
  it('draws an arrowhead and a label for a directed, labelled edge and neither otherwise', () => {
    const directed = render({
      type: 'graph',
      nodes,
      edges: [{ from: 0, to: 1, state: 'default', label: '-7' }],
      directed: true,
    });
    const markerId = directed.querySelector('marker')?.getAttribute('id');
    expect(markerId).toBeTruthy();
    expect(directed.querySelector('line')?.getAttribute('marker-end')).toBe(`url(#${markerId})`);
    expect(directed.querySelector('.gv__edge-label')?.textContent).toContain('-7');

    const plain = render({ type: 'graph', nodes, edges: [{ from: 0, to: 1, state: 'default' }] });
    expect(plain.querySelector('marker')).toBeNull();
    expect(plain.querySelector('line')?.hasAttribute('marker-end')).toBe(false);
    expect(plain.querySelector('.gv__edge-label')).toBeNull();
  });
});
