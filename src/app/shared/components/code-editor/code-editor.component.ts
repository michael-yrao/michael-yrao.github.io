import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
} from '@angular/core';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentUnit, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { EditorState, Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, KeyBinding, keymap, lineNumbers } from '@codemirror/view';
import { darkHighlightStyle } from './editor-highlight';

const INDENT = '    ';
const TAB_SIZE = INDENT.length;
const RUN_SHORTCUT_KEY = 'Mod-Enter';
const BOTTOM_PADDING_LINES = 4;

// The page's document listener owns Ctrl/Cmd+Enter (run); CodeMirror's insertBlankLine must not take it.
const isNotRunShortcut = (binding: KeyBinding): boolean => binding.key !== RUN_SHORTCUT_KEY;

const ERROR_LINE_CLASS = 'cm-error-line';
const ERROR_LINE_TINT = 'color-mix(in srgb, var(--color-hard) 18%, transparent)';

/** Sets (a 1-based line) or clears (null) the tinted error line. */
const setErrorLineEffect = StateEffect.define<number | null>();

function errorLineDecoration(state: EditorState, line: number | null): DecorationSet {
  if (line === null || line < 1 || line > state.doc.lines) return Decoration.none;
  return Decoration.set([Decoration.line({ class: ERROR_LINE_CLASS }).range(state.doc.line(line).from)]);
}

// Any edit clears the tint: the line number would point at moved text.
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    const effect = transaction.effects.find((candidate) => candidate.is(setErrorLineEffect));
    if (effect) return errorLineDecoration(transaction.state, effect.value);
    return transaction.docChanged ? Decoration.none : decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// Theme tokens come from the site's CSS custom properties, so the editor follows the light
// and dark themes with no second palette. The size comes from three custom properties that a
// parent can override from a media query; the fallbacks are the stacked layout's values.
const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-bg-card)',
    fontSize: 'var(--text-sm)',
    height: 'var(--editor-height, auto)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    overflow: 'auto',
    minHeight: 'var(--editor-min-height, 16rem)',
    maxHeight: 'var(--editor-max-height, 32rem)',
  },
  // Room below the last line so typing never sits on the bottom edge. scrollPastEnd() is not used: its
  // padding tracks the editor's height, which would grow an auto-height editor to its max-height.
  '.cm-content': { caretColor: 'var(--color-accent)', paddingBottom: `${BOTTOM_PADDING_LINES}lh` },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-accent)' },
  '&.cm-focused': { outline: '2px solid var(--color-accent)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-muted)',
    border: 'none',
  },
  [`.${ERROR_LINE_CLASS}`]: { backgroundColor: ERROR_LINE_TINT },
  '.cm-activeLine': { backgroundColor: 'var(--hover-tint)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--hover-tint)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--color-accent-dim)',
  },
});

/** CodeMirror 6 wrapper for the practice page. Deliberately has no autocomplete and no
 *  bracket closing: the learner practises without them. Long lines wrap, and Mod-Enter is left
 *  unbound so it bubbles to the page, whose run shortcut it is. `initialText` is read once, when the
 *  view is created; later changes go through `setText`. A parent fills its container by
 *  setting `--editor-height: 100%`, `--editor-min-height: 0` and `--editor-max-height: none`. */
@Component({
  selector: 'app-code-editor',
  template: '',
  styles: ':host { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy {
  readonly initialText = input.required<string>();
  /** Extra extensions (a session's shared-document sync), read once, when the view is created. */
  readonly extensions = input<readonly Extension[]>([]);
  readonly textChange = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private view: EditorView | null = null;

  // ngAfterViewInit rather than afterNextRender: the latter would pull another framework
  // runtime symbol into the initial bundle for a page that is otherwise lazy.
  ngAfterViewInit(): void {
    this.view = new EditorView({
      parent: this.host.nativeElement,
      state: EditorState.create({
        doc: this.initialText(),
        extensions: [
          lineNumbers(),
          history(),
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap.filter(isNotRunShortcut), ...historyKeymap, indentWithTab]),
          indentUnit.of(INDENT),
          EditorState.tabSize.of(TAB_SIZE),
          python(),
          syntaxHighlighting(darkHighlightStyle),
          editorTheme,
          errorLineField,
          // Cursor scrolling keeps the padding's worth of space below the typed line.
          EditorView.scrollMargins.of((view) => ({ bottom: BOTTOM_PADDING_LINES * view.defaultLineHeight })),
          ...this.extensions(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) this.textChange.emit(update.state.doc.toString());
          }),
        ],
      }),
    });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
    this.view = null;
  }

  /** Replaces the whole document (emits `textChange` like any edit). */
  setText(text: string): void {
    const view = this.view;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  }

  /** Tints a 1-based line as the error line (null clears it); the next edit clears it too. */
  setErrorLine(line: number | null): void {
    this.view?.dispatch({ effects: setErrorLineEffect.of(line) });
  }
}
