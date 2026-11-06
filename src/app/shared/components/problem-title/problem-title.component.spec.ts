import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProblemTitleComponent } from './problem-title.component';

const NUMBER = 90;
const URL = 'https://leetcode.com/problems/subsets-ii/';

interface Row {
  name: string;
  inputs: Record<string, unknown>;
  check: (root: HTMLElement, emitted: number[]) => void;
}

const ROWS: Row[] = [
  {
    name: 'with url: title links to practice, arrow opens the url in a new tab',
    inputs: { url: URL },
    check: (root) => {
      expect(root.querySelector('.problem-title__text')!.getAttribute('href')).toBe(`/practice/${NUMBER}`);
      const arrow = root.querySelector<HTMLAnchorElement>('.problem-title__arrow')!;
      expect(arrow.getAttribute('href')).toBe(URL);
      expect(arrow.target).toBe('_blank');
    },
  },
  {
    name: 'without url: no arrow',
    inputs: { url: null },
    check: (root) => expect(root.querySelector('.problem-title__arrow')).toBeNull(),
  },
  {
    name: 'hasPractice false: plain text, no link',
    inputs: { hasPractice: false, url: URL },
    check: (root) => {
      expect(root.querySelector('a.problem-title__link')).toBeNull();
      expect(root.querySelector('.problem-title__text')!.textContent).toBe('Subsets II');
    },
  },
  {
    name: 'isStruck: the title text carries the struck class',
    inputs: { isStruck: true },
    check: (root) => expect(root.querySelector('.problem-title__text')!.classList).toContain('problem-title__text--struck'),
  },
  {
    name: 'isRunEntry: a button whose click emits the number',
    inputs: { isRunEntry: true },
    check: (root, emitted) => {
      const button = root.querySelector<HTMLButtonElement>('button.problem-title__text')!;
      expect(root.querySelector('a.problem-title__link')).toBeNull();
      button.click();
      expect(emitted).toEqual([NUMBER]);
    },
  },
];

describe('ProblemTitleComponent', () => {
  it.each(ROWS)('$name', ({ inputs, check }) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<ProblemTitleComponent> = TestBed.createComponent(ProblemTitleComponent);
    const emitted: number[] = [];
    fixture.componentInstance.practice.subscribe((n) => emitted.push(n));
    fixture.componentRef.setInput('number', NUMBER);
    fixture.componentRef.setInput('title', 'Subsets II');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();

    check(fixture.nativeElement, emitted);
  });
});
