// Import Injectable for DI registration and signal for reactive theme state
import { Injectable, signal } from '@angular/core';

// Theme type — light, dark, and "paper" (a warm cream planner-notebook look)
export type Theme = 'light' | 'dark' | 'paper';
export const THEMES: Theme[] = ['light', 'dark', 'paper'];

// An accent (primary color) choice. Each palette carries separate shades for the
// light and dark themes because dark surfaces need a lighter tint for contrast —
// mirroring how styles.css defines emerald differently per theme.
export interface AccentOption {
  id: string;
  label: string;
  light: { accent: string; hover: string; tint: string };
  dark: { accent: string; hover: string; tint: string };
  // Paper theme gets its own set: deeper, warmer, slightly muted tones that
  // sit well on cream instead of the saturated screen colors.
  paper: { accent: string; hover: string; tint: string };
}

// The selectable primary colors shown on the Profile → Appearance section.
// 'emerald' matches the stylesheet defaults and is the fallback.
export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'emerald', label: 'Emerald', light: { accent: '#10b981', hover: '#059669', tint: '#ecfdf5' }, dark: { accent: '#34d399', hover: '#10b981', tint: '#022c22' }, paper: { accent: '#1a8a60', hover: '#116b49', tint: '#e2f0e7' } },
  { id: 'blue',    label: 'Blue',    light: { accent: '#3b82f6', hover: '#2563eb', tint: '#eff6ff' }, dark: { accent: '#60a5fa', hover: '#3b82f6', tint: '#172554' }, paper: { accent: '#3a63b8', hover: '#2e4f96', tint: '#e6ebf5' } },
  { id: 'violet',  label: 'Violet',  light: { accent: '#8b5cf6', hover: '#7c3aed', tint: '#f5f3ff' }, dark: { accent: '#a78bfa', hover: '#8b5cf6', tint: '#2e1065' }, paper: { accent: '#7551c2', hover: '#5f3fa6', tint: '#ede8f6' } },
  { id: 'orange',  label: 'Orange',  light: { accent: '#f97316', hover: '#ea580c', tint: '#fff7ed' }, dark: { accent: '#fb923c', hover: '#f97316', tint: '#431407' }, paper: { accent: '#c2600e', hover: '#9e4d0a', tint: '#f7ebdc' } },
  { id: 'rose',    label: 'Rose',    light: { accent: '#f43f5e', hover: '#e11d48', tint: '#fff1f2' }, dark: { accent: '#fb7185', hover: '#f43f5e', tint: '#4c0519' }, paper: { accent: '#c13a52', hover: '#a02940', tint: '#f6e6e8' } },
  { id: 'cyan',    label: 'Cyan',    light: { accent: '#06b6d4', hover: '#0891b2', tint: '#ecfeff' }, dark: { accent: '#22d3ee', hover: '#06b6d4', tint: '#083344' }, paper: { accent: '#0e7f8c', hover: '#0a6470', tint: '#e2eff1' } },
];

// ThemeService manages the dark/light theme AND the accent (primary) color for the app.
// Both are persisted in localStorage. The theme is applied via a data-theme attribute
// on <html> (styles.css swaps its CSS variables on that attribute); the accent is
// applied as inline CSS custom properties on <html>, which override the stylesheet
// defaults for --accent and its derived shades.
@Injectable({ providedIn: 'root' }) // Singleton — shared across all components
export class ThemeService {
  private readonly STORAGE_KEY = 'tf_theme';
  private readonly ACCENT_KEY = 'tf_accent';

  // Reactive signals — components read these to show the correct active states
  theme = signal<Theme>('light');
  accent = signal<string>('emerald');

  constructor() {
    // Restore saved accent first so the first applyTheme() paints the right colors
    const savedAccent = localStorage.getItem(this.ACCENT_KEY);
    if (savedAccent && ACCENT_OPTIONS.some((a) => a.id === savedAccent)) {
      this.accent.set(savedAccent);
    }
    // Saved theme preference takes priority over the OS-level dark mode setting
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.applyTheme(saved && THEMES.includes(saved) ? saved : preferred);
  }

  // Cycle light → dark → paper → light — called by the topbar theme button
  toggle() {
    const next = THEMES[(THEMES.indexOf(this.theme()) + 1) % THEMES.length];
    this.applyTheme(next);
  }

  // Explicitly select a theme — called by the Profile → Appearance theme cards
  setTheme(t: Theme) {
    this.applyTheme(t);
  }

  // Select a primary color — called by the Profile → Appearance color swatches
  setAccent(id: string) {
    if (!ACCENT_OPTIONS.some((a) => a.id === id)) return;
    this.accent.set(id);
    localStorage.setItem(this.ACCENT_KEY, id);
    this.applyAccentVars();
  }

  // Apply a specific theme: update the signal, set the HTML attribute for CSS,
  // persist the choice, and re-apply the accent (its shades differ per theme).
  private applyTheme(t: Theme) {
    this.theme.set(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(this.STORAGE_KEY, t);
    this.applyAccentVars();
  }

  // Write the accent variables inline on <html>. Inline custom properties win over
  // both :root and [data-theme="dark"] stylesheet blocks, so this cleanly retints
  // every component that uses var(--accent*) without touching styles.css.
  private applyAccentVars() {
    const option = ACCENT_OPTIONS.find((a) => a.id === this.accent()) ?? ACCENT_OPTIONS[0];
    const t = this.theme();
    const shades = t === 'dark' ? option.dark : t === 'paper' ? option.paper : option.light;
    const rgb = this.hexToRgb(shades.accent);
    const style = document.documentElement.style;
    style.setProperty('--accent', shades.accent);
    style.setProperty('--accent-hover', shades.hover);
    style.setProperty('--accent-light', shades.tint);
    style.setProperty('--accent-subtle', `rgba(${rgb}, 0.1)`);
    style.setProperty('--accent-glow', `rgba(${rgb}, ${this.theme() === 'dark' ? 0.3 : 0.4})`);
  }

  // '#10b981' → '16, 185, 129' for building rgba() strings
  private hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
  }
}
