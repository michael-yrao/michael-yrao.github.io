import { Injectable } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'po-theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#0f172a', light: '#f1f5f9' };

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme: Theme = 'dark';

  constructor() {
    // index.html applies the saved theme pre-boot to avoid a flash;
    // here we just sync the service state with it.
    this.theme = localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    this.apply();
  }

  toggle(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, this.theme);
    this.apply();
  }

  private apply(): void {
    document.documentElement.dataset['theme'] = this.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[this.theme]);
  }
}
