import { HighlightStyle, defaultHighlightStyle } from '@codemirror/language';

type HighlightSpec = (typeof defaultHighlightStyle.specs)[number];

const FALLBACK_COLOR = 'var(--color-text)';

// CodeMirror's default palette is built for a light background; the site is dark-only, so each
// default colour maps to the atom-one-dark colour the site's highlight.js theme already uses.
const DARK_PALETTE: Readonly<Record<string, string>> = {
  '#708': '#c678dd', // keyword
  '#219': '#d19a66', // atom, bool
  '#164': '#d19a66', // literal
  '#a11': '#98c379', // string
  '#e40': '#56b6c2', // regexp, escape
  '#00f': '#61aeee', // defined variable
  '#30a': '#e06c75', // local variable
  '#085': '#e6c07b', // type name, namespace
  '#167': '#e6c07b', // class name
  '#256': '#e06c75', // special variable
  '#00c': '#61aeee', // defined property
  '#940': '#5c6370', // comment
  '#f00': '#e06c75', // invalid
  '#404740': '#7f848e', // meta
};

function darkSpec(spec: HighlightSpec): HighlightSpec {
  const color = (spec as { color?: unknown }).color;
  if (typeof color !== 'string') return spec;
  return { ...spec, color: DARK_PALETTE[color.toLowerCase()] ?? FALLBACK_COLOR };
}

/** The default highlight style recoloured for the dark site; the default specs are not mutated. */
export const darkHighlightStyle = HighlightStyle.define(defaultHighlightStyle.specs.map(darkSpec));
