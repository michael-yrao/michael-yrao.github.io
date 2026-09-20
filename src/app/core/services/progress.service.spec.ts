import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

import { ProgressService, DEFAULT_REPO, DEFAULT_BRANCH } from './progress.service';

// parseRepo is pure; the service only needs an HttpClient to construct. A no-op stub is
// enough for these tests, which cover repo-ref parsing (own repo default + ?repo override).
describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProgressService,
        { provide: HttpClient, useValue: { get: () => ({ pipe: () => ({ subscribe: () => {} }) }) } },
      ],
    });
    service = TestBed.inject(ProgressService);
  });

  it('defaults to the owner repo when no repo is given', () => {
    const ref = service.parseRepo(null);
    expect(`${ref.owner}/${ref.repo}`).toBe(DEFAULT_REPO);
    expect(ref.branch).toBe(DEFAULT_BRANCH);
  });

  it('parses owner/name', () => {
    const ref = service.parseRepo('someone/their-repo');
    expect(ref.owner).toBe('someone');
    expect(ref.repo).toBe('their-repo');
    expect(ref.branch).toBe(DEFAULT_BRANCH);
  });

  it('parses owner/name@branch', () => {
    const ref = service.parseRepo('someone/their-repo@dev');
    expect(ref.branch).toBe('dev');
  });

  it('falls back to the default on a malformed slug', () => {
    const ref = service.parseRepo('not-a-valid-slug');
    expect(`${ref.owner}/${ref.repo}`).toBe(DEFAULT_REPO);
  });
});
