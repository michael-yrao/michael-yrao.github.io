import type { EventSource } from './contract';

// The ONE curated list of event feeds this worker polls. The Angular app never duplicates
// this list; it reads the chips it needs from `EventsFeed.sources` in the served payload.
//
// The public `EventSource` contract type carries no `url` (upstream feed URLs are an internal
// fetch detail, not part of the served API) -- `FeedSourceConfig` adds it back for our own use.
// aggregate.ts strips `url` back off before echoing a source into the response.
export type FeedSourceConfig = Omit<EventSource, 'ok' | 'count' | 'error'> & { url: string };

const SOURCE_CONFIGS: readonly FeedSourceConfig[] = [
  {
    id: 'aws-nyc',
    label: 'AWS New York (official)',
    company: 'AWS',
    kind: 'ical',
    url: 'https://www.meetup.com/aws-nyc/events/ical/',
    area: 'nyc',
  },
  {
    id: 'aws-newyork',
    label: 'NYC AWS User Group',
    company: 'AWS',
    kind: 'ical',
    url: 'https://www.meetup.com/awsnewyork/events/ical/',
    area: 'nyc',
  },
  {
    id: 'snowflake-nyc-meetup',
    label: 'NYC Snowflake User Group',
    company: 'Snowflake',
    kind: 'ical',
    url: 'https://www.meetup.com/new-york-snowflake-user-group/events/ical/',
    area: 'nyc',
  },
  {
    id: 'datadog-luma',
    label: 'Datadog',
    company: 'Datadog',
    kind: 'ical',
    // Global calendar (SF, Amsterdam, NYC, online, ...) -- never pinned to an area.
    url: 'https://api.lu.ma/ics/get?entity=calendar&id=cal-58UTRXnfpeEA6ii',
  },
  {
    id: 'snowflake-bevy',
    label: 'Snowflake User Groups',
    company: 'Snowflake',
    kind: 'bevy',
    // Returns every chapter worldwide -- never pinned; the worker filters by area itself.
    url: 'https://usergroups.snowflake.com/api/search/?result_types=upcoming_event',
  },
];

export const SOURCES: readonly FeedSourceConfig[] = SOURCE_CONFIGS;
