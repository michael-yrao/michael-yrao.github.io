import { ApplicationConfig, ErrorHandler } from '@angular/core';
import {
  NavigationError,
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { AppTitleStrategy } from './app-title.strategy';
import { routes } from './app.routes';
import { ChunkAwareErrorHandler } from './core/app/chunk-aware-error-handler';
import { isChunkLoadError, readChunkReload, reloadTo, shouldReload } from './core/app/chunk-reload';

/** A stale lazy chunk after a deploy: reload the target route on the new build. */
function reloadOnStaleChunk(error: NavigationError): void {
  const target = location.origin + error.url;
  if (isChunkLoadError(error.error) && shouldReload(target, readChunkReload(), Date.now())) {
    reloadTo(target);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withNavigationErrorHandler(reloadOnStaleChunk),
    ),
    { provide: ErrorHandler, useClass: ChunkAwareErrorHandler },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // The progress dashboard fetches progress.json from a public repo's raw content.
    provideHttpClient(withFetch()),
  ],
};
