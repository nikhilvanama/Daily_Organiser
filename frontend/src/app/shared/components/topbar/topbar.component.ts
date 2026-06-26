import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">{{ title() }}</h1>
      </div>
      <div class="topbar-right">
        @if (auth.currentUser()) {
          <div class="topbar-avatar" title="{{ auth.currentUser()?.displayName ?? auth.currentUser()?.email }}">
            {{ (auth.currentUser()?.displayName ?? auth.currentUser()?.username ?? 'U')[0].toUpperCase() }}
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.75rem; height: 52px; min-height: 52px; flex-shrink: 0;
      background: var(--bg-primary); border-bottom: 1px solid var(--border);
    }
    .page-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }
    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }
    .topbar-avatar {
      width: 30px; height: 30px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.8rem; cursor: default;
    }
  `],
})
export class TopbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  title = signal(this.pathToTitle(window.location.pathname));

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.title.set(this.pathToTitle(e.urlAfterRedirects));
    });
  }

  private pathToTitle(path: string): string {
    if (path.includes('dashboard'))  return 'Dashboard';
    if (path.includes('tasks'))      return 'My Plans';
    if (path.includes('goals'))      return 'Goals';
    if (path.includes('habits'))     return 'Daily Routine';
    if (path.includes('journal'))    return 'Journal';
    if (path.includes('projects'))   return 'Projects';
    if (path.includes('trips'))      return 'Trips';
    if (path.includes('buy-list'))   return 'Buy List';
    if (path.includes('analytics'))  return 'Analytics';
    if (path.includes('calendar'))   return 'Calendar';
    if (path.includes('portfolio'))  return 'My Portfolio';
    if (path.includes('profile'))    return 'Profile';
    return 'Daily Organizer';
  }
}
