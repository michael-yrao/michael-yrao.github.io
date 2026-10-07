import { TestBed } from '@angular/core/testing';

import { PracticeProblem } from '../../../core/models/practice.model';
import { PracticeDescriptionComponent } from './practice-description.component';

const PROBLEM: PracticeProblem = {
  number: 90,
  title: 'Subsets II',
  url: 'https://leetcode.com/problems/subsets-ii/',
  statement: 'Return all subsets.',
  stub: 'class Solution:\n    pass\n',
  entry: { className: 'Solution', method: 'subsetsWithDup' },
  compare: 'unordered-nested',
  cases: [
    { args: [[1, 2]], expected: [[1], [2]], example: true },
    { args: [[3]], expected: [[3]], example: false },
  ],
};

function setUp(problem: PracticeProblem): HTMLElement {
  TestBed.configureTestingModule({ imports: [PracticeDescriptionComponent] });
  const fixture = TestBed.createComponent(PracticeDescriptionComponent);
  fixture.componentRef.setInput('problem', problem);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('PracticeDescriptionComponent', () => {
  it('draws each example diagram under its own example text, without a caption', () => {
    const statement =
      'Find the tree.\n\nExample 1:\n    Input: n = 2\n\nExample 2:\n    Input: n = 3\n\nConstraints:\n    n >= 1';
    const problem: PracticeProblem = {
      ...PROBLEM,
      statement,
      figure: { kind: 'graph', directed: false, edgesArg: 1, nodeCountArg: 0 },
      cases: [
        { args: [2, [[0, 1]]], expected: 1, example: true },
        { args: [3, [[0, 1], [1, 2]]], expected: 2, example: true },
      ],
    };
    const root = setUp(problem);

    const card = root.querySelector('.practice-description__statement')!;
    const order = Array.from(card.children).map((child) =>
      child.tagName === 'FIGURE' ? 'figure' : child.textContent?.trim().split('\n')[0],
    );
    expect(order).toEqual([
      'Find the tree.',
      'Example 1:',
      'figure',
      '',
      'Example 2:',
      'figure',
      'Constraints:',
    ]);
    expect(card.querySelectorAll('app-graph-visualizer').length).toBe(2);
    expect(root.querySelector('.practice-description__figure-caption')).toBeNull();
  });

  it('renders the Output key under a highlighted figure and not under a plain one', () => {
    const figure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null } as const;
    const cases = [{ args: [[[0, 1]]], expected: [[0, 1]], example: true }];
    const plain = setUp({ ...PROBLEM, figure, cases });
    expect(plain.querySelector('.practice-description__figure-key')).toBeNull();
    TestBed.resetTestingModule();
    const marked = setUp({ ...PROBLEM, figure: { ...figure, highlight: 'expected' }, cases });
    expect(marked.querySelector('.practice-description__figure-key')?.textContent?.trim()).toBe('Output');
  });

  it('draws a backtick-marked span as inline code with the backticks gone', () => {
    const problem: PracticeProblem = { ...PROBLEM, statement: 'Given `nums`, return subsets.' };
    const root = setUp(problem);

    expect(root.querySelector('code.practice-description__code')?.textContent).toBe('nums');
    expect(root.querySelector('.practice-description__statement')?.textContent).not.toContain('`');
  });

  it('joins a hard-wrapped paragraph with a space and keeps an indented example line', () => {
    const statement = 'Given an array\nof numbers, sum it.\n\nExample 1:\n    Input: n = 2';
    const problem: PracticeProblem = { ...PROBLEM, statement };
    const root = setUp(problem);

    const text = root.querySelector('.practice-description__statement')?.textContent ?? '';
    expect(text).toContain('Given an array of numbers, sum it.');
    expect(text).not.toContain('array\nof');
    expect(text).toContain('Example 1:\n    Input: n = 2');
  });
});
