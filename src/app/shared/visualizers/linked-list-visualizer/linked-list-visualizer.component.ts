import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { LinkedListState, LinkedListNode } from '../../../core/models/algorithm.model';

@Component({
  selector: 'app-linked-list-visualizer',
  templateUrl: './linked-list-visualizer.component.html',
  styleUrls: ['./linked-list-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedListVisualizerComponent {
  @Input() state!: LinkedListState;

  nodePointers(nodeId: string): string[] {
    return (this.state.pointers ?? [])
      .filter((p) => p.nodeId === nodeId)
      .map((p) => p.label);
  }

  hasPointers(nodeId: string): boolean {
    return (this.state.pointers ?? []).some((p) => p.nodeId === nodeId);
  }

  nullPointers(): string[] {
    return (this.state.pointers ?? [])
      .filter((p) => p.nodeId === null)
      .map((p) => p.label);
  }

  trackById(_: number, node: LinkedListNode): string {
    return node.id;
  }
}
