import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

// After a new deploy the browser may have stale chunk hashes cached.
// Reload once automatically so the fresh runtime takes over.
window.addEventListener('error', (event) => {
  if (event.message?.includes('ChunkLoadError') || event.message?.includes('Loading chunk')) {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }
});
