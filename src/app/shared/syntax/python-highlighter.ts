import { Highlighter, tagHighlighter, tags as t } from '@lezer/highlight';

// Stable `tok-*` classes (not a HighlightStyle's generated names) so the palette lives once in
// CSS (`_syntax.scss`) and works the same in CodeMirror's DOM and in the viewer's innerHTML.
// Modified tags (`function(...)`, `definition(...)`) come before their bases so the specific entry wins.
export const pythonHighlighter: Highlighter = tagHighlighter([
  { tag: t.function(t.definition(t.variableName)), class: 'tok-definition' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'tok-function' },
  { tag: t.className, class: 'tok-className' },
  { tag: t.variableName, class: 'tok-variableName' },
  { tag: t.propertyName, class: 'tok-property' },
  { tag: [t.keyword, t.modifier], class: 'tok-keyword' },
  { tag: t.literal, class: 'tok-literal' },
  { tag: [t.string, t.special(t.string), t.escape], class: 'tok-string' },
  { tag: t.comment, class: 'tok-comment' },
  { tag: t.operator, class: 'tok-operator' },
  { tag: t.punctuation, class: 'tok-punctuation' },
  { tag: t.meta, class: 'tok-meta' },
  { tag: t.invalid, class: 'tok-invalid' },
]);
