import { Injectable, signal } from '@angular/core';

// Modules the user may show/hide in the sidebar. Dashboard and Profile are
// intentionally NOT here: Dashboard is the app's home and Profile is where
// the toggles live — hiding either would lock the user out of them.
export interface SidebarModule {
  id: string;     // also the route path
  label: string;
  section: 'Overview' | 'Trackers' | 'Wishlists';
}

export const SIDEBAR_MODULES: SidebarModule[] = [
  { id: 'tasks',     label: 'My Plans',      section: 'Overview' },
  { id: 'calendar',  label: 'Calendar',      section: 'Overview' },
  { id: 'analytics', label: 'Analytics',     section: 'Overview' },
  { id: 'goals',     label: 'Goals',         section: 'Trackers' },
  { id: 'habits',    label: 'Daily Routine', section: 'Trackers' },
  { id: 'journal',   label: 'Journal',       section: 'Trackers' },
  { id: 'projects',  label: 'Projects',      section: 'Trackers' },
  { id: 'trips',     label: 'Trips',         section: 'Wishlists' },
  { id: 'buy-list',  label: 'Buy List',      section: 'Wishlists' },
];

// SidebarPrefsService — which modules appear in the sidebar. Persisted per
// device in localStorage (same pattern as ThemeService). Hiding a module only
// hides the nav link; its route stays reachable by URL and from other pages.
@Injectable({ providedIn: 'root' })
export class SidebarPrefsService {
  private readonly KEY = 'tf_hidden_modules';

  // Set of hidden module ids — components read this signal to react instantly.
  hidden = signal<ReadonlySet<string>>(new Set());

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY) ?? '[]');
      if (Array.isArray(saved)) {
        const valid = saved.filter((id) => SIDEBAR_MODULES.some((m) => m.id === id));
        this.hidden.set(new Set(valid));
      }
    } catch { /* corrupt value — fall back to everything visible */ }
  }

  visible(id: string): boolean {
    return !this.hidden().has(id);
  }

  // True when at least one module of the section is visible — used to hide
  // a section header whose links are all switched off.
  sectionVisible(section: SidebarModule['section']): boolean {
    return SIDEBAR_MODULES.some((m) => m.section === section && this.visible(m.id));
  }

  toggle(id: string) {
    const next = new Set(this.hidden());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.hidden.set(next);
    localStorage.setItem(this.KEY, JSON.stringify([...next]));
  }
}
