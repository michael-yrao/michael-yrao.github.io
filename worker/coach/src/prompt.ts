import type { CoachPageContext } from './contract.js';

const CONTEXT_TAG = 'page_context';
const TAG_PATTERN = new RegExp(`<(/?${CONTEXT_TAG})`, 'gi');

/** Escapes any `<page_context` or `</page_context` in learner text so it cannot forge the block. */
function neutraliseTags(text: string): string {
  return text.replace(TAG_PATTERN, '&lt;$1');
}

/**
 * The JSON of the context with every `</` written as `<\/`: still valid JSON that parses to the
 * same value, but a closing tag inside the learner's code can no longer end the block early.
 */
function contextJson(context: CoachPageContext): string {
  return JSON.stringify(context).replace(/<\//g, '<\\/');
}

/** The learner's text first, then the page context in one tagged block. */
export function buildPrompt(message: string, context: CoachPageContext): string {
  return `${neutraliseTags(message)}\n\n<${CONTEXT_TAG}>${contextJson(context)}</${CONTEXT_TAG}>`;
}
