import { inviteEmailHref } from './invite-share';

describe('inviteEmailHref', () => {
  it('carries the subject and the whole invite url through the mailto encoding', () => {
    const url = 'https://example.com/practice/1?repo=me/notes&join=abc';
    const href = inviteEmailHref(url, '#1 Two Sum');

    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe('Interview invite: #1 Two Sum');
    expect(params.get('body')).toBe(`Join the interview: ${url}`);
  });
});
