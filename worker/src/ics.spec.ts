import { describe, expect, it } from 'vitest';
import meetupFixture from '../fixtures/meetup-sample.ics?raw';
import { parseContentLine, parseICalDate, parseVEvents, unescapeText, unfoldLines } from './ics';

describe('unfoldLines', () => {
  it('joins a CRLF fold, consuming exactly one leading whitespace char', () => {
    // Real Meetup capture: "user trust.\r\n  Without" -- one space is the fold marker, the
    // other is a real leading space in "Without".
    const lines = unfoldLines('DESCRIPTION:user trust.\r\n  Without a structured eval.');
    expect(lines).toEqual(['DESCRIPTION:user trust. Without a structured eval.']);
  });

  it('joins a bare-LF fold the same way', () => {
    // Real Luma capture: "...10018, US\n A\nGEO:..." -> "...10018, USA" then a new line.
    const lines = unfoldLines('LOCATION:10018, US\n A\nGEO:1,2');
    expect(lines).toEqual(['LOCATION:10018, USA', 'GEO:1,2']);
  });

  it('does not fold a line with no leading whitespace', () => {
    const lines = unfoldLines('SUMMARY:A\nLOCATION:B');
    expect(lines).toEqual(['SUMMARY:A', 'LOCATION:B']);
  });
});

describe('parseContentLine', () => {
  it('splits a plain NAME:VALUE line', () => {
    expect(parseContentLine('SUMMARY:Hello')).toEqual({
      name: 'SUMMARY',
      params: {},
      value: 'Hello',
    });
  });

  it('parses TZID and VALUE params', () => {
    expect(parseContentLine('DTSTART;TZID=America/New_York:20261026T163000')).toEqual({
      name: 'DTSTART',
      params: { TZID: 'America/New_York' },
      value: '20261026T163000',
    });
  });

  it('does not split on a colon inside a quoted param value', () => {
    const result = parseContentLine('ORGANIZER;CN="Datadog":MAILTO:calendar-invite@lu.ma');
    expect(result.name).toBe('ORGANIZER');
    expect(result.params.CN).toBe('Datadog');
    expect(result.value).toBe('MAILTO:calendar-invite@lu.ma');
  });

  it('uppercases the property name', () => {
    expect(parseContentLine('summary:x').name).toBe('SUMMARY');
  });
});

describe('unescapeText', () => {
  it('unescapes \\n, \\,, \\; and \\\\', () => {
    expect(unescapeText('a\\nb\\,c\\;d\\\\e')).toBe('a\nb,c;d\\e');
  });

  it('leaves ordinary text untouched', () => {
    expect(unescapeText('plain text')).toBe('plain text');
  });
});

describe('parseICalDate', () => {
  it('parses a UTC (Z) date-time', () => {
    expect(parseICalDate('20251006T213000Z')).toEqual({
      year: 2025,
      month: 10,
      day: 6,
      hour: 21,
      minute: 30,
      second: 0,
      tzid: undefined,
      isUtc: true,
      isDate: false,
    });
  });

  it('parses a floating date-time with a TZID', () => {
    expect(parseICalDate('20261026T163000', 'America/New_York')).toEqual({
      year: 2026,
      month: 10,
      day: 26,
      hour: 16,
      minute: 30,
      second: 0,
      tzid: 'America/New_York',
      isUtc: false,
      isDate: false,
    });
  });

  it('parses an all-day VALUE=DATE value', () => {
    const parsed = parseICalDate('20261026');
    expect(parsed.isDate).toBe(true);
    expect(parsed.hour).toBe(0);
  });

  it('throws on an unparseable value', () => {
    expect(() => parseICalDate('not-a-date')).toThrow();
  });
});

describe('parseVEvents', () => {
  it('extracts only VEVENT blocks from the meetup fixture, ignoring VTIMEZONE', () => {
    const events = parseVEvents(meetupFixture);
    // The fixture's VTIMEZONE has its own RRULE lines; scoping to VEVENT-only means those
    // never appear on a VEVENT record, and DTSTART is never the VTIMEZONE's own.
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.RRULE).toBeUndefined();
    }
    expect(events[0]?.DTSTART?.params.TZID).toBe('America/New_York');
    expect(events[1]?.UID?.value).toBe('event_316007124@meetup.com');
  });

  it('unfolds and preserves escaped commas inside a VEVENT property', () => {
    const events = parseVEvents(meetupFixture);
    const description = events[1]?.DESCRIPTION?.value ?? '';
    expect(description).toContain('\\,');
    expect(description).not.toContain('\r\n');
  });

  it('reads a URL property with VALUE=URI', () => {
    const events = parseVEvents(meetupFixture);
    expect(events[1]?.URL?.value).toBe('https://www.meetup.com/aws-nyc/events/316007124/');
  });

  it('returns an empty array for a calendar with no VEVENT', () => {
    const empty = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';
    expect(parseVEvents(empty)).toEqual([]);
  });
});
