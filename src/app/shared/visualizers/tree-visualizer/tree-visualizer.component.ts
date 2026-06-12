import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { TreeState, TreeNode } from '../../../core/models/algorithm.model';

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
}

@Component({
  selector: 'app-tree-visualizer',
  templateUrl: './tree-visualizer.component.html',
  styleUrls: ['./tree-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeVisualizerComponent {
  @Input() state!: TreeState;

  readonly NODE_RADIUS = 22;
  readonly LEVEL_HEIGHT = 70;
  readonly SVG_PADDING = 40;

  get layout(): LayoutNode[] {
    if (!this.state?.nodes?.length) return [];
    const nodeMap = new Map<string, TreeNode>(
      this.state.nodes.map(n => [n.id, n])
    );
    const root = this.state.nodes[0];
    if (!root) return [];

    // Assign x positions via in-order traversal (leaf counter)
    let leafCounter = 0;
    const xSlot = new Map<string, number>();

    function assignSlots(id: string | null): void {
      if (!id) return;
      const n = nodeMap.get(id);
      if (!n) return;
      assignSlots(n.leftId);
      if (!n.leftId && !n.rightId) {
        xSlot.set(id, leafCounter++);
      }
      assignSlots(n.rightId);
    }

    // For internal nodes, x = midpoint of children
    function assignX(id: string | null): number {
      if (!id) return 0;
      const n = nodeMap.get(id);
      if (!n) return 0;
      if (!n.leftId && !n.rightId) {
        return xSlot.get(id) ?? 0;
      }
      const leftX = n.leftId ? assignX(n.leftId) : null;
      const rightX = n.rightId ? assignX(n.rightId) : null;
      let x: number;
      if (leftX !== null && rightX !== null) x = (leftX + rightX) / 2;
      else if (leftX !== null) x = leftX;
      else x = rightX!;
      xSlot.set(id, x);
      return x;
    }

    assignSlots(root.id);
    // If root itself is a leaf (single node), give it slot 0
    if (xSlot.size === 0) xSlot.set(root.id, 0);
    assignX(root.id);

    // Assign depths
    const depthMap = new Map<string, number>();
    function assignDepth(id: string | null, depth: number): void {
      if (!id) return;
      depthMap.set(id, depth);
      const n = nodeMap.get(id);
      if (!n) return;
      assignDepth(n.leftId, depth + 1);
      assignDepth(n.rightId, depth + 1);
    }
    assignDepth(root.id, 0);

    // Compute actual pixel positions
    const numLeaves = Math.max(leafCounter, 1);
    const layout: LayoutNode[] = [];
    for (const node of this.state.nodes) {
      const slot = xSlot.get(node.id) ?? 0;
      const depth = depthMap.get(node.id) ?? 0;
      const x = this.SVG_PADDING + slot * 60 + 30;
      const y = this.SVG_PADDING + depth * this.LEVEL_HEIGHT;
      layout.push({ node, x, y });
    }
    return layout;
  }

  get svgWidth(): number {
    const numLeaves = Math.max(this.countLeaves(this.state?.nodes?.[0]?.id ?? null), 1);
    return numLeaves * 60 + this.SVG_PADDING * 2;
  }

  get svgHeight(): number {
    const maxDepth = this.getMaxDepth(this.state?.nodes?.[0]?.id ?? null);
    return (maxDepth + 1) * this.LEVEL_HEIGHT + this.SVG_PADDING * 2;
  }

  private countLeaves(id: string | null): number {
    if (!id) return 0;
    const nodeMap = new Map<string, TreeNode>(
      this.state.nodes.map(n => [n.id, n])
    );
    return this.countLeavesMap(id, nodeMap);
  }

  private countLeavesMap(id: string | null, nodeMap: Map<string, TreeNode>): number {
    if (!id) return 0;
    const n = nodeMap.get(id);
    if (!n) return 0;
    if (!n.leftId && !n.rightId) return 1;
    return this.countLeavesMap(n.leftId, nodeMap) + this.countLeavesMap(n.rightId, nodeMap);
  }

  private getMaxDepth(id: string | null): number {
    if (!id) return 0;
    const nodeMap = new Map<string, TreeNode>(
      this.state.nodes.map(n => [n.id, n])
    );
    return this.getMaxDepthMap(id, nodeMap);
  }

  private getMaxDepthMap(id: string | null, nodeMap: Map<string, TreeNode>): number {
    if (!id) return -1;
    const n = nodeMap.get(id);
    if (!n) return -1;
    return 1 + Math.max(
      this.getMaxDepthMap(n.leftId, nodeMap),
      this.getMaxDepthMap(n.rightId, nodeMap)
    );
  }

  edges(): { x1: number; y1: number; x2: number; y2: number }[] {
    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const layoutMap = new Map<string, LayoutNode>(
      this.layout.map(l => [l.node.id, l])
    );
    for (const l of this.layout) {
      if (l.node.leftId) {
        const child = layoutMap.get(l.node.leftId);
        if (child) result.push({ x1: l.x, y1: l.y, x2: child.x, y2: child.y });
      }
      if (l.node.rightId) {
        const child = layoutMap.get(l.node.rightId);
        if (child) result.push({ x1: l.x, y1: l.y, x2: child.x, y2: child.y });
      }
    }
    return result;
  }

  nodePointers(nodeId: string): string[] {
    return (this.state.pointers ?? [])
      .filter(p => p.nodeId === nodeId)
      .map(p => p.label);
  }

  trackById(_: number, item: LayoutNode): string {
    return item.node.id;
  }
}
