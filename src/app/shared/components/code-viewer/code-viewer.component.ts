import {
  Component, Input, OnChanges, AfterViewInit, AfterViewChecked,
  SimpleChanges, ElementRef, ViewChild, ChangeDetectionStrategy,
} from '@angular/core';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import { DisplayRow } from '../../../core/showcase/display';
import { RowRange } from '../../../core/showcase/anchor-resolver';

hljs.registerLanguage('python', python);

interface CodeLine {
  readonly html: string;
  readonly sourceLine: number | null;
  readonly isGap: boolean;
}

const GAP_MARKER = '⋯';
const ACTIVE_ROW_SELECTOR = '.code-line--active';

/** A plain code string, one row per line, 1-based source numbering — used by callers with a
 *  static snippet and no anchor-resolved source (e.g. the Big-O trainer, the cheat sheet). */
function rowsFromCode(code: string): DisplayRow[] {
  if (!code) return [];
  return code.split('\n').map((text, i) => ({ text, sourceLine: i + 1, kind: 'code' as const }));
}

function rangesEqual(a: RowRange | null, b: RowRange | null): boolean {
  if (a === null || b === null) return a === b;
  return a.start === b.start && a.end === b.end;
}

/**
 * Renders code with highlight.js. Two ways to supply it: `rows` (content anchored to real
 * source lines, gap rows for skipped source, paired with `activeRange` — the resolved active
 * step) for the grounded solution panel, or a plain `code` string (no active range) for a
 * static snippet with no step-through, such as the Big-O trainer or the cheat sheet.
 * Row markup inside <pre> must stay whitespace-free between tags — Angular never trims
 * whitespace inside <pre>; each stray newline renders as a blank row (fixed 2026-09-23).
 */
@Component({
    selector: 'app-code-viewer',
    templateUrl: './code-viewer.component.html',
    styleUrls: ['./code-viewer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeViewerComponent implements OnChanges, AfterViewInit, AfterViewChecked {
  @Input() code = '';
  @Input() rows: DisplayRow[] | undefined;
  @Input() activeRange: RowRange | null | undefined;

  @ViewChild('codeEl') codeEl!: ElementRef<HTMLElement>;

  lines: CodeLine[] = [];
  private effectiveRange: RowRange | null = null;
  // Set when `effectiveRange` changes; consumed (and cleared) in ngAfterViewChecked, which
  // runs AFTER the template has re-rendered the new active row — ngOnChanges runs before that
  // render, so scrolling from there would always find the PREVIOUS step's row.
  private pendingScroll = false;

  ngAfterViewInit(): void {
    this.scrollToActive();
  }

  ngAfterViewChecked(): void {
    if (!this.pendingScroll) return;
    this.pendingScroll = false;
    this.scrollToActive();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['code']) this.buildLines();
    if (changes['activeRange']) this.updateActiveRange();
  }

  isActive(index: number): boolean {
    const r = this.effectiveRange;
    return r !== null && index >= r.start && index <= r.end;
  }

  isRangeStart(index: number): boolean {
    return this.effectiveRange !== null && index === this.effectiveRange.start;
  }

  isRangeEnd(index: number): boolean {
    return this.effectiveRange !== null && index === this.effectiveRange.end;
  }

  private buildLines(): void {
    const displayRows = this.rows ?? rowsFromCode(this.code);
    this.lines = displayRows.map((row) => this.toCodeLine(row));
  }

  private toCodeLine(row: DisplayRow): CodeLine {
    if (row.kind === 'gap') return { html: GAP_MARKER, sourceLine: null, isGap: true };
    const highlighted = hljs.highlight(row.text || ' ', { language: 'python' });
    return { html: highlighted.value, sourceLine: row.sourceLine, isGap: false };
  }

  private updateActiveRange(): void {
    const next = this.activeRange ?? null;
    if (rangesEqual(next, this.effectiveRange)) return;
    this.effectiveRange = next;
    this.pendingScroll = next !== null;
  }

  /** jsdom (unit tests) has no `scrollIntoView` — guarded so tests don't throw. */
  private scrollToActive(): void {
    const el = this.codeEl?.nativeElement.querySelector(ACTIVE_ROW_SELECTOR) as HTMLElement | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
