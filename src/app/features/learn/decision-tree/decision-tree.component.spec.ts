import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DecisionTreeComponent } from './decision-tree.component';
import { CheatSheetService } from '../../../core/services/cheat-sheet.service';
import { DecisionTreeNode } from '../../../core/models/cheat-sheet.model';

// Only `techniqueById` is on DecisionTreeComponent's dependency surface — a minimal fake
// resolves the one real id the tests need ('two-pointer') and nothing else.
function makeCheatSheetsStub() {
  return {
    techniqueById: (id: string) =>
      id === 'two-pointer' ? { id: 'two-pointer', name: 'Two Pointer' } : undefined,
  };
}

const sampleTree: DecisionTreeNode = {
  label: 'What is the shape?',
  children: [
    {
      label: 'Array / string',
      children: [
        {
          label: 'Sorted?',
          children: [
            {
              label: 'Pair sum',
              reach: 'two-pointer',
              reachLabel: 'two pointers (converging)',
              note: 'converge from ends',
            },
          ],
        },
        // No `reachLabel` — proves the fallback to the resolved technique's own name.
        { label: 'Another pair problem', reach: 'two-pointer', note: '' },
        { label: 'Missing number', reach: 'cyclic sort', note: '', page: false },
        { label: 'Something unresolved', reach: 'not-a-real-id', note: '' },
      ],
    },
  ],
};

function createFixture(tree: DecisionTreeNode = sampleTree) {
  TestBed.configureTestingModule({
    imports: [DecisionTreeComponent],
    providers: [
      provideRouter([]),
      { provide: CheatSheetService, useValue: makeCheatSheetsStub() as unknown as CheatSheetService },
    ],
  });
  const fixture = TestBed.createComponent(DecisionTreeComponent);
  fixture.componentRef.setInput('tree', tree);
  fixture.detectChanges();
  return fixture;
}

describe('DecisionTreeComponent', () => {
  it('renders the root label and one nested <ul> per inner node', () => {
    const fixture = createFixture();

    const root = fixture.nativeElement.querySelector('.dt__root');
    expect(root?.textContent).toBe('What is the shape?');
    // The root list + "Array / string"'s children + "Sorted?"'s children = 3 inner nodes.
    expect(fixture.nativeElement.querySelectorAll('ul.dt__list').length).toBe(3);
  });

  it('marks a question-label node with dt__node--question', () => {
    const fixture = createFixture();

    const nodes: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('li.dt__node'));
    const sorted = nodes.find((n) => n.querySelector('.dt__label')?.textContent === 'Sorted?');

    expect(sorted?.classList.contains('dt__node--question')).toBe(true);
  });

  it("renders a resolvable leaf using the author's reachLabel, with its note", () => {
    const fixture = createFixture();

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.dt__reach'),
    );
    const link = links.find((l) => l.textContent === 'two pointers (converging)');

    expect(link?.getAttribute('href')).toBe('/learn/two-pointer');
    expect(link?.closest('li.dt__node')?.querySelector('.dt__note')?.textContent).toContain(
      'converge from ends',
    );
  });

  it('falls back to the resolved technique name when a leaf has no reachLabel', () => {
    const fixture = createFixture();

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.dt__reach'),
    );
    const link = links.find(
      (l) => l.getAttribute('href') === '/learn/two-pointer' && l.textContent === 'Two Pointer',
    );

    expect(link).toBeTruthy();
  });

  it('renders a page:false leaf and an unresolvable id as plain text, not a link', () => {
    const fixture = createFixture();

    const plainReaches: (string | null)[] = Array.from(
      fixture.nativeElement.querySelectorAll('span.dt__reach'),
    ).map((el) => (el as HTMLElement).textContent);

    expect(plainReaches).toContain('cyclic sort');
    expect(plainReaches).toContain('not-a-real-id');
    // Two resolvable 'two-pointer' leaves in the fixture (one with reachLabel, one without).
    expect(fixture.nativeElement.querySelectorAll('a.dt__reach').length).toBe(2);
  });
});
