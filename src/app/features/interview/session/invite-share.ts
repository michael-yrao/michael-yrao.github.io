/** The words that open both the share-menu title and the email subject. */
export const INVITE_TITLE_PREFIX = 'Interview invite';

const INVITE_BODY_PREFIX = 'Join the interview:';
const INVITE_WHEN_PREFIX = 'When:';
const HOST_TITLE_PREFIX = 'Interviewer link';
const HOST_BODY_PREFIX = 'Join as interviewer:';
const HOST_BODY_INVITE_PREFIX = 'Candidate link:';
/** RFC 6068: a line break inside a mailto body. */
const MAILTO_LINE_BREAK = '\r\n';

/** A prefix with the label after `: `; just the prefix when the label is blank. */
function withLabel(prefix: string, problemLabel: string): string {
  return problemLabel.trim() ? `${prefix}: ${problemLabel}` : prefix;
}

/** The share-menu title and email subject for a problem, e.g. `Interview invite: Two Sum`. */
export function inviteTitle(problemLabel: string): string {
  return withLabel(INVITE_TITLE_PREFIX, problemLabel);
}

/** `mailto:<recipient>?subject=&body=`, encoded so the URL's `?` and `&` survive; a blank recipient leaves To empty. */
function mailtoHref(recipient: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A `mailto:` link carrying the candidate invite, with a `When:` line after the join line when `when` is given. */
export function inviteEmailHref(url: string, problemLabel: string, recipient: string, when = ''): string {
  const lines = [`${INVITE_BODY_PREFIX} ${url}`, ...(when ? [`${INVITE_WHEN_PREFIX} ${when}`] : [])];
  return mailtoHref(recipient, inviteTitle(problemLabel), lines.join(MAILTO_LINE_BREAK));
}

/** A `mailto:` link carrying the interviewer link and the candidate link. */
export function hostEmailHref(hostUrl: string, inviteUrl: string, problemLabel: string, recipient: string): string {
  const body = [`${HOST_BODY_PREFIX} ${hostUrl}`, `${HOST_BODY_INVITE_PREFIX} ${inviteUrl}`].join(MAILTO_LINE_BREAK);
  return mailtoHref(recipient, withLabel(HOST_TITLE_PREFIX, problemLabel), body);
}
