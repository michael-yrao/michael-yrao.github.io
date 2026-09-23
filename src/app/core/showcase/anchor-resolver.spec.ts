import { resolveAnchor, resolveSteps } from './anchor-resolver';
import { DisplayRow } from './display';
import { Step, StepAnchor } from '../models/algorithm.model';

function codeRow(text: string): DisplayRow {
  return { text, sourceLine: 1, kind: 'code' };
}

function gapRow(): DisplayRow {
  return { text: '', sourceLine: null, kind: 'gap' };
}

const ARRAY_STATE = { type: 'array' as const, cells: [], pointers: [] };

function makeStep(anchor?: StepAnchor): Step {
  return { explanation: '', anchor, state: ARRAY_STATE };
}

describe('resolveAnchor', () => {
  it('resolves a unique match to a single-row range', () => {
    const rows = [codeRow('  while queue:'), codeRow('  return image')];

    const result = resolveAnchor(rows, { match: 'while queue' });

    expect(result).toEqual({ range: { start: 0, end: 0 }, reason: null });
  });

  it('matches on the trimmed line', () => {
    const rows = [codeRow('    while queue:   ')];

    const result = resolveAnchor(rows, { match: 'while queue:' });

    expect(result.range).toEqual({ start: 0, end: 0 });
  });

  it('fails with a reason when nothing matches', () => {
    const rows = [codeRow('return image')];

    const result = resolveAnchor(rows, { match: 'while queue' });

    expect(result).toEqual({ range: null, reason: "no line matches 'while queue'" });
  });

  it('fails with a reason when more than one line matches and no nth is given', () => {
    const rows = [codeRow('while queue:'), codeRow('while queue: # again')];

    const result = resolveAnchor(rows, { match: 'while queue' });

    expect(result.range).toBeNull();
    expect(result.reason).toBe("'while queue' matches 2 lines — use a longer substring or nth");
  });

  it('resolves the nth (1-based) hit among several matches', () => {
    const rows = [codeRow('while queue:'), codeRow('while queue: # again')];

    const result = resolveAnchor(rows, { match: 'while queue', nth: 2 });

    expect(result).toEqual({ range: { start: 1, end: 1 }, reason: null });
  });

  it('fails when nth is out of range', () => {
    const rows = [codeRow('while queue:')];

    const result = resolveAnchor(rows, { match: 'while queue', nth: 2 });

    expect(result.range).toBeNull();
    expect(result.reason).toContain('while queue');
  });

  it('resolves a `to` range spanning start through end', () => {
    const rows = [codeRow('while queue:'), codeRow('  x = 1'), codeRow('return image')];

    const result = resolveAnchor(rows, { match: 'while queue', to: { match: 'return image' } });

    expect(result).toEqual({ range: { start: 0, end: 2 }, reason: null });
  });

  it('fails when `to` resolves before the start', () => {
    const rows = [codeRow('return image'), codeRow('while queue:')];

    const result = resolveAnchor(rows, { match: 'while queue', to: { match: 'return image' } });

    expect(result.range).toBeNull();
    expect(result.reason).toContain('return image');
  });

  it('never matches a gap row', () => {
    const rows = [gapRow(), codeRow('while queue:')];

    const result = resolveAnchor(rows, { match: 'while queue' });

    expect(result).toEqual({ range: { start: 1, end: 1 }, reason: null });
  });
});

describe('resolveSteps', () => {
  it('resolves each step independently and flags a step with no anchor', () => {
    const rows = [codeRow('while queue:'), codeRow('return image')];
    const steps = [makeStep({ match: 'while queue' }), makeStep(undefined)];

    const resolved = resolveSteps(rows, steps);

    expect(resolved).toEqual([
      { range: { start: 0, end: 0 }, reason: null },
      { range: null, reason: 'step has no anchor' },
    ]);
  });
});
