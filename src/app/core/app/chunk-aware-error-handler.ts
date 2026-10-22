import { ErrorHandler, Injectable } from '@angular/core';

import { isChunkLoadError, readChunkReload, reloadTo, shouldReload } from './chunk-reload';

/** Angular's default handling, plus a reload when a lazy chunk (e.g. a `@defer` block) is stale. */
@Injectable()
export class ChunkAwareErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    super.handleError(error);
    if (isChunkLoadError(error) && shouldReload(location.href, readChunkReload(), Date.now())) {
      reloadTo(location.href);
    }
  }
}
