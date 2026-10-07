import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { GraphEdge, GraphEdgeState, GraphState } from '../../../core/models/algorithm.model';
import { NgClass } from '@angular/common';
import { EdgeLayout, LOOP_REACH, NODE_RADIUS, layoutEdges } from './graph-geometry';

/** One id per component instance, so two visualizers on a page never share a marker id. */
let nextInstanceId = 0;

const EDGE_STATES: readonly GraphEdgeState[] = ['default', 'active', 'visited', 'found'];
const VIEWBOX_PAD = NODE_RADIUS + 18;
const LOOP_VIEWBOX_PAD = NODE_RADIUS + LOOP_REACH + 24;

export interface DrawnEdge {
  readonly edge: GraphEdge;
  readonly layout: EdgeLayout;
}

@Component({
    selector: 'app-graph-visualizer',
    templateUrl: './graph-visualizer.component.html',
    styleUrls: ['./graph-visualizer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass]
})
export class GraphVisualizerComponent {
  readonly state = input.required<GraphState>();

  readonly NODE_R = NODE_RADIUS;
  readonly EDGE_STATES = EDGE_STATES;
  private readonly instanceId = nextInstanceId++;

  get viewBox(): string {
    const xs = this.state().nodes.map(n => n.x);
    const ys = this.state().nodes.map(n => n.y);
    const hasLoop = this.state().edges.some(e => e.from === e.to);
    const pad = hasLoop ? LOOP_VIEWBOX_PAD : VIEWBOX_PAD;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - minX + pad;
    const h = Math.max(...ys) - minY + pad;
    return `${minX} ${minY} ${w} ${h}`;
  }

  /** Every edge with its drawn shape and label position. */
  get drawnEdges(): DrawnEdge[] {
    const layouts = layoutEdges(this.state().nodes, this.state().edges);
    return this.state().edges.map((edge, i) => ({ edge, layout: layouts[i] }));
  }

  markerId(edgeState: GraphEdgeState): string {
    return `gv-arrow-${this.instanceId}-${edgeState}`;
  }

  markerRef(edgeState: GraphEdgeState): string | null {
    return this.state().directed ? `url(#${this.markerId(edgeState)})` : null;
  }

  hashmapEntries(): [string, number | string][] {
    const { hashmap } = this.state();
    return hashmap ? Object.entries(hashmap) : [];
  }

  hashmap2Entries(): [string, number | string][] {
    const { hashmap2 } = this.state();
    return hashmap2 ? Object.entries(hashmap2) : [];
  }
}
