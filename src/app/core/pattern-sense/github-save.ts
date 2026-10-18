import { InjectionToken } from '@angular/core';

import { PATTERN_SENSE_GITHUB_APP } from '../data/site-links';
import { RepoRef } from '../services/github-file.service';

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_';
const RESULTS_DIR = 'dashboard/pattern_sense_results';
const RESULTS_SCHEMA_VERSION = 1;

export interface PatternSenseGithubApp {
  readonly clientId: string;
  readonly appSlug: string;
}

/** The GitHub App config; specs provide a real-looking one. */
export const GITHUB_APP_CONFIG = new InjectionToken<PatternSenseGithubApp>('GITHUB_APP_CONFIG', {
  factory: () => PATTERN_SENSE_GITHUB_APP,
});

/** Sign-in is on only once every value has been replaced by the registered app's. */
export function isGithubAppEnabled(config: PatternSenseGithubApp): boolean {
  return Object.values(config).every((value) => !value.startsWith(PLACEHOLDER_PREFIX));
}

/** `2026-11-30` → `dashboard/pattern_sense_results/20261130.json`. */
export function resultsPath(week: string): string {
  return `${RESULTS_DIR}/${week.replaceAll('-', '')}.json`;
}

export function buildResults(week: string, vocabulary: string, code: string, submittedAt: Date) {
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    week,
    vocabulary,
    code,
    submittedAt: submittedAt.toISOString(),
  };
}

/** `owner/name@branch` — the one spelling the pending sign-in stores and `parseRepoSlug` reads. */
export function repoSlugWithBranch(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}@${ref.branch}`;
}
