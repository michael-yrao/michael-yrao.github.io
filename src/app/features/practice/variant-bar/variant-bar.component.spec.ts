import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { WalkthroughStateService } from '../walkthrough-state.service';
import { VariantBarComponent } from './variant-bar.component';

const META = {
  id: 'two-variants',
  solutions: [
    { label: 'Brute force', timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)', generateSteps: () => [] },
    { label: 'Hash map', timeComplexity: 'O(n)', spaceComplexity: 'O(n)', generateSteps: () => [] },
  ],
} as unknown as AlgorithmMeta;

describe('VariantBarComponent', () => {
  it("shows the selected variant's own bound and changes it when another chip is pressed", () => {
    TestBed.configureTestingModule({ providers: [WalkthroughStateService] });
    TestBed.inject(WalkthroughStateService).connect(signal(META));
    const fixture = TestBed.createComponent(VariantBarComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const bounds = () =>
      Array.from(root.querySelectorAll('.complexity')).map((span) => span.textContent?.trim());

    expect(bounds()).toEqual(['⏱ O(n^2)', '💾 O(1)']);

    root.querySelectorAll<HTMLButtonElement>('.solution-tab')[1].click();
    fixture.detectChanges();

    expect(bounds()).toEqual(['⏱ O(n)', '💾 O(n)']);
  });
});
