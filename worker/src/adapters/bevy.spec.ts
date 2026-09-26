import { describe, expect, it } from 'vitest';
import bevyFixture from '../../fixtures/bevy-sample.json?raw';
import type { EventSource } from '../contract';
import { adaptBevyEvents } from './bevy';

const NOW_MS = Date.UTC(2026, 8, 26, 17);

const bevySource: EventSource = {
  id: 'snowflake-bevy',
  label: 'Snowflake User Groups',
  company: 'Snowflake',
  kind: 'bevy',
  ok: true,
};

describe('adaptBevyEvents', () => {
  const events = adaptBevyEvents(bevyFixture, bevySource, NOW_MS);

  it('parses all 3 fixture rows', () => {
    expect(events).toHaveLength(3);
  });

  it('classifies the /new-york/ chapter as area "nyc"', () => {
    const ny = events.find((e) => e.title.includes('Google Cloud AI Agent Lab'));
    expect(ny?.area).toBe('nyc');
    expect(ny?.location).toBe('New York City, NY (US)');
  });

  it('classifies a "Virtual User Group Meeting" as area "online" regardless of chapter', () => {
    const virtual = events.find((e) => e.title.includes('Virtual'));
    expect(virtual?.area).toBe('online');
  });

  it('classifies a non-NYC in-person chapter (Jaipur) as "other"', () => {
    const jaipur = events.find((e) => e.title.includes('CoCo: Hands-On Lab'));
    expect(jaipur?.area).toBe('other');
  });

  it('normalizes an offset ISO start_date to a UTC instant', () => {
    const ny = events.find((e) => e.title.includes('Google Cloud AI Agent Lab'));
    // 2026-10-13T14:00:00-04:00 -> 2026-10-13T18:00:00Z
    expect(ny?.start).toBe('2026-10-13T18:00:00.000Z');
  });

  it('carries the chapter timezone through as the timezone label', () => {
    const jaipur = events.find((e) => e.title.includes('CoCo: Hands-On Lab'));
    expect(jaipur?.timezone).toBe('Asia/Kolkata');
  });

  it('uses the Bevy event detail url as-is', () => {
    const ny = events.find((e) => e.title.includes('Google Cloud AI Agent Lab'));
    expect(ny?.url).toContain('usergroups.snowflake.com/events/details/');
  });
});

describe('adaptBevyEvents error handling', () => {
  it('throws a descriptive error for invalid JSON', () => {
    expect(() => adaptBevyEvents('not json', bevySource, NOW_MS)).toThrow(/did not return valid JSON/);
  });

  it('throws a descriptive error when the body has no "results" array', () => {
    expect(() => adaptBevyEvents('{"foo":1}', bevySource, NOW_MS)).toThrow(/"results" array/);
  });
});
