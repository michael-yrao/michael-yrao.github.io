import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CatalogueEntry } from '../practice-catalogue';
import { PracticeHeaderComponent } from './practice-header.component';

interface RoleCase {
  readonly name: string;
  readonly isCandidate: boolean;
  readonly isInSession: boolean;
  readonly hasSolutionTab: boolean;
  readonly solutionTarget: string | null;
  readonly hasBadge: boolean;
  readonly hasNeighbors: boolean;
}

const entry = (number: number): CatalogueEntry => ({
  number,
  title: `Problem ${number}`,
  difficulty: 'Medium',
  category: null,
  tags: [],
  isRunnable: true,
  isVisualized: false,
  hasSolution: true,
});
const NEIGHBORS = { prev: entry(1), next: entry(3) };

const CASES: readonly RoleCase[] = [
  { name: 'no session', isCandidate: false, isInSession: false, hasSolutionTab: true, solutionTarget: null, hasBadge: true, hasNeighbors: true },
  { name: 'interviewer in session', isCandidate: false, isInSession: true, hasSolutionTab: true, solutionTarget: '_blank', hasBadge: true, hasNeighbors: false },
  { name: 'candidate', isCandidate: true, isInSession: true, hasSolutionTab: false, solutionTarget: null, hasBadge: false, hasNeighbors: false },
];

describe('PracticeHeaderComponent entitlements', () => {
  for (const c of CASES) {
    it(`shows the right parts for ${c.name}`, () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const fixture = TestBed.createComponent(PracticeHeaderComponent);
      fixture.componentRef.setInput('number', 2);
      fixture.componentRef.setInput('title', 'Two');
      fixture.componentRef.setInput('titleUrl', null);
      fixture.componentRef.setInput('difficulty', 'Medium');
      fixture.componentRef.setInput('neighbors', NEIGHBORS);
      fixture.componentRef.setInput('activeTab', 'description');
      fixture.componentRef.setInput('hasSolution', true);
      fixture.componentRef.setInput('isCandidate', c.isCandidate);
      fixture.componentRef.setInput('isInSession', c.isInSession);
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const tabs = Array.from(root.querySelectorAll('.practice-header__tab'));
      const solution = tabs.find((tab) => tab.textContent?.trim() === 'Solution') ?? null;
      expect(solution !== null).toBe(c.hasSolutionTab);
      expect(solution?.getAttribute('target') ?? null).toBe(c.solutionTarget);
      expect(root.querySelector('.difficulty-badge') !== null).toBe(c.hasBadge);
      expect(root.querySelectorAll('.neighbor-btn').length > 0).toBe(c.hasNeighbors);
    });
  }
});
