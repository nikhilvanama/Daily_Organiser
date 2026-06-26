import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">{{ title() }}</h1>
      </div>

      <div class="topbar-right">
        <!-- Theme toggle -->
        <button class="tb-btn" (click)="themeService.toggle()" [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
          @if (themeService.theme() === 'light') {
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          } @else {
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
        </button>

        <!-- Google Calendar -->
        <button class="tb-btn" [class.gcal-on]="gcal.connected()" (click)="handleGcal()"
          [title]="gcal.connected() ? (syncing ? 'Syncing...' : 'Sync to Google Calendar') : 'Connect Google Calendar'">
          <span class="gcal-wrap">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            @if (gcal.connected()) {
              <span class="gcal-dot"></span>
            }
          </span>
        </button>

        <div class="tb-sep"></div>

        <!-- User avatar + logout -->
        @if (auth.currentUser()) {
          <a routerLink="/profile" class="tb-avatar" [title]="getUserName()">
            {{ getUserInitial() }}
          </a>
          <button class="tb-btn tb-logout" (click)="auth.logout()" title="Sign out">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.5rem; height: 52px; min-height: 52px; flex-shrink: 0;
      background: var(--bg-primary); border-bottom: 1px solid var(--border);
    }
    .page-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }

    .topbar-right { display: flex; align-items: center; gap: 2px; }

    .tb-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; border-radius: 7px;
      color: var(--text-secondary); transition: background 0.15s, color 0.15s;
    }
    .tb-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .tb-btn.gcal-on { color: #10b981; }
    .tb-btn.gcal-on:hover { background: rgba(16,185,129,0.1); }
    .tb-btn.tb-logout:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

    .gcal-wrap { position: relative; display: flex; }
    .gcal-dot {
      position: absolute; top: -2px; right: -2px;
      width: 6px; height: 6px; background: #10b981; border-radius: 50%;
      border: 1.5px solid var(--bg-primary);
    }

    .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 6px; }

    .tb-avatar {
      width: 30px; height: 30px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.78rem; text-decoration: none;
      transition: opacity 0.15s; flex-shrink: 0;
    }
    .tb-avatar:hover { opacity: 0.85; }
  `],
})
export class TopbarComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  gcal = inject(GoogleCalendarService);
  private toast = inject(ToastService);
  private router = inject(Router);

  title = signal(this.pathToTitle(window.location.pathname));
  syncing = false;

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.title.set(this.pathToTitle(e.urlAfterRedirects));
    });
  }

  ngOnInit() {
    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe();
    }
    this.gcal.checkStatus().subscribe();
  }

  handleGcal() {
    if (this.gcal.connected()) {
      if (this.syncing) return;
      this.syncing = true;
      this.gcal.syncAll().subscribe({
        next: (res) => {
          this.syncing = false;
          if (res.synced > 0) this.toast.success(`Synced ${res.synced} plan(s) to Google Calendar`);
          else this.toast.info('All plans are already synced');
        },
        error: () => { this.syncing = false; this.toast.error('Sync failed'); },
      });
    } else {
      this.gcal.connect();
    }
  }

  getUserInitial(): string {
    const u = this.auth.currentUser();
    return (u?.displayName ?? u?.username ?? 'U')[0].toUpperCase();
  }

  getUserName(): string {
    const u = this.auth.currentUser();
    return u?.displayName ?? u?.username ?? 'User';
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
