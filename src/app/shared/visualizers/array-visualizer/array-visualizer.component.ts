import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ArrayState } from '../../../core/models/algorithm.model';

@Component({
  selector: 'app-array-visualizer',
  templateUrl: './array-visualizer.component.html',
  styleUrls: ['./array-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArrayVisualizerComponent {
  @Input() state!: ArrayState;

  pointerAt(index: number): string | null {
    const ptrs = this.state.pointers.filter((p) => p.index === index);
    return ptrs.length > 0 ? ptrs.map((p) => p.label).join(' / ') : null;
  }

  hasPointer(index: number): boolean {
    return this.state.pointers.some((p) => p.index === index);
  }

  hashmapEntries(): [string, number | string][] {
    if (!this.state.hashmap) return [];
    return Object.entries(this.state.hashmap);
  }
}
