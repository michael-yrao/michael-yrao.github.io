import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AlgorithmMeta, GraphState, GridState } from '../../../core/models/algorithm.model';
import { PracticeProblem } from '../../../core/models/practice.model';
import { figureStateFor } from '../../../core/practice/example-figure';
import { TextRun, splitInlineCode } from '../../../core/practice/inline-code';
import { reflowProse } from '../../../core/practice/reflow';
import { splitStatement } from '../../../core/practice/statement-segments';
import { HintCardComponent } from '../hint-card/hint-card.component';
import { GraphVisualizerComponent } from '../../visualizers/graph-visualizer/graph-visualizer.component';
import { GridVisualizerComponent } from '../../visualizers/grid-visualizer/grid-visualizer.component';

/** One example case's input drawn as a diagram, captioned by its place among the examples. */
export interface ExampleFigure {
  readonly number: number;
  readonly caption: string;
  readonly state: GraphState | GridState;
  /** True when at least one edge is drawn as found, so the figure carries the Output key. */
  readonly hasHighlight: boolean;
}

/** One block of the statement card, in reading order: a segment's text with the diagram drawn
 *  right under it when the segment is that diagram's example, or (text null) a diagram whose
 *  `Example N:` the statement never names, captioned since no text names it. */
export interface StatementBlock {
  readonly text: string | null;
  /** The text split into plain and inline-code runs; empty when there is no text. */
  readonly runs: readonly TextRun[];
  readonly figure: ExampleFigure | null;
  readonly isCaptioned: boolean;
}

/**
 * The Description tab: the contract's statement (with its example diagrams) when it has one,
 * else the static description, examples and constraints; the hint card sits under either.
 */
@Component({
  selector: 'app-practice-description',
  templateUrl: './practice-description.component.html',
  styleUrls: ['./practice-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HintCardComponent, GraphVisualizerComponent, GridVisualizerComponent],
})
export class PracticeDescriptionComponent {
  readonly problem = input<PracticeProblem | null>(null);
  readonly meta = input<AlgorithmMeta | null>(null);

  readonly hasStatement = computed(() => !!this.problem()?.statement);

  /** A diagram per `example: true` case whose arguments fit the problem's `figure`, in case
   *  order. Empty when the problem has no figure. */
  readonly exampleFigures = computed<readonly ExampleFigure[]>(() => {
    const problem = this.problem();
    const figure = problem?.figure;
    if (!problem || !figure) return [];
    const examples = problem.cases.filter((c) => c.example);
    return examples.flatMap((c, i) => {
      const state = figureStateFor(figure, c.args, c.expected);
      if (!state) return [];
      const hasHighlight = state.type === 'graph' && state.edges.some((e) => e.state === 'found');
      return [{ number: i + 1, caption: `Example ${i + 1}`, state, hasHighlight }];
    });
  });

  /** The statement's segments in order, each example carrying its own diagram; a diagram whose
   *  `Example N:` the statement lacks follows the last segment, so none is dropped. */
  readonly statementBlocks = computed<readonly StatementBlock[]>(() => {
    const segments = splitStatement(this.problem()?.statement ?? '');
    const placements = this.exampleFigures().map((figure) => ({
      figure,
      index: segments.findIndex((s) => s.exampleNumber === figure.number),
    }));
    const placed = segments.map((s, i) => {
      const text = reflowProse(s.text);
      return {
        text,
        runs: splitInlineCode(text),
        figure: placements.find((p) => p.index === i)?.figure ?? null,
        isCaptioned: false,
      };
    });
    const unplaced = placements
      .filter((p) => p.index < 0)
      .map((p) => ({ text: null, runs: [], figure: p.figure, isCaptioned: true }));
    return [...placed, ...unplaced];
  });
}
