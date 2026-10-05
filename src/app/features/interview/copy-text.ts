/** How long a copy button shows its ok or fail mark. */
export const COPY_FEEDBACK_MS = 1500;

export type CopyMark = 'ok' | 'fail';

/** Writes text to the clipboard; false (logged) when the browser has no clipboard or refuses the write.
 *  It must be called straight from a click handler, with no await before it, or Safari drops the gesture. */
export function copyText(text: string): Promise<boolean> {
  // `navigator.clipboard` is undefined in an insecure context or an unsupported browser.
  if (!navigator.clipboard) {
    console.error('Interview copy: navigator.clipboard is unavailable');
    return Promise.resolve(false);
  }
  return navigator.clipboard.writeText(text).then(
    () => true,
    (err: unknown) => {
      console.error('Interview copy: clipboard write failed', err);
      return false;
    },
  );
}
