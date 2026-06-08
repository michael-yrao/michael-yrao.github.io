import {
  Component, Input, OnChanges, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectionStrategy,
} from '@angular/core';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('python', python);

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeViewerComponent implements OnChanges, AfterViewInit {
  @Input() code = '';
  @Input() activeLine: number | undefined;
  @ViewChild('codeEl') codeEl!: ElementRef<HTMLElement>;

  lines: { html: string; lineNum: number }[] = [];
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnChanges(): void {
    this.buildLines();
  }

  private buildLines(): void {
    if (!this.code) return;
    const rawLines = this.code.split('\n');
    this.lines = rawLines.map((line, i) => {
      const result = hljs.highlight(line || ' ', { language: 'python' });
      return { html: result.value, lineNum: i + 1 };
    });
  }

  isActive(lineNum: number): boolean {
    return this.activeLine !== undefined && this.activeLine === lineNum;
  }
}
