import { hostEmailHref, inviteEmailHref } from './invite-share';

const JOIN_URL = 'https://example.com/practice/1?repo=me/notes&join=abc';
const HOST_URL = 'https://example.com/practice/1?repo=me/notes&host=secret';
const LABEL = '#1 Two Sum';

const CASES: readonly {
  readonly name: string;
  readonly build: () => string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}[] = [
  {
    name: 'candidate with a blank recipient',
    build: () => inviteEmailHref(JOIN_URL, LABEL, ''),
    to: '',
    subject: 'Interview invite: #1 Two Sum',
    body: `Join the interview: ${JOIN_URL}`,
  },
  {
    name: 'candidate with a recipient',
    build: () => inviteEmailHref(JOIN_URL, LABEL, 'sam@example.com'),
    to: 'sam@example.com',
    subject: 'Interview invite: #1 Two Sum',
    body: `Join the interview: ${JOIN_URL}`,
  },
  {
    name: 'candidate with a time adds a When line',
    build: () => inviteEmailHref(JOIN_URL, LABEL, '', 'Tue, Oct 6, 3:00 PM (45 min)'),
    to: '',
    subject: 'Interview invite: #1 Two Sum',
    body: `Join the interview: ${JOIN_URL}\r\nWhen: Tue, Oct 6, 3:00 PM (45 min)`,
  },
  {
    name: 'interviewer with both links',
    build: () => hostEmailHref(HOST_URL, JOIN_URL, LABEL, 'me@example.com'),
    to: 'me@example.com',
    subject: 'Interviewer link: #1 Two Sum',
    body: `Join as interviewer: ${HOST_URL}\r\nCandidate link: ${JOIN_URL}`,
  },
  {
    name: 'a whitespace-only label leaves no colon',
    build: () => inviteEmailHref(JOIN_URL, '  ', ''),
    to: '',
    subject: 'Interview invite',
    body: `Join the interview: ${JOIN_URL}`,
  },
  {
    name: 'a recipient with + and & encoded',
    build: () => inviteEmailHref(JOIN_URL, LABEL, 'a+b&c@example.com'),
    to: 'a+b&c@example.com',
    subject: 'Interview invite: #1 Two Sum',
    body: `Join the interview: ${JOIN_URL}`,
  },
];

describe('email hrefs', () => {
  it.each(CASES)('$name', ({ build, to, subject, body }) => {
    const href = build();

    const query = href.indexOf('?');
    expect(decodeURIComponent(href.slice('mailto:'.length, query))).toBe(to);
    if (to.includes('+')) expect(href.startsWith('mailto:a%2Bb%26c%40example.com?')).toBe(true);
    const params = new URLSearchParams(href.slice(query + 1));
    expect(params.get('subject')).toBe(subject);
    expect(params.get('body')).toBe(body);
  });
});
