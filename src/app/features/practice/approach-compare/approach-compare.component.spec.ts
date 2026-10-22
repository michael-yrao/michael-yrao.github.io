import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AlgorithmMeta, Step } from '../../../core/models/algorithm.model';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { WalkthroughStateService } from '../walkthrough-state.service';
import { ApproachCompareComponent } from './approach-compare.component';

const stepsOf = (count: number) => () => Array.from({ length: count }, () => ({}) as Step);

function variant(id: string, count: number) {
  return {
    label: id,
    variant: id,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    generateSteps: stepsOf(count),
  };
}

const metaOf = (...solutions: ReturnType<typeof variant>[]) =>
  ({ id: 'p', lcNumber: 1, solutions }) as unknown as AlgorithmMeta;

function render(meta: AlgorithmMeta) {
  const selectVariant = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: WalkthroughStateService,
        useValue: { activeSolutionIndex: signal(0), selectVariant },
      },
      {
        provide: ShowcaseService,
        useValue: { entryFor: (key: string | null) => (key === '1:brute' ? {} : null) },
      },
    ],
  });
  const fixture = TestBed.createComponent(ApproachCompareComponent);
  fixture.componentRef.setInput('meta', meta);
  fixture.detectChanges();
  return { root: fixture.nativeElement as HTMLElement, selectVariant };
}

describe('ApproachCompareComponent', () => {
  it('lists each variant with its step count and grounded mark, and selects on click', () => {
    const { root, selectVariant } = render(metaOf(variant('brute', 3), variant('hash', 5)));
    const rows = Array.from(root.querySelectorAll('tbody tr'));

    expect(rows.length).toBe(2);
    expect(rows.map((row) => row.querySelectorAll('td')[3].textContent?.trim())).toEqual(['3', '5']);
    expect(rows[0].querySelector('[aria-label="Grounded"]')).not.toBeNull();
    expect(rows[1].querySelector('[aria-label="Grounded"]')).toBeNull();

    rows[1].querySelector('button')!.click();
    expect(selectVariant).toHaveBeenCalledWith(1);
  });

  it('renders nothing for a single-variant meta', () => {
    const { root } = render(metaOf(variant('brute', 3)));

    expect(root.querySelector('table')).toBeNull();
  });
});
