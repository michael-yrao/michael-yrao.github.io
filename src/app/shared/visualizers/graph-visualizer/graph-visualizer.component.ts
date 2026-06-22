import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { GraphState } from '../../../core/models/algorithm.model';

@Component({
  selector: 'app-graph-visualizer',
  templateUrl: './graph-visualizer.component.html',
  styleUrls: ['./graph-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphVisualizerComponent {
  @Input() state!: GraphState;

  readonly NODE_R = 22;

  get viewBox(): string {
    const xs = this.state.nodes.map(n => n.x);
    const ys = this.state.nodes.map(n => n.y);
    const pad = this.NODE_R + 18;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - minX + pad;
    const h = Math.max(...ys) - minY + pad;
    return `${minX} ${minY} ${w} ${h}`;
  }

  edgeLine(from: string | number, to: string | number) {
    const f = this.state.nodes.find(n => n.id === from);
    const t = this.state.nodes.find(n => n.id === to);
    if (!f || !t) return { x1: 0, y1: 0, x2: 0, y2: 0 };
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const off = this.NODE_R + 3;
    return {
      x1: f.x + (dx / dist) * off,
      y1: f.y + (dy / dist) * off,
      x2: t.x - (dx / dist) * off,
      y2: t.y - (dy / dist) * off,
    };
  }

  hashmapEntries(): [string, number | string][] {
    return this.state.hashmap ? Object.entries(this.state.hashmap) : [];
  }

  hashmap2Entries(): [string, number | string][] {
    return this.state.hashmap2 ? Object.entries(this.state.hashmap2) : [];
  }
}
