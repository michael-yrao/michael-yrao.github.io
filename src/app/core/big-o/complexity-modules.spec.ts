import { parseComplexityModules } from './complexity-modules';

const MODULE = { name: 'complexity_infer', source: 'x = 1' };

describe('parseComplexityModules', () => {
  it.each([
    { name: 'valid', payload: { schemaVersion: 1, modules: [MODULE] }, expected: [MODULE] },
    { name: 'wrong schemaVersion', payload: { schemaVersion: 2, modules: [MODULE] }, expected: null },
    { name: 'modules not an array', payload: { schemaVersion: 1, modules: 'x' }, expected: null },
    {
      name: 'a bad module name',
      payload: { schemaVersion: 1, modules: [{ name: 'other', source: '' }] },
      expected: null,
    },
    {
      name: 'a non-string source',
      payload: { schemaVersion: 1, modules: [{ name: 'complexity_cost', source: 3 }] },
      expected: null,
    },
  ])('$name', ({ payload, expected }) => {
    expect(parseComplexityModules(payload)).toEqual(expected);
  });
});
