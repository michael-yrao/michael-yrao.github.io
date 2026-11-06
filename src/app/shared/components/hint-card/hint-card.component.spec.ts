import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HintCardComponent } from './hint-card.component';

function render(solutionLink: readonly (string | number)[] | null): { root: HTMLElement; reveal: () => void; link: () => Element | null } {
  TestBed.configureTestingModule({ imports: [HintCardComponent], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(HintCardComponent);
  fixture.componentRef.setInput('hint', 'Use a stack.');
  fixture.componentRef.setInput('solutionLink', solutionLink);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  return {
    root,
    reveal: () => {
      root.querySelector<HTMLButtonElement>('.hint__toggle')!.click();
      fixture.detectChanges();
    },
    link: () => root.querySelector('a.hint__solution'),
  };
}

describe('HintCardComponent Solution link', () => {
  it.each([
    { name: 'no link', solutionLink: null, href: null },
    { name: 'a link', solutionLink: ['/practice', 20, 'solution'], href: '/practice/20/solution' },
  ])('$name: hidden before reveal, and after reveal shows href $href', ({ solutionLink, href }) => {
    const { link, reveal } = render(solutionLink);
    expect(link()).toBeNull();

    reveal();

    expect(link()?.getAttribute('href') ?? null).toBe(href);
  });
});
