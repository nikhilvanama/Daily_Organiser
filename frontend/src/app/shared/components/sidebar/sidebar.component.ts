import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarPrefsService } from '../../../core/services/sidebar-prefs.service';

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

      <!-- Scrollable nav — custom duotone icon set: 1.7 stroke + soft filled detail -->
      <div class="sidebar-nav-area">
        <nav class="sidebar-nav">
          <span class="nav-section">Overview</span>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.8 12 4l8 6.8V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z"/><path d="M9.6 20.6v-5.4a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v5.4" fill="currentColor" opacity=".3" stroke="none"/><path d="M9.6 20.6v-5.4a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v5.4"/></svg>
            <span>Dashboard</span>
          </a>
          @if (prefs.visible('tasks')) {
            <a routerLink="/tasks" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="4" width="15" height="17" rx="2.6"/><path d="M9 2.6h6a1.4 1.4 0 0 1 1.4 1.4v.6A1.4 1.4 0 0 1 15 6H9a1.4 1.4 0 0 1-1.4-1.4V4A1.4 1.4 0 0 1 9 2.6z" fill="currentColor" opacity=".3"/><path d="M8.6 12h6.8M8.6 15.6h4.2"/><path d="m14.6 17.6 1.5 1.5 2.6-2.8"/></svg>
              <span>My Plans</span>
            </a>
          }
          @if (prefs.visible('calendar')) {
            <a routerLink="/calendar" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.6" y="5" width="16.8" height="15.4" rx="2.8"/><path d="M8 2.8v3.6M16 2.8v3.6M3.9 9.8h16.2"/><rect x="7" y="12.6" width="4.2" height="4.2" rx="1.2" fill="currentColor" opacity=".35" stroke="none"/></svg>
              <span>Calendar</span>
            </a>
          }
          @if (prefs.visible('analytics')) {
            <a routerLink="/analytics" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5.2 20.4v-6.2M18.8 20.4v-9.6"/><rect x="9.9" y="3.6" width="4.2" height="16.8" rx="2.1" fill="currentColor" opacity=".3" stroke="none"/><path d="M12 20.4V3.6"/></svg>
              <span>Analytics</span>
            </a>
          }

          @if (prefs.sectionVisible('Trackers')) {
            <span class="nav-section">Trackers</span>
          }
          @if (prefs.visible('goals')) {
            <a routerLink="/goals" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8" opacity=".55"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/></svg>
              <span>Goals</span>
            </a>
          }
          @if (prefs.visible('habits')) {
            <a routerLink="/habits" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 12 12 7.2" /><path d="m12 12 3.4 2.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M12 3.4v1M20.6 12h-1M12 20.6v-1M3.4 12h1" opacity=".55"/></svg>
              <span>Daily Routine</span>
            </a>
          }
          @if (prefs.visible('journal')) {
            <a routerLink="/journal" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.2C10.8 4.9 9 4.2 6.8 4.2c-1.2 0-2.3.2-3.2.6v14.4c.9-.4 2-.6 3.2-.6 2.2 0 4 .7 5.2 2 1.2-1.3 3-2 5.2-2 1.2 0 2.3.2 3.2.6V4.8c-.9-.4-2-.6-3.2-.6-2.2 0-4 .7-5.2 2z"/><path d="M12 6.2v14.4" opacity=".55"/><path d="M15.4 4.6v6l1.8-1.3 1.8 1.3v-5.4" fill="currentColor" opacity=".3" stroke="none"/></svg>
              <span>Journal</span>
            </a>
          }
          @if (prefs.visible('projects')) {
            <a routerLink="/projects" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="7.6" width="17.2" height="12.8" rx="2.6"/><path d="M9 7.4V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.6" /><path d="M3.6 12.6c2.6 1.1 5.5 1.7 8.4 1.7s5.8-.6 8.4-1.7" opacity=".55"/><rect x="10.4" y="12.4" width="3.2" height="2.8" rx=".9" fill="currentColor" opacity=".35" stroke="none"/></svg>
              <span>Projects</span>
            </a>
          }

          @if (prefs.sectionVisible('Wishlists')) {
            <span class="nav-section">Wishlists</span>
          }
          @if (prefs.visible('trips')) {
            <a routerLink="/trips" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 3.2 3.4 10l5.2 2.6L10 18.6l3-4.2 5 2.4z"/><path d="M8.6 12.6 20.8 3.2l-7.8 11.2z" fill="currentColor" opacity=".3" stroke="none"/></svg>
              <span>Trips</span>
            </a>
          }
          @if (prefs.visible('buy-list')) {
            <a routerLink="/buy-list" routerLinkActive="active" class="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-.9 11a2 2 0 0 1-2 1.8H7.9a2 2 0 0 1-2-1.8z"/><path d="M5.6 8h12.8l-.3 3.4H5.9z" fill="currentColor" opacity=".25" stroke="none"/><path d="M8.6 10.6V6.4a3.4 3.4 0 0 1 6.8 0v4.2"/></svg>
              <span>Buy List</span>
            </a>
          }

          <span class="nav-section">Account</span>
          <a routerLink="/profile" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="7.8" r="3.6"/><circle cx="12" cy="7.8" r="1.6" fill="currentColor" opacity=".3" stroke="none"/><path d="M4.8 20.4c.8-3.6 3.8-5.7 7.2-5.7s6.4 2.1 7.2 5.7"/></svg>
            <span>Profile</span>
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
    /* Light theme (default): a light sidebar that matches the rest of the page.
       100dvh (dynamic viewport) keeps the Sign out button on-screen on mobile,
       where the browser chrome makes 100vh taller than what's actually visible. */
    :host { display: flex; height: 100vh; height: 100dvh; flex-shrink: 0;
      --sidebar-bg: #ffffff; --sidebar-border: #e5e7eb; --sidebar-text: #52525b;
      --sidebar-text-dim: #a1a1aa; --sidebar-hover: rgba(0,0,0,0.045);
      --sidebar-text-strong: #111827; --sidebar-logo-text: #111827;
      --sidebar-hover-border: rgba(0,0,0,0.08);
    }
    :host-context([data-theme="dark"]) {
      --sidebar-bg: #09090b; --sidebar-border: #1a1a1e; --sidebar-text: #a1a1aa;
      --sidebar-text-dim: #52525b; --sidebar-hover: rgba(255,255,255,0.04);
      --sidebar-text-strong: #e2e8f0; --sidebar-logo-text: #ffffff;
      --sidebar-hover-border: rgba(255,255,255,0.08);
    }
    :host-context([data-theme="paper"]) {
      --sidebar-bg: #f7f1e4; --sidebar-border: #e4dac6; --sidebar-text: #71675a;
      --sidebar-text-dim: #a89c89; --sidebar-hover: rgba(120,90,40,0.06);
      --sidebar-text-strong: #3b332b; --sidebar-logo-text: #3b332b;
      --sidebar-hover-border: rgba(120,90,40,0.14);
    }

    .sidebar { width: 212px; min-width: 212px; height: 100vh; height: 100dvh; background: var(--sidebar-bg); display: flex; flex-direction: column; border-right: 1px solid var(--sidebar-border); overflow: hidden; }

    /* Header — height matches topbar (44px) */
    .sidebar-header { flex-shrink: 0; height: 44px; display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid var(--sidebar-border); }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
    .logo-icon { width: 30px; height: 30px; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); border-radius: 9px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px var(--accent-glow); flex-shrink: 0; }
    .logo-text { color: var(--sidebar-logo-text); font-weight: 700; font-size: 0.82rem; letter-spacing: -0.01em; white-space: nowrap; }

    /* Nav area: compact enough to fit every item without scrolling on normal
       desktop heights; if a short window ever overflows, it scrolls invisibly */
    .sidebar-nav-area { flex: 1; overflow-y: auto; padding: 0.2rem 0.75rem 0.6rem; scrollbar-width: none; }
    .sidebar-nav-area::-webkit-scrollbar { display: none; }
    .sidebar-nav { display: flex; flex-direction: column; }

    .nav-section {
      display: block; color: var(--sidebar-text-dim);
      font-size: 0.58rem; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; padding: 9px 14px 3px;
    }
    .sidebar-nav > .nav-section:first-child { padding-top: 8px; }

    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 7.5px 11px; margin-bottom: 2px;
      border: 1px solid transparent; border-radius: 10px;
      color: var(--sidebar-text); font-size: 0.82rem; font-weight: 500;
      text-decoration: none; transition: all 0.15s; cursor: pointer;
    }
    .nav-link svg { flex-shrink: 0; opacity: 0.6; transition: opacity 0.15s; }
    .nav-link:hover { background: var(--sidebar-hover); color: var(--sidebar-text-strong); }
    .nav-link:hover svg { opacity: 0.95; }

    /* Active link: glowing accent pill (follows the user-chosen accent) */
    .nav-link.active {
      background: var(--accent-subtle);
      border-color: var(--accent-glow);
      color: var(--accent); font-weight: 600;
      box-shadow: 0 0 14px var(--accent-subtle), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .nav-link.active svg { opacity: 1; }

    /* Fixed bottom logout */
    .sidebar-bottom { flex-shrink: 0; padding: 0.75rem; border-top: 1px solid var(--sidebar-border); }
    .logout-btn {
      display: flex; align-items: center; gap: 9px; width: 100%;
      padding: 9px 12px; border-radius: 8px;
      background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.14);
      color: #f87171; font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.18s;
    }
    .logout-btn svg { opacity: 0.7; transition: opacity 0.15s; }
    .logout-btn:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #ef4444; }
    .logout-btn:hover svg { opacity: 1; }
  `],
})
export class SidebarComponent {
  auth = inject(AuthService);
  prefs = inject(SidebarPrefsService);
}
