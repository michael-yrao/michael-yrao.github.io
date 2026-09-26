import { describe, expect, it } from 'vitest';
import lumaFixture from '../../fixtures/luma-sample.ics?raw';
import meetupFixture from '../../fixtures/meetup-sample.ics?raw';
import type { EventSource } from '../contract';
import { adaptIcalEvents } from './ical';

// 2026-09-26T17:00:00Z: fixed clock for every date-dependent assertion below.
const NOW_MS = Date.UTC(2026, 8, 26, 17);

const awsNycSource: EventSource = {
  id: 'aws-nyc',
  label: 'AWS New York (official)',
  company: 'AWS',
  kind: 'ical',
  area: 'nyc',
  ok: true,
};

const lumaSource: EventSource = {
  id: 'datadog-luma',
  label: 'Datadog',
  company: 'Datadog',
  kind: 'ical',
  ok: true,
};

describe('adaptIcalEvents (Meetup shape)', () => {
  const events = adaptIcalEvents(meetupFixture, awsNycSource, NOW_MS);

  it('parses both VEVENTs (including the past one; upcoming filtering is normalize\'s job)', () => {
    expect(events).toHaveLength(2);
  });

  it('converts a TZID wall-clock DTSTART to the correct UTC instant', () => {
    const future = events.find((e) => e.id.includes('316007124'));
    expect(future?.start).toBe('2026-10-26T20:30:00.000Z');
    expect(future?.end).toBe('2026-10-26T22:00:00.000Z');
  });

  it('unescapes the title and reads the URL property', () => {
    const future = events.find((e) => e.id.includes('316007124'));
    expect(future?.title).toBe('Building a Model Evaluation Practice for Production AI');
    expect(future?.url).toBe('https://www.meetup.com/aws-nyc/events/316007124/');
  });

  it('a Meetup event with no LOCATION prop still classifies as "nyc" via the source pin (a\n' +
    'source pin wins unconditionally, precedence decided 2026-09-26 -- see CLAUDE.md "Events")', () => {
    for (const event of events) {
      expect(event.location).toBeUndefined();
      expect(event.area).toBe('nyc');
    }
  });

  it('carries the TZID through as the timezone label', () => {
    expect(events[0]?.timezone).toBe('America/New_York');
  });
});

describe('adaptIcalEvents (Luma shape)', () => {
  const events = adaptIcalEvents(lumaFixture, lumaSource, NOW_MS);

  it('parses all 4 VEVENTs from a UTC (Z) feed', () => {
    expect(events).toHaveLength(4);
  });

  it('treats a LOCATION that is already a luma.com URL as the online event URL, and omits location', () => {
    const online = events.find((e) => e.title.startsWith('Datadog Workshop'));
    expect(online?.url).toBe('https://luma.com/event/evt-GN824RiNOT7UalZ');
    expect(online?.area).toBe('online');
    expect(online?.location).toBeUndefined();
  });

  it('classifies an in-person NYC address as area "nyc" and keeps it as location, not url', () => {
    const nyc = events.find((e) => e.title === 'NYC Creative Builders Collective');
    expect(nyc?.area).toBe('nyc');
    expect(nyc?.location).toBe('Datadog, New York Times Bldg, 620 8th Ave, New York, NY 10018, USA');
  });

  it('unfolds a location split across a fold with no escaped comma (Luma style)', () => {
    const nyc = events.find((e) => e.title === 'NYC Creative Builders Collective');
    // "US\n A" in the raw fixture must become "USA", not "US A" or "USA" with a stray break.
    expect(nyc?.location?.endsWith('10018, USA')).toBe(true);
  });

  it('classifies a non-NYC in-person address (Amsterdam) as "other"', () => {
    const amsterdam = events.find((e) => e.title === 'Buildbarn Meetup at Datadog');
    expect(amsterdam?.area).toBe('other');
    expect(amsterdam?.location).toContain('Amsterdam');
  });

  it('derives the URL for an in-person event with no luma.com LOCATION from the UID', () => {
    const amsterdam = events.find((e) => e.title === 'Buildbarn Meetup at Datadog');
    expect(amsterdam?.url).toBe('https://luma.com/event/evt-QKNZbZXguW5mP3H');
  });

  it('marks the past event as such (its DTSTART is before the fixed clock)', () => {
    const past = events.find((e) => e.title.startsWith('Datadog Workshop'));
    expect(Date.parse(past?.start ?? '')).toBeLessThan(NOW_MS);
  });
});

describe('adaptIcalEvents (Luma shape) -- NYC-named online event, live capture', () => {
  // Real, unpinned Luma capture: an online event (luma.com URL LOCATION) whose SUMMARY names
  // New York City. Precedence (c) (NYC in LOCATION or SUMMARY) must win over the (d) fallback
  // (LOCATION empty or a URL => online) -- this is the exact case the 2026-09-26 precedence
  // decision was made for.
  const inlineBody = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luma//Datadog//EN',
    'BEGIN:VEVENT',
    'DTSTART:20261015T213000Z',
    'DTEND:20261016T000000Z',
    'DTSTAMP:20260926T171116Z',
    'ORGANIZER;CN="Hani Azzam":MAILTO:calendar-invite@lu.ma',
    'UID:evt-7h9SGiYxFEGPhAu@events.lu.ma',
    'SUMMARY:Infra Demo Night | New York City',
    'LOCATION:https://luma.com/event/evt-7h9SGiYxFEGPhAu',
    'GEO:40.75321562473894;-73.99095151803778',
    'SEQUENCE:212605876',
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  it('classifies "Infra Demo Night | New York City" as nyc via the summary, not online', () => {
    const [event] = adaptIcalEvents(inlineBody, lumaSource, NOW_MS);
    expect(event?.area).toBe('nyc');
    expect(event?.url).toBe('https://luma.com/event/evt-7h9SGiYxFEGPhAu');
    // Its LOCATION was a URL, so it's still omitted (never surfaced as a place, per the
    // "location is never a URL" rule) even though the area came from the summary, not the
    // (now-lower-priority) empty/URL-location fallback.
    expect(event?.location).toBeUndefined();
  });
});

describe('adaptIcalEvents error handling', () => {
  it('throws a descriptive error for a non-ICS body', () => {
    expect(() => adaptIcalEvents('<html>not ics</html>', awsNycSource, NOW_MS)).toThrow(
      /did not return an iCal feed/,
    );
  });
});
