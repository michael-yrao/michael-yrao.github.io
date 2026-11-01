import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleteRepPanelComponent, CompletedRep, InferredBounds, LegendItem, ReferenceBounds, RepChoices } from './complete-rep-panel.component';

const POOL = ['O(1)', 'O(n)', 'O(n log n)'];
const CHOICES = { time: POOL, space: POOL };
const REFERENCE: ReferenceBounds = { time: 'O(n)', space: 'O(1)', whyTime: 'one pass', whySpace: 'two counters' };
const WHY = '  one pass  ';

function render(
  reference: ReferenceBounds | null,
  choices: RepChoices = CHOICES,
  legend: readonly LegendItem[] = [],
  inferred: InferredBounds | null = null,
  pool: readonly string[] = [],
): {
  fixture: ComponentFixture<CompleteRepPanelComponent>;
  root: HTMLElement;
  emitted: CompletedRep[];
} {
  const fixture = TestBed.createComponent(CompleteRepPanelComponent);
  fixture.componentRef.setInput('choices', choices);
  fixture.componentRef.setInput('legend', legend);
  fixture.componentRef.setInput('reference', reference);
  fixture.componentRef.setInput('inferred', inferred);
  fixture.componentRef.setInput('pool', pool);
  const emitted: CompletedRep[] = [];
  fixture.componentInstance.saved.subscribe((rep) => emitted.push(rep));
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement, emitted };
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
}

