import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">

      <!-- ═══ FIXED HEADER: logo + user + quick actions ═══ -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span class="logo-text">Daily Organizer</span>
        </div>

        <!-- User block -->
        <div class="user-block">
          <a routerLink="/profile" class="user-link">
            <div class="user-avatar">{{ getUserInitial() }}</div>
            <div class="user-info">
              <span class="user-name">{{ getUserName() }}</span>
              <span class="user-email">{{ auth.currentUser()?.email ?? '' }}</span>
            </div>
          </a>
          <button class="logout-icon" (click)="auth.logout()" title="Sign out">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <!-- Quick actions: theme + Google Calendar -->
        <div class="quick-actions">
          <button class="theme-btn" (click)="themeService.toggle()">
            @if (themeService.theme() === 'light') {
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              <span>Dark mode</span>
            } @else {
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <span>Light mode</span>
            }
          </button>

          @if (gcalService.connected()) {
            <div class="gcal-connected">
              <button class="gcal-btn connected" (click)="syncAllToCalendar()">
                <svg width="14" height="14" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="gcal-text">{{ syncing ? 'Syncing...' : 'Google Calendar' }}</span>
                <span class="gcal-sync-hint">Sync All</span>
              </button>
              <button class="gcal-disconnect" (click)="handleGoogleCalendar()" title="Disconnect">
                <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          } @else {
            <button class="gcal-btn" (click)="handleGoogleCalendar()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span class="gcal-text">Connect Google Calendar</span>
            </button>
          }
        </div>

        <div class="header-divider"></div>
      </div>

      <!-- ═══ SCROLLABLE NAV ═══ -->
      <div class="sidebar-nav-area">
        <nav class="sidebar-nav">
          <span class="nav-section">Overview</span>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
          <a routerLink="/tasks" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>My Plans</span>
          </a>
          <a routerLink="/calendar" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <span>Calendar</span>
          </a>
          <a routerLink="/analytics" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Analytics</span>
          </a>

          <span class="nav-section">Trackers</span>
          <a routerLink="/goals" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span>Goals</span>
          </a>
          <a routerLink="/habits" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Daily Routine</span>
          </a>
          <a routerLink="/journal" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            <span>Journal</span>
          </a>

          <span class="nav-section">Wishlists</span>
          <a routerLink="/trips" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
            <span>Trips</span>
          </a>
          <a routerLink="/buy-list" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>
            <span>Buy List</span>
          </a>

          <span class="nav-section">Freelance</span>
          <a routerLink="/projects" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><line x1="12" y1="11" x2="12" y2="15"/></svg>
            <span>Projects</span>
          </a>

          <span class="nav-section">Portfolio</span>
          <a routerLink="/portfolio" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>My Portfolio</span>
          </a>
        </nav>
      </div>

    </aside>
  `,
  styles: [`
    :host { display: flex; height: 100vh; flex-shrink: 0;
      --sidebar-bg: #111318; --sidebar-border: rgba(255,255,255,0.06); --sidebar-text: #b0b4bc;
      --sidebar-text-dim: #6b7280; --sidebar-hover: rgba(255,255,255,0.05);
      --sidebar-active-bg: rgba(16,185,129,0.12); --sidebar-active-text: #34d399;
    }
    :host-context([data-theme="dark"]) {
      --sidebar-bg: #09090b; --sidebar-border: #1a1a1e; --sidebar-text: #a1a1aa;
      --sidebar-text-dim: #52525b; --sidebar-hover: rgba(255,255,255,0.04);
      --sidebar-active-bg: rgba(52,211,153,0.1); --sidebar-active-text: #6ee7b7;
    }

    .sidebar { width: 250px; min-width: 250px; height: 100vh; background: var(--sidebar-bg); display: flex; flex-direction: column; border-right: 1px solid var(--sidebar-border); overflow: hidden; }

    /* ── Fixed header ── */
    .sidebar-header { flex-shrink: 0; padding: 1rem 0.75rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 4px 8px 4px; }
    .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(16,185,129,0.35); flex-shrink: 0; }
    .logo-text { color: #fff; font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }

    /* User block */
    .user-block { display: flex; align-items: center; gap: 4px; padding: 7px 8px; border-radius: 10px; background: var(--sidebar-hover); }
    .user-link { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; text-decoration: none; border-radius: 6px; padding: 2px; transition: opacity 0.15s; }
    .user-link:hover { opacity: 0.8; }
    .user-avatar { width: 30px; height: 30px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.78rem; flex-shrink: 0; }
    .user-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .user-name { color: #fff; font-size: 0.78rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { color: var(--sidebar-text-dim); font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .logout-icon { background: none; border: none; color: var(--sidebar-text-dim); cursor: pointer; padding: 5px; border-radius: 6px; display: flex; transition: all 0.15s; flex-shrink: 0; }
    .logout-icon:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

    /* Quick actions */
    .quick-actions { display: flex; flex-direction: column; gap: 3px; }
    .theme-btn { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.78rem; background: var(--sidebar-hover); border: none; cursor: pointer; width: 100%; transition: all 0.15s; font-family: inherit; }
    .theme-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .gcal-btn { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.78rem; background: transparent; border: 1px dashed var(--sidebar-border); cursor: pointer; width: 100%; transition: all 0.15s; font-family: inherit; }
    .gcal-btn:hover { border-color: var(--sidebar-active-text); color: var(--sidebar-active-text); background: var(--sidebar-hover); }
    .gcal-btn.connected { border-style: solid; border-color: rgba(16,185,129,0.3); }
    .gcal-text { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gcal-sync-hint { font-size: 0.62rem; color: var(--sidebar-text-dim); opacity: 0; transition: opacity 0.15s; }
    .gcal-btn:hover .gcal-sync-hint { opacity: 1; }
    .gcal-connected { display: flex; gap: 4px; }
    .gcal-connected .gcal-btn { flex: 1; min-width: 0; }
    .gcal-disconnect { background: transparent; border: 1px solid var(--sidebar-border); border-radius: 8px; color: var(--sidebar-text-dim); cursor: pointer; padding: 4px 5px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
    .gcal-disconnect:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
    .header-divider { height: 1px; background: var(--sidebar-border); margin: 0.5rem -0.75rem 0; }

    /* ── Scrollable nav ── */
    .sidebar-nav-area { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem 1rem; }
    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
    .nav-section { display: block; color: var(--sidebar-text-dim); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 12px 5px; }
    .nav-link { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.15s; cursor: pointer; position: relative; }
    .nav-link:hover { background: var(--sidebar-hover); color: #fff; }
    .nav-link.active { background: var(--sidebar-active-bg); color: var(--sidebar-active-text); font-weight: 600; }
    .nav-link.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--sidebar-active-text); border-radius: 0 3px 3px 0; }
  `],
})
export class SidebarComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  gcalService = inject(GoogleCalendarService);
  private toast = inject(ToastService);

  ngOnInit() {
    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe();
    }
    this.gcalService.checkStatus().subscribe();
  }

  syncing = false;

  handleGoogleCalendar() {
    if (this.gcalService.connected()) {
      if (confirm('Disconnect Google Calendar?')) {
        this.gcalService.disconnect().subscribe({
          next: () => this.toast.success('Google Calendar disconnected'),
        });
      }
    } else {
      this.gcalService.connect();
    }
  }

  syncAllToCalendar() {
    if (this.syncing) return;
    this.syncing = true;
    this.gcalService.syncAll().subscribe({
      next: (res) => {
        this.syncing = false;
        if (res.synced > 0) {
          this.toast.success(`Synced ${res.synced} plan(s) to Google Calendar`);
        } else {
          this.toast.info('All plans are already synced');
        }
      },
      error: () => { this.syncing = false; this.toast.error('Sync failed'); },
    });
  }

  getUserInitial(): string {
    const user = this.auth.currentUser();
    return (user?.displayName ?? user?.username ?? 'U')[0].toUpperCase();
  }

  getUserName(): string {
    const user = this.auth.currentUser();
    return user?.displayName ?? user?.username ?? 'User';
  }
}
