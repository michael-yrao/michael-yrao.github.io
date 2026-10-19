import DOMPurify, { type Config } from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked } from 'marked';

// One-time setup at module load, never per message.
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('json', json);

const LANGUAGE_CLASS = /(?:^|\s)language-([\w-]+)/;
const INTERNAL_LINK_SELECTOR = 'a[href^="/"]';
const EXTERNAL_LINK_REL = 'noopener';

const SANITIZE_CONFIG: Config & { RETURN_DOM_FRAGMENT: true } = {
  FORBID_ATTR: ['style'],
  RETURN_DOM_FRAGMENT: true,
};

function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

// External links open in a new tab; DOMPurify drops `target`, so it is set after sanitizing each node.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName !== 'A') return;
  const href = node.getAttribute('href');
  if (href === null || isInternalHref(href)) return;
  node.setAttribute('target', '_blank');
  node.setAttribute('rel', EXTERNAL_LINK_REL);
});

function highlightCodeBlocks(root: ParentNode): void {
  for (const code of Array.from(root.querySelectorAll('pre code'))) {
    const language = LANGUAGE_CLASS.exec(code.className)?.[1];
    if (language === undefined || !hljs.getLanguage(language)) continue;
    code.innerHTML = hljs.highlight(code.textContent ?? '', { language }).value;
    code.classList.add('hljs');
  }
}

/** Markdown to safe HTML: marked, then DOMPurify, then highlight.js on the sanitized tree. */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source, { async: false });
  const fragment = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
  highlightCodeBlocks(fragment);
  const holder = document.createElement('div');
  holder.appendChild(fragment);
  return holder.innerHTML;
}

/** The site-internal path of a clicked in-message link, or null when the click was not on one. */
export function internalLinkPath(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const href = target.closest(INTERNAL_LINK_SELECTOR)?.getAttribute('href') ?? null;
  return href !== null && isInternalHref(href) ? href : null;
}
