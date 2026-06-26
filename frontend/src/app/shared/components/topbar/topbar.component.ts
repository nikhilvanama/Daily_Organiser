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
        <nav class="breadcrumb">
          @if (breadcrumb().section) {
            <span class="bc-dim">{{ breadcrumb().section }}</span>
            <span class="bc-sep">›</span>
          }
          @if (breadcrumb().detail) {
            <a [routerLink]="breadcrumb().pageLink" class="bc-dim bc-link">{{ breadcrumb().page }}</a>
            <span class="bc-sep">›</span>
            <span class="bc-current">{{ breadcrumb().detail }}</span>
          } @else {
            <span class="bc-current">{{ breadcrumb().page }}</span>
          }
        </nav>
      </div>

      <div class="topbar-right">
        <!-- Theme toggle -->
        <button class="tb-icon-btn" (click)="themeService.toggle()"
          [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
          @if (themeService.theme() === 'light') {
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          } @else {
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
        </button>

        <!-- Google Calendar -->
        <button class="tb-gcal" [class.gcal-on]="gcal.connected()" (click)="handleGcal()"
          [title]="gcal.connected() ? (syncing ? 'Syncing...' : 'Sync to Google Calendar') : 'Connect Google Calendar'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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

        <!-- Profile pill -->
        @if (auth.currentUser()) {
          <a routerLink="/profile" class="tb-profile" title="View profile">
            <span class="tb-avatar">{{ getUserInitial() }}</span>
            <span class="tb-name">{{ getUserName() }}</span>
            <svg class="tb-chevron" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </a>
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.5rem; height: 64px; min-height: 64px; flex-shrink: 0;
      background: var(--bg-primary); border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .breadcrumb { display: flex; align-items: center; gap: 7px; }
    .bc-dim { font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); }
    .bc-link { text-decoration: none; transition: color 0.15s; }
    .bc-link:hover { color: var(--text-primary); }
    .bc-sep { font-size: 0.8rem; color: var(--text-secondary); opacity: 0.4; }
    .bc-current { font-size: 1rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.015em; }

    .topbar-right { display: flex; align-items: center; gap: 6px; }

    /* Icon-only button */
    .tb-icon-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 9px; cursor: pointer; color: var(--text-secondary);
      transition: all 0.15s;
    }
    .tb-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border); }

    /* Google Calendar pill */
    .tb-gcal {
      display: flex; align-items: center; gap: 7px;
      height: 36px; padding: 0 12px; border-radius: 9px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      cursor: pointer; font-family: inherit; color: var(--text-secondary);
      transition: all 0.15s; white-space: nowrap;
    }
    .tb-gcal:hover { background: var(--bg-hover); color: var(--text-primary); }
    .tb-gcal.gcal-on { border-color: rgba(16,185,129,0.4); color: #10b981; background: rgba(16,185,129,0.06); }
    .tb-gcal.gcal-on:hover { background: rgba(16,185,129,0.12); }
    .gcal-label { font-size: 0.8rem; font-weight: 500; }
    .gcal-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; flex-shrink: 0; }

    .tb-sep { width: 1px; height: 20px; background: var(--border); margin: 0 4px; flex-shrink: 0; }

    /* Profile pill — looks like a menu trigger */
    .tb-profile {
      display: flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 10px 0 6px;
      border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-secondary); text-decoration: none;
      transition: all 0.15s; cursor: pointer;
    }
    .tb-profile:hover { background: var(--bg-hover); border-color: var(--border); }
    .tb-avatar {
      width: 26px; height: 26px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 7px; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.72rem; flex-shrink: 0;
    }
    .tb-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; }
    .tb-chevron { color: var(--text-secondary); flex-shrink: 0; }
  `],
})
export class TopbarComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  gcal = inject(GoogleCalendarService);
  private toast = inject(ToastService);
  private router = inject(Router);

  breadcrumb = signal(this.pathToBreadcrumb(window.location.pathname));
  syncing = false;

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.breadcrumb.set(this.pathToBreadcrumb(e.urlAfterRedirects));
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

  private pathToBreadcrumb(path: string): { section: string; page: string; pageLink?: string; detail?: string } {
    const segs = path.split('/').filter(Boolean);

    if (segs[0] === 'projects' && segs[1])
      return { section: 'Trackers', page: 'Projects', pageLink: '/projects', detail: this.unslugify(segs[1]) };
    if (segs[0] === 'goals' && segs[1])
      return { section: 'Trackers', page: 'Goals', pageLink: '/goals', detail: this.unslugify(segs[1]) };
    if (segs[0] === 'tasks' && segs[1])
      return { section: 'Overview', page: 'My Plans', pageLink: '/tasks', detail: this.unslugify(segs[1]) };

    if (path.includes('dashboard'))  return { section: 'Overview',   page: 'Dashboard' };
    if (path.includes('tasks'))      return { section: 'Overview',   page: 'My Plans' };
    if (path.includes('calendar'))   return { section: 'Overview',   page: 'Calendar' };
    if (path.includes('analytics'))  return { section: 'Overview',   page: 'Analytics' };
    if (path.includes('goals'))      return { section: 'Trackers',   page: 'Goals' };
    if (path.includes('habits'))     return { section: 'Trackers',   page: 'Daily Routine' };
    if (path.includes('journal'))    return { section: 'Trackers',   page: 'Journal' };
    if (path.includes('projects'))   return { section: 'Trackers',   page: 'Projects' };
    if (path.includes('trips'))      return { section: 'Wishlists',  page: 'Trips' };
    if (path.includes('buy-list'))   return { section: 'Wishlists',  page: 'Buy List' };
    if (path.includes('portfolio'))  return { section: 'Portfolio',  page: 'My Portfolio' };
    if (path.includes('profile'))    return { section: '',           page: 'Profile' };
    return { section: '', page: 'Daily Organizer' };
  }

  private unslugify(slug: string): string {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
