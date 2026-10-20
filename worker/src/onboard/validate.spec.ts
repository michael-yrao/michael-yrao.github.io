import { describe, expect, it } from 'vitest';
import { isCoachRepo } from './validate';

const TEMPLATE = 'michael-yrao/cse-coach';

describe('isCoachRepo', () => {
  it.each([
    ['exact match', { template_repository: { full_name: 'michael-yrao/cse-coach' } }, true],
    ['case-insensitive match', { template_repository: { full_name: 'Michael-Yrao/CSE-Coach' } }, true],
    ['missing template_repository', { full_name: 'alice/cse-progress' }, false],
    ['wrong template', { template_repository: { full_name: 'someone/else' } }, false],
    ['non-record repo', null, false],
  ])('%s', (_name, repo, expected) => {
    expect(isCoachRepo(repo, TEMPLATE)).toBe(expected);
  });
});
