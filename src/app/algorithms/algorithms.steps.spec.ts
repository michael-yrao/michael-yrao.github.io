import { ALGORITHM_INDEX } from '../core/data/algorithms.index';
import { Step, VisualizerState } from '../core/models/algorithm.model';

const VISUALIZER_TYPES: ReadonlySet<string> = new Set([
  'array',
  'grid',
  'linked-list',
  'tree',
  'graph',
]);

/** A pointer must sit on a cell (`0 <= index < cells.length`); the array visualizer matches
 *  pointers to cells by index, so an out-of-range pointer draws nothing. */
function arrayPointerProblems(step: Step, stepIndex: number, id: string): string[] {
  const state: VisualizerState = step.state;
  if (state.type !== 'array') return [];
  return state.pointers
    .filter((p) => !Number.isInteger(p.index) || p.index < 0 || p.index >= state.cells.length)
    .map((p) => `${id} step ${stepIndex} "${p.label}" index ${p.index} of ${state.cells.length}`);
}

describe('every step generator', () => {
  it.each(ALGORITHM_INDEX.map((entry) => [`#${entry.lcNumber} ${entry.id}`, entry] as const))(
    '%s',
    async (_name, entry) => {
      const meta = await entry.load();
      expect(meta.id).toBe(entry.id);
      expect(meta.lcNumber).toBe(entry.lcNumber);
      expect(meta.solutions.map((s) => s.variant)).toEqual(entry.variants.map((v) => v.variant));

      const stepsPerSolution = meta.solutions.map((s) => s.generateSteps());
      const steps = stepsPerSolution.flat();

      expect(stepsPerSolution.some((s) => s.length > 0)).toBe(entry.hasVisualization);
      expect(steps.filter((s) => !VISUALIZER_TYPES.has(s.state.type))).toEqual([]);
      expect(steps.flatMap((s, i) => arrayPointerProblems(s, i, entry.id))).toEqual([]);
    },
  );
});
