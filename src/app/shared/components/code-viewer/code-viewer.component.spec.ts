import { TestBed } from '@angular/core/testing';

import { CodeViewerComponent } from './code-viewer.component';
import { DisplayRow } from '../../../core/showcase/display';
import { RowRange } from '../../../core/showcase/anchor-resolver';

function makeRows(): DisplayRow[] {
  return [
    { text: 'class Solution:', sourceLine: 39, kind: 'code' },
    { text: '', sourceLine: null, kind: 'gap' },
    { text: '    def floodFill(self, image):', sourceLine: 41, kind: 'code' },
    { text: '        return image', sourceLine: 42, kind: 'code' },
  ];
}

function createFixture(opts: { rows?: DisplayRow[]; activeRange?: RowRange | null; code?: string }) {
  TestBed.configureTestingModule({ imports: [CodeViewerComponent] });
  const fixture = TestBed.createComponent(CodeViewerComponent);
  if (opts.rows !== undefined) fixture.componentRef.setInput('rows', opts.rows);
  if (opts.activeRange !== undefined)
    fixture.componentRef.setInput('activeRange', opts.activeRange);
  if (opts.code !== undefined) fixture.componentRef.setInput('code', opts.code);
  fixture.detectChanges();
  return fixture;
}

describe('CodeViewerComponent', () => {
  it('renders each row under its real source line number', () => {
    const fixture = createFixture({ rows: makeRows() });

    const nums = fixture.nativeElement.querySelectorAll('.code-line__num');
    expect(nums[0].textContent.trim()).toBe('39');
    expect(nums[2].textContent.trim()).toBe('41');
    expect(nums[3].textContent.trim()).toBe('42');
  });

  it('shows a gap row as a dimmed ⋯ with no line number', () => {
    const fixture = createFixture({ rows: makeRows() });

    const lines = fixture.nativeElement.querySelectorAll('.code-line');
    const gap = lines[1];
    expect(gap.classList.contains('code-line--gap')).toBe(true);
    expect(gap.querySelector('.code-line__num').textContent.trim()).toBe('');
    expect(gap.querySelector('.code-line__content').textContent.trim()).toBe('⋯');
  });

  it('marks every row in activeRange active, with range-start/range-end on the edges', () => {
    const fixture = createFixture({ rows: makeRows(), activeRange: { start: 2, end: 3 } });

    const lines = fixture.nativeElement.querySelectorAll('.code-line');
    expect(lines[0].classList.contains('code-line--active')).toBe(false);
    expect(lines[2].classList.contains('code-line--active')).toBe(true);
    expect(lines[2].classList.contains('code-line--range-start')).toBe(true);
    expect(lines[2].classList.contains('code-line--range-end')).toBe(false);
    expect(lines[3].classList.contains('code-line--active')).toBe(true);
    expect(lines[3].classList.contains('code-line--range-end')).toBe(true);
  });

  it('a single-row range carries both range-start and range-end', () => {
    const fixture = createFixture({ rows: makeRows(), activeRange: { start: 0, end: 0 } });

    const line = fixture.nativeElement.querySelectorAll('.code-line')[0];
    expect(line.classList.contains('code-line--range-start')).toBe(true);
    expect(line.classList.contains('code-line--range-end')).toBe(true);
  });

  it('renders no rows when neither rows nor code is provided', () => {
    const fixture = createFixture({});
    expect(fixture.nativeElement.querySelectorAll('.code-line').length).toBe(0);
  });

  it('renders a plain code string, one row per line, with no active range', () => {
    const fixture = createFixture({ code: 'a = 1\nb = 2\nreturn a + b' });

    const nums = fixture.nativeElement.querySelectorAll('.code-line__num');
    expect(nums.length).toBe(3);
    expect(nums[2].textContent.trim()).toBe('3');
    expect(fixture.nativeElement.querySelectorAll('.code-line--active').length).toBe(0);
  });

  it('does not throw when scrollIntoView is unavailable (jsdom)', () => {
    const fixture = createFixture({ rows: makeRows(), activeRange: { start: 2, end: 2 } });
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('renders no whitespace text nodes between rows inside <pre>', () => {
    const fixture = createFixture({ rows: makeRows() });

    const code = fixture.nativeElement.querySelector('code.hljs') as HTMLElement;
    expect(Array.from(code.childNodes).some((n: Node) => n.nodeType === Node.TEXT_NODE)).toBe(
      false,
    );
    expect(fixture.nativeElement.querySelector('pre').textContent).toBe(
      '39class Solution:⋯41    def floodFill(self, image):42        return image',
    );
  });

  it('scrolls the newly active row into view once the view has re-rendered it', () => {
    const calls: HTMLElement[] = [];
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      calls.push(this);
    };
    try {
      const fixture = createFixture({ rows: makeRows(), activeRange: { start: 2, end: 2 } });
      fixture.componentRef.setInput('activeRange', { start: 3, end: 3 });
      fixture.detectChanges();

      expect(calls.length).toBeGreaterThan(0);
      const lastCallRow = calls[calls.length - 1];
      expect(lastCallRow.querySelector('.code-line__num')?.textContent?.trim()).toBe('42');
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });
});
