/** The words that open both the share-menu title and the email subject. */
export const INVITE_TITLE_PREFIX = 'Interview invite';

const INVITE_BODY_PREFIX = 'Join the interview:';

/** The share-menu title and email subject for a problem, e.g. `Interview invite: #1 Two Sum`. */
export function inviteTitle(problemLabel: string): string {
  return `${INVITE_TITLE_PREFIX}: ${problemLabel}`;
}

/** A `mailto:` link carrying the invite; subject and body are encoded so the URL's `?` and `&` survive. */
export function inviteEmailHref(url: string, problemLabel: string): string {
  const subject = encodeURIComponent(inviteTitle(problemLabel));
  const body = encodeURIComponent(`${INVITE_BODY_PREFIX} ${url}`);
  return `mailto:?subject=${subject}&body=${body}`;
}
