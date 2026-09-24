import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CheatSheetService } from '../../../core/services/cheat-sheet.service';
import { DecisionTreeNode } from '../../../core/models/cheat-sheet.model';

/** A resolved leaf: where it links (`null` for a plain-text reach), its display label, and
 *  its note. Absent on an inner (question/shape) node. */
interface DecisionTreeLeafView {
  route: string[] | null;
  reachLabel: string;
  note: string;
}

interface DecisionTreeNodeView {
  label: string;
  isQuestion: boolean;
  leaf: DecisionTreeLeafView | null;
  children: DecisionTreeNodeView[];
}

/** A label ending in "?" is a question node — the `## Decision tree` grammar in cse-progress's
 *  intuition_cheatsheet.md, inferred here rather than carried as a separate `kind` field. */
function isQuestionLabel(label: string): boolean {
  return label.endsWith('?');
}

/** Resolves one node's `reach` into a view the template can render without knowing about
 *  `page: false` or missing techniques. Route resolution is the exact rule `learn-list`'s
 *  `signalRows` uses: `page === false` never resolves, and an id with no matching technique
 *  falls back to the id itself. Display text prefers the author's own `reachLabel` (the doc's
 *  link/bold text) over the resolved technique's name, which is itself the fallback over the
 *  raw `reach` id. */
function toLeafView(
  node: DecisionTreeNode,
  techniqueById: (id: string) => { name: string } | undefined,
): DecisionTreeLeafView {
  const reach = node.reach ?? '';
  const technique = node.page === false ? undefined : techniqueById(reach);
  return {
    route: technique ? ['/learn', reach] : null,
    reachLabel: node.reachLabel ?? technique?.name ?? reach,
    note: node.note ?? '',
  };
}

function toView(
  node: DecisionTreeNode,
  techniqueById: (id: string) => { name: string } | undefined,
): DecisionTreeNodeView {
  const isQuestion = isQuestionLabel(node.label);
  if (node.children) {
    return {
      label: node.label,
      isQuestion,
      leaf: null,
      children: node.children.map((child) => toView(child, techniqueById)),
    };
  }
  return {
    label: node.label,
    isQuestion,
    leaf: toLeafView(node, techniqueById),
    children: [],
  };
}

/** The `/learn` decision tree (shape → cue → technique), rendered as an expanded, indented
 *  HTML tree — no step-through, no SVG. Recurses through a single `<ng-template #nodeTpl>`
 *  applied to itself via `ngTemplateOutlet` (precedent: `today-board.component.html`), rather
 *  than a self-importing component (which needs `forwardRef`). */
@Component({
  selector: 'app-decision-tree',
  templateUrl: './decision-tree.component.html',
  styleUrls: ['./decision-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet],
})
export class DecisionTreeComponent {
  private readonly cheatSheets = inject(CheatSheetService);

  readonly tree = input.required<DecisionTreeNode>();

  readonly view = computed<DecisionTreeNodeView>(() =>
    toView(this.tree(), (id) => this.cheatSheets.techniqueById(id)),
  );
}
