import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';

import { AppTitleStrategy, PAGE_DESCRIPTIONS, SITE_NAME } from './app-title.strategy';

const INDEX_DESCRIPTION = 'index.html default description';
const NO_PAGE_TITLE = 'A Title With No Description Entry';

interface Case {
  readonly name: string;
  readonly url: string;
  readonly routeTitle: string | undefined;
  readonly expectedTitle: string;
  readonly expectedDescription: string;
}

const CASES: readonly Case[] = [
  {
    name: 'route title and a description entry for its first segment: suffixed title, description swapped',
    url: '/quiz?x=2',
    routeTitle: 'Quiz',
    expectedTitle: `Quiz · ${SITE_NAME}`,
    expectedDescription: PAGE_DESCRIPTIONS['quiz'],
  },
  {
    name: 'route title without a description entry: suffixed title, index default kept',
    url: '/algorithms/two-sum',
    routeTitle: NO_PAGE_TITLE,
    expectedTitle: `${NO_PAGE_TITLE} · ${SITE_NAME}`,
    expectedDescription: INDEX_DESCRIPTION,
  },
  {
    name: 'no route title: bare site name, index default kept',
    url: '/algorithms/two-sum',
    routeTitle: undefined,
    expectedTitle: SITE_NAME,
    expectedDescription: INDEX_DESCRIPTION,
  },
];

describe('AppTitleStrategy', () => {
  beforeEach(() => {
    document.head.querySelector('meta[name="description"]')?.remove();
    const tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    tag.setAttribute('content', INDEX_DESCRIPTION);
    document.head.appendChild(tag);
  });

  it.each(CASES)('$name', ({ url, routeTitle, expectedTitle, expectedDescription }) => {
    const strategy = TestBed.inject(AppTitleStrategy);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue(routeTitle);

    strategy.updateTitle({ url } as RouterStateSnapshot);

    expect(TestBed.inject(Title).getTitle()).toBe(expectedTitle);
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe(expectedDescription);
  });
});
