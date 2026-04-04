// Import Injectable for DI registration and signal for reactive theme state
import { Injectable, signal } from '@angular/core';

// Theme type — the app supports two visual modes toggled via the sidebar button
export type Theme = 'light' | 'dark';

// ThemeService manages the dark/light theme for the entire Daily Organizer app.
// It persists the user's preference in localStorage and applies it via a
// data-theme attribute on <html>, which CSS custom properties reference
// (see styles.css :root and [data-theme="dark"] selectors).
@Injectable({ providedIn: 'root' }) // Singleton — shared across all components
export class ThemeService {
  // localStorage key for persisting the selected theme across browser sessions
  private readonly STORAGE_KEY = 'tf_theme';
  // Reactive signal holding the current theme — components read this to show the correct toggle icon
  theme = signal<Theme>('light');

  constructor() {
    // On service initialization, check if the user previously saved a theme preference
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    // If no saved preference, respect the OS-level dark mode setting via media query
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    // Apply whichever theme was found (saved preference takes priority over OS default)
    this.applyTheme(saved ?? preferred);
  }

  // Toggle between light and dark themes — called by the sidebar theme button
  toggle() {
    this.applyTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  // Apply a specific theme: update the signal, set the HTML attribute for CSS,
  // and persist the choice to localStorage so it survives page reloads.
  private applyTheme(t: Theme) {
    this.theme.set(t); // Update the reactive signal so components re-render
    document.documentElement.setAttribute('data-theme', t); // Triggers CSS variable swap (light/dark)
    localStorage.setItem(this.STORAGE_KEY, t); // Persist for next visit
  }
}
