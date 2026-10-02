import { signal } from '@angular/core';

import { AlgorithmMeta } from '../../core/models/algorithm.model';
import { WalkthroughStateService } from './walkthrough-state.service';

const SHOW_WHY_KEY = 'po-show-why';
const STEP_INDEX = 3;

function metaWith(id: string): AlgorithmMeta {
  const variant = (label: string) => ({
    label,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    generateSteps: () => [],
  });
  return { id, solutions: [variant('A'), variant('B')] } as unknown as AlgorithmMeta;
}

const CASES: ReadonlyArray<{
  name: string;
  check: (service: WalkthroughStateService, meta: ReturnType<typeof signal<AlgorithmMeta | null>>) => void;
}> = [
  {
    name: 'a step and variant set on problem A are not seen on problem B',
    check: (service, meta) => {
      service.selectVariant(1);
      service.onStepChange(STEP_INDEX);
      expect([service.activeSolutionIndex(), service.currentStepIndex()]).toEqual([1, STEP_INDEX]);

      meta.set(metaWith('b'));

      expect([service.activeSolutionIndex(), service.currentStepIndex(), service.isStarted()]).toEqual([
        0, 0, false,
      ]);
    },
  },
  {
    name: 'selectVariant resets started and step',
    check: (service) => {
      service.onStepChange(STEP_INDEX);

      service.selectVariant(1);

      expect([service.isStarted(), service.currentStepIndex()]).toEqual([false, 0]);
    },
  },
  {
    name: 'togglePanel flips only the named panel, starting with the visualizer on and the code off',
    check: (service) => {
      expect([service.isVizShown(), service.isCodeShown()]).toEqual([true, false]);

      service.togglePanel('code');
      expect([service.isVizShown(), service.isCodeShown()]).toEqual([true, true]);

      service.togglePanel('viz');
      expect([service.isVizShown(), service.isCodeShown()]).toEqual([false, true]);
    },
  },
  {
    name: 'toggleWhy persists to localStorage',
    check: (service) => {
      expect(service.isWhyShown()).toBe(true);

      service.toggleWhy();

      expect(service.isWhyShown()).toBe(false);
      expect(localStorage.getItem(SHOW_WHY_KEY)).toBe('0');
    },
  },
];

describe('WalkthroughStateService', () => {
  beforeEach(() => localStorage.removeItem(SHOW_WHY_KEY));
  afterEach(() => localStorage.removeItem(SHOW_WHY_KEY));

  it.each(CASES)('$name', ({ check }) => {
    const meta = signal<AlgorithmMeta | null>(metaWith('a'));
    const service = new WalkthroughStateService();
    service.connect(meta);

    check(service, meta);
  });
});
