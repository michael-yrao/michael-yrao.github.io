import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ArrayState } from '../../../core/models/algorithm.model';
import { NgClass, SlicePipe } from '@angular/common';

@Component({
    selector: 'app-array-visualizer',
    templateUrl: './array-visualizer.component.html',
    styleUrls: ['./array-visualizer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, SlicePipe]
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

  hashmap2Entries(): [string, number | string][] {
    if (!this.state.hashmap2) return [];
    return Object.entries(this.state.hashmap2);
  }
}
