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
        <button class="tb-btn" (click)="themeService.toggle()"
          [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
          @if (themeService.theme() === 'light') {
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          } @else {
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
        </button>

        <!-- Google Calendar button -->
        <button class="tb-gcal" [class.gcal-on]="gcal.connected()" (click)="handleGcal()"
          [title]="gcal.connected() ? (syncing ? 'Syncing...' : 'Sync to Google Calendar') : 'Connect Google Calendar'">
          <!-- Google G logo -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span class="gcal-label">{{ syncing ? 'Syncing…' : 'Calendar' }}</span>
          @if (gcal.connected()) {
            <span class="gcal-dot"></span>
          }
        </button>

        <div class="tb-sep"></div>

        <!-- User: avatar + display name -->
        @if (auth.currentUser()) {
          <a routerLink="/profile" class="tb-user" title="Profile">
            <span class="tb-avatar">{{ getUserInitial() }}</span>
            <span class="tb-name">{{ getUserName() }}</span>
          </a>
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.5rem; height: 60px; min-height: 60px; flex-shrink: 0;
      background: var(--bg-primary); border-bottom: 1px solid var(--border);
    }
    .page-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }

    .topbar-right { display: flex; align-items: center; gap: 4px; }

    /* Theme icon button */
    .tb-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; border-radius: 7px;
      color: var(--text-secondary); transition: background 0.15s, color 0.15s;
    }
    .tb-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* Google Calendar pill button */
    .tb-gcal {
      display: flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 10px; border-radius: 7px;
      background: none; border: 1px solid var(--border);
      cursor: pointer; font-family: inherit; color: var(--text-secondary);
      transition: all 0.15s; position: relative;
    }
    .tb-gcal:hover { background: var(--bg-hover); border-color: var(--border); color: var(--text-primary); }
    .tb-gcal.gcal-on { border-color: rgba(16,185,129,0.35); color: #10b981; }
    .tb-gcal.gcal-on:hover { background: rgba(16,185,129,0.08); }
    .gcal-label { font-size: 0.78rem; white-space: nowrap; }
    .gcal-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; flex-shrink: 0; }

    .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 6px; flex-shrink: 0; }

    /* User pill */
    .tb-user {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; padding: 4px 10px 4px 4px;
      border-radius: 20px; transition: background 0.15s;
    }
    .tb-user:hover { background: var(--bg-hover); }
    .tb-avatar {
      width: 28px; height: 28px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.75rem; flex-shrink: 0;
    }
    .tb-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; }
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