function chip(root: HTMLElement, rowIndex: number, label: string): HTMLButtonElement {
  const row = root.querySelectorAll('.rep__row')[rowIndex];
  return Array.from(row.querySelectorAll('.rep__chip')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
}

function type(fixture: ComponentFixture<unknown>, rowIndex: number, text: string): void {
  const input = fixture.nativeElement.querySelectorAll('.rep__why-input')[rowIndex] as HTMLTextAreaElement;
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

function fill(fixture: ComponentFixture<unknown>, time: string | null, space: string | null, whys: [string, string]): void {
  const root: HTMLElement = fixture.nativeElement;
  if (time !== null) chip(root, 0, time).click();
  if (space !== null) chip(root, 1, space).click();
  type(fixture, 0, whys[0]);
  type(fixture, 1, whys[1]);
  fixture.detectChanges();
}

describe('CompleteRepPanelComponent', () => {
  it.each([
    { name: 'Close button click', fire: (root: HTMLElement) => (root.querySelector('.rep__close') as HTMLButtonElement).click() },
    {
      name: 'Escape keydown on the .rep section',
      fire: (root: HTMLElement) =>
        root.querySelector('.rep')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    },
  ])('$name emits closed once', ({ fire }) => {
    const { fixture, root } = render(REFERENCE);
    const closedSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);

    fire(root);

    expect(closedSpy).toHaveBeenCalledTimes(1);
  });

  it('each row offers its own choices', () => {
    const { root } = render(REFERENCE, { time: ['O(n)', 'O(n²)'], space: ['O(1)'] });

    const labelsOf = (row: Element): (string | undefined)[] =>
      Array.from(row.querySelectorAll('.rep__chip')).map((c) => c.textContent?.trim());
    expect(Array.from(root.querySelectorAll('.rep__row')).map(labelsOf)).toEqual([['O(n)', 'O(n²)'], ['O(1)']]);
  });

  it.each([
    { name: 'two variables', legend: [{ symbol: 'n', meaning: 'length of nums' }, { symbol: 'k', meaning: 'window size' }], items: ['n length of nums', 'k window size'], hasList: true },
    { name: 'no variables', legend: [], items: [], hasList: false },
  ])('legend, $name', ({ legend, items, hasList }) => {
    const { root } = render(REFERENCE, CHOICES, legend);

    expect(root.querySelector('.rep__legend') !== null).toBe(hasList);
    expect(
      Array.from(root.querySelectorAll('.rep__legend-item')).map(
        (i) => `${i.querySelector('dt')?.textContent} ${i.querySelector('dd')?.textContent}`,
      ),
    ).toEqual(items);
  });

  it.each([
    { name: 'nothing set', time: null, space: null, whys: ['', ''] as [string, string], isEnabled: false },
    { name: 'a blank why', time: 'O(n)', space: 'O(1)', whys: ['x', '   '] as [string, string], isEnabled: false },
    { name: 'a chip missing', time: 'O(n)', space: null, whys: ['x', 'y'] as [string, string], isEnabled: false },
    { name: 'both chips and both whys', time: 'O(n)', space: 'O(1)', whys: ['x', 'y'] as [string, string], isEnabled: true },
  ])('Check with $name: enabled is $isEnabled', ({ time, space, whys, isEnabled }) => {
    const { fixture, root } = render(REFERENCE);

    fill(fixture, time, space, whys);

    expect(buttonByText(root, 'Check').disabled).toBe(!isEnabled);
  });

  it.each([
    {
      name: 'both match',
      reference: REFERENCE,
      picks: ['O(n)', 'O(1)'],
      marks: ['check', 'check'],
      refWhys: ['one pass', 'two counters'],
      hasKey: false,
    },
    {
      name: 'time misses',
      reference: REFERENCE,
      picks: ['O(n log n)', 'O(1)'],
      marks: ['x O(n)', 'check'],
      refWhys: ['one pass', 'two counters'],
      hasKey: false,
    },
    { name: 'no reference', reference: null, picks: ['O(n)', 'O(1)'], marks: [], refWhys: [], hasKey: true },
  ])('reveal, $name', ({ reference, picks, marks, refWhys, hasKey }) => {
    const { fixture, root } = render(reference);
    fill(fixture, picks[0], picks[1], ['x', 'y']);

    buttonByText(root, 'Check').click();
    fixture.detectChanges();

    const text = (selector: string): string[] =>
      Array.from(root.querySelectorAll(selector)).map((el) => el.textContent?.trim() ?? '');
    const iconAndText = Array.from(root.querySelectorAll('.rep__mark')).map((el) =>
      `${el.querySelector('app-icon svg')?.getAttribute('data-name') ?? ''} ${el.textContent?.trim() ?? ''}`.trim(),
    );
    expect(iconAndText).toEqual(marks);
    expect(text('.rep__ref-why')).toEqual(refWhys);
    expect(text('.rep__key')).toEqual(hasKey ? ['no reference bound'] : []);
  });

  it.each([
    {
      name: 'inferred on both axes: graded against the code, no why',
      inferred: { time: 'O(n log n)', space: 'O(1)' },
      picks: ['O(n log n)', 'O(n)'],
      marks: ['check', 'x O(1)'],
      sources: ['Graded against your code', 'Graded against your code'],
      refWhys: [],
    },
    {
      name: 'inferred null on an axis: that axis is graded against the reference, with its why',
      inferred: { time: null, space: 'O(1)' },
      picks: ['O(n)', 'O(1)'],
      marks: ['check', 'check'],
      sources: ['Graded against the reference', 'Graded against your code'],
      refWhys: ['one pass'],
    },
  ])('graded against the code, $name', ({ inferred, picks, marks, sources, refWhys }) => {
    const { fixture, root } = render(REFERENCE, CHOICES, [], inferred, POOL);
    fill(fixture, picks[0], picks[1], ['x', 'y']);

    buttonByText(root, 'Check').click();
    fixture.detectChanges();

    const marksText = Array.from(root.querySelectorAll('.rep__mark')).map((el) =>
      `${el.querySelector('app-icon svg')?.getAttribute('data-name') ?? ''} ${el.textContent?.trim() ?? ''}`.trim(),
    );
    const sourceLabels = Array.from(root.querySelectorAll('.rep__source app-icon svg')).map((svg) => svg.getAttribute('aria-label'));
    expect(marksText).toEqual(marks);
    expect(sourceLabels).toEqual(sources);
    expect(Array.from(root.querySelectorAll('.rep__ref-why')).map((el) => el.textContent?.trim())).toEqual(refWhys);
  });

  it.each([
    { name: 'between its pool neighbours', choices: ['O(1)', 'O(n log n)'], label: 'O(n)', expected: ['O(1)', 'O(n)', 'O(n log n)'] },
    { name: 'after every choice the pool lists earlier', choices: ['O(1)', 'O(n)'], label: 'O(n log n)', expected: ['O(1)', 'O(n)', 'O(n log n)'] },  ])('an inferred label is inserted in pool order, $name', ({ choices, label, expected }) => {
    const { root } = render(REFERENCE, { time: choices, space: choices }, [], { time: label, space: null }, POOL);

    const row = root.querySelectorAll('.rep__row')[0];
    expect(Array.from(row.querySelectorAll('.rep__chip')).map((c) => c.textContent?.trim())).toEqual(expected);
  });

  it.each([
    { name: '51 remaining', length: 1949, count: [] },
    { name: '50 remaining', length: 1950, count: ['50'] },
    { name: '0 remaining', length: 2000, count: ['0'] },
  ])('why count, $name', ({ length, count }) => {
    const { fixture, root } = render(REFERENCE);

    type(fixture, 0, 'x'.repeat(length));
    fixture.detectChanges();

    expect(Array.from(root.querySelectorAll('.rep__why-count')).map((el) => el.textContent?.trim())).toEqual(count);
  });

  it('keeps the rating buttons disabled until Check, and locks the chips after it', () => {
    const { fixture, root } = render(REFERENCE);
    const radios = (): HTMLInputElement[] => Array.from(root.querySelectorAll('input[type="radio"]'));
    fill(fixture, 'O(n)', 'O(1)', ['x', 'y']);

    expect(radios().map((r) => r.disabled)).toEqual([true, true, true]);
    expect(buttonByText(root, 'Save rep').disabled).toBe(true);

    buttonByText(root, 'Check').click();
    fixture.detectChanges();

    expect(radios().map((r) => r.disabled)).toEqual([false, false, false]);
    expect(radios().some((r) => r.checked)).toBe(false);
    expect(chip(root, 0, 'O(1)').disabled).toBe(true);
  });

  it('Save rep emits the rating and the bounds with the whys trimmed', () => {
    const { fixture, root, emitted } = render(REFERENCE);
    fill(fixture, 'O(n)', 'O(1)', [WHY, 'two counters']);
    buttonByText(root, 'Check').click();
    fixture.detectChanges();

    (root.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement).click();
    fixture.detectChanges();
    buttonByText(root, 'Save rep').click();

    expect(emitted).toEqual([
      {
        rating: 'shaky',
        complexity: { time: 'O(n)', space: 'O(1)', whyTime: 'one pass', whySpace: 'two counters' },
      },
    ]);
  });
});
