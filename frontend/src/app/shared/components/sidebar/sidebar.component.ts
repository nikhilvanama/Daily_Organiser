import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">

      <!-- Logo -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span class="logo-text">Daily Organizer</span>
        </div>
      </div>

      <!-- Scrollable nav -->
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
          <a routerLink="/projects" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><line x1="12" y1="11" x2="12" y2="15"/></svg>
            <span>Projects</span>
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

          <span class="nav-section">Portfolio</span>
          <a routerLink="/portfolio" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>My Portfolio</span>
          </a>
        </nav>
      </div>

      <!-- Fixed bottom: sign out -->
      <div class="sidebar-bottom">
        <button class="logout-btn" (click)="auth.logout()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Sign out</span>
        </button>
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

    /* Header */
    .sidebar-header { flex-shrink: 0; padding: 1rem 0.75rem 0.75rem; border-bottom: 1px solid var(--sidebar-border); }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 4px 8px; }
    .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(16,185,129,0.35); flex-shrink: 0; }
    .logo-text { color: #fff; font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }

    /* Scrollable nav */
    .sidebar-nav-area { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem 1rem; }
    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
    .nav-section { display: block; color: var(--sidebar-text-dim); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 12px 5px; }
    .nav-link { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.15s; cursor: pointer; position: relative; }
    .nav-link:hover { background: var(--sidebar-hover); color: #fff; }
    .nav-link.active { background: var(--sidebar-active-bg); color: var(--sidebar-active-text); font-weight: 600; }
    .nav-link.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--sidebar-active-text); border-radius: 0 3px 3px 0; }

    /* Fixed bottom logout */
    .sidebar-bottom { flex-shrink: 0; padding: 0.75rem; border-top: 1px solid var(--sidebar-border); }
    .logout-btn { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border-radius: 8px; background: none; border: none; color: var(--sidebar-text-dim); font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.15s; }
    .logout-btn:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
  `],
})
export class SidebarComponent {
  auth = inject(AuthService);
}
