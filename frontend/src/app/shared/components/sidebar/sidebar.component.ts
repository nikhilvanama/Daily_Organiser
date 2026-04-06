// Import Angular core utilities: Component decorator, inject for DI, OnInit lifecycle hook, signal for reactive state
import { Component, inject, OnInit, signal } from '@angular/core';
// RouterLink creates navigable links; RouterLinkActive adds the "active" CSS class to the current route link
import { RouterLink, RouterLinkActive } from '@angular/router';
// AuthService provides the current user signal and logout functionality
import { AuthService } from '../../../core/services/auth.service';
// ThemeService provides the current theme signal and toggle method
import { ThemeService } from '../../../core/services/theme.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { ToastService } from '../../../core/services/toast.service';

// SidebarComponent is the persistent left navigation panel visible on all authenticated pages.
// It contains: app logo, navigation links (Today, My Plans, Calendar, Goals, Buy List),
// a categories section with a popup manager, a theme toggle button, and a user info block.
@Component({
  selector: 'app-sidebar', // Placed inside the LayoutComponent template
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, RouterLinkActive],
  template: `
    <!-- Sidebar container — fixed-width dark panel on the left side of the layout -->
    <aside class="sidebar">
      <!-- Top section: scrollable area containing logo, nav links, and categories -->
      <div class="sidebar-top">
        <!-- App branding: green gradient icon + app name -->
        <div class="sidebar-logo">
          <div class="logo-icon">
            <!-- Inline SVG calendar icon rendered inside the green gradient box -->
            <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span class="logo-text">Daily Organizer</span>
        </div>

        <!-- Main navigation links — each uses routerLinkActive to highlight the current page -->
        <nav class="sidebar-nav">
          <!-- "Overview" section label for the first group of nav links -->
          <span class="nav-section">Overview</span>
          <!-- Dashboard link — shows today's schedule, stats, and active goals -->
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Today</span>
          </a>
          <!-- Tasks link — lists all plans (tasks, trips, meetings, etc.) -->
          <a routerLink="/tasks" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>My Plans</span>
          </a>
          <!-- Calendar link — monthly grid view with tasks plotted on dates -->
          <a routerLink="/calendar" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <span>Calendar</span>
          </a>

          <!-- "Trackers" section label for goals and wishlist -->
          <span class="nav-section">Trackers</span>
          <!-- Goals link — lists all goals with progress tracking -->
          <a routerLink="/goals" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span>Goals</span>
          </a>
          <!-- Wishlist link — shows the buy list with product cards -->
          <a routerLink="/wishlist" routerLinkActive="active" class="nav-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <span>Buy List</span>
          </a>
        </nav>

      </div>

      <!-- Bottom section: theme toggle and user profile block (always visible, never scrolls) -->
      <div class="sidebar-bottom">
        <!-- Theme toggle button — switches between dark and light modes -->
        <button class="theme-btn" (click)="themeService.toggle()">
          @if (themeService.theme() === 'light') {
            <!-- Moon icon shown in light mode — clicking switches to dark mode -->
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            <span>Dark mode</span>
          } @else {
            <!-- Sun icon shown in dark mode — clicking switches to light mode -->
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
            <span>Light mode</span>
          }
        </button>

        <!-- Google Calendar connection -->
        @if (gcalService.connected()) {
          <div class="gcal-connected">
            <button class="gcal-btn connected" (click)="syncAllToCalendar()">
              <svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span class="gcal-text">{{ syncing ? 'Syncing...' : 'Google Calendar' }}</span>
              <span class="gcal-sync-hint">Sync All</span>
            </button>
            <button class="gcal-disconnect" (click)="handleGoogleCalendar()" title="Disconnect">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        } @else {
          <button class="gcal-btn" (click)="handleGoogleCalendar()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span class="gcal-text">Connect Google Calendar</span>
          </button>
        }

        <!-- User profile block -->
        <div class="user-block">
          <!-- Circular avatar with the user's first initial on a green gradient background -->
          <div class="user-avatar">{{ getUserInitial() }}</div>
          <div class="user-info">
            <!-- User's display name (or username as fallback) -->
            <span class="user-name">{{ getUserName() }}</span>
            <!-- User's email address shown in smaller, muted text -->
            <span class="user-email">{{ auth.currentUser()?.email ?? '' }}</span>
          </div>
          <!-- Logout button — calls auth.logout() which clears tokens and redirects to login -->
          <button class="logout-icon" (click)="auth.logout()" title="Sign out">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    /* Host element: full viewport height, no shrinking in the flex layout */
    :host { display: flex; height: 100vh; flex-shrink: 0;
      /* Sidebar-specific CSS custom properties — light theme defaults */
      --sidebar-bg: #111318; --sidebar-border: rgba(255,255,255,0.06); --sidebar-text: #b0b4bc;
      --sidebar-text-dim: #6b7280; --sidebar-hover: rgba(255,255,255,0.05);
      --sidebar-active-bg: rgba(16,185,129,0.12); --sidebar-active-text: #34d399;
    }
    /* Dark theme overrides for sidebar-specific custom properties */
    :host-context([data-theme="dark"]) {
      --sidebar-bg: #09090b; --sidebar-border: #1a1a1e; --sidebar-text: #a1a1aa;
      --sidebar-text-dim: #52525b; --sidebar-hover: rgba(255,255,255,0.04);
      --sidebar-active-bg: rgba(52,211,153,0.1); --sidebar-active-text: #6ee7b7;
    }
    /* Sidebar panel: fixed 250px width, dark background, full height with hidden overflow */
    .sidebar { width: 250px; min-width: 250px; height: 100vh; background: var(--sidebar-bg); display: flex; flex-direction: column; border-right: 1px solid var(--sidebar-border); overflow: hidden; }
    /* Top section: grows to fill space, scrollable if categories list gets long */
    .sidebar-top { flex: 1; overflow-y: auto; padding: 1.25rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
    /* Logo row: flex container for icon + text with bottom padding for spacing */
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; }
    /* Green gradient square with rounded corners — houses the calendar SVG icon */
    .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(16,185,129,0.35); }
    /* App name text in white, bold weight for brand emphasis */
    .logo-text { color: #fff; font-weight: 700; font-size: 1rem; letter-spacing: -0.01em; }
    /* Navigation links container: vertical stack with minimal gap */
    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
    /* Section labels (e.g., "Overview", "Trackers") — small, uppercase, dim text */
    .nav-section { display: block; color: var(--sidebar-text-dim); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 12px 6px; }
    /* Individual nav link: horizontal flex with icon + text, rounded hover/active states */
    .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.15s; cursor: pointer; position: relative; }
    /* Hover state: subtle white overlay background and brighter text */
    .nav-link:hover { background: var(--sidebar-hover); color: #fff; }
    /* Active state: green-tinted background and green text for the current page link */
    .nav-link.active { background: var(--sidebar-active-bg); color: var(--sidebar-active-text); font-weight: 600; }
    /* Active indicator bar: small green vertical bar on the left edge of the active link */
    .nav-link.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--sidebar-active-text); border-radius: 0 3px 3px 0; }
    /* Categories list container with a small top margin separating it from nav links */
    .sidebar-categories { display: flex; flex-direction: column; gap: 2px; margin-top: 0.5rem; }
    /* Categories header row: label on the left, add button on the right */
    .cat-header { display: flex; align-items: center; justify-content: space-between; padding-right: 8px; }
    /* Plus button to open the category manager popup */
    .cat-add-btn { background: none; border: none; cursor: pointer; color: var(--sidebar-text-dim); padding: 4px; border-radius: 6px; display: flex; transition: all 0.15s; }
    .cat-add-btn:hover { background: var(--sidebar-hover); color: var(--sidebar-active-text); }
    /* Individual category row: colored dot + category name */
    .cat-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 6px; color: var(--sidebar-text); font-size: 0.82rem; cursor: pointer; transition: background 0.1s; }
    .cat-item:hover { background: var(--sidebar-hover); }
    /* Small colored circle representing the category's assigned color */
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    /* Dashed button shown when no categories exist — invites the user to create one */
    .cat-empty-btn { background: none; border: 1px dashed var(--sidebar-border); border-radius: 8px; color: var(--sidebar-text-dim); font-size: 0.78rem; padding: 8px 12px; cursor: pointer; width: 100%; text-align: left; font-family: inherit; transition: all 0.15s; }
    .cat-empty-btn:hover { border-color: var(--sidebar-active-text); color: var(--sidebar-active-text); }
    /* Full-screen semi-transparent overlay behind the category manager popup — click to dismiss */
    .cat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 999; }
    /* Category manager popup positioned to the right of the sidebar */
    .cat-popup { position: fixed; top: 50%; left: 250px; transform: translateY(-50%); z-index: 1000; margin-left: 12px; }
    /* Bottom section: bordered top, contains theme toggle and user block */
    .sidebar-bottom { padding: 0.75rem; padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); border-top: 1px solid var(--sidebar-border); display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    /* Theme toggle button: full-width with subtle background */
    .theme-btn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 8px; color: var(--sidebar-text); font-size: 0.82rem; background: var(--sidebar-hover); border: none; cursor: pointer; width: 100%; transition: all 0.15s; font-family: inherit; }
    .theme-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
    /* User profile block: avatar, name/email, and logout button in a compact row */
    .user-block { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; background: var(--sidebar-hover); }
    /* Circular avatar with green gradient background showing the user's initial */
    .user-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
    /* User info column: name and email stacked vertically with text truncation */
    .user-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .user-name { color: #fff; font-size: 0.82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { color: var(--sidebar-text-dim); font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Logout button: dim by default, turns red on hover to signal destructive action */
    .logout-icon { background: none; border: none; color: var(--sidebar-text-dim); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: all 0.15s; flex-shrink: 0; }
    .logout-icon:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

    .gcal-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px; border-radius: 8px;
      color: var(--sidebar-text); font-size: 0.82rem;
      background: transparent; border: 1px dashed var(--sidebar-border);
      cursor: pointer; width: 100%; transition: all 0.15s; font-family: inherit;
    }
    .gcal-btn:hover { border-color: var(--sidebar-active-text); color: var(--sidebar-active-text); background: var(--sidebar-hover); }
    .gcal-btn.connected { border-style: solid; border-color: rgba(16,185,129,0.3); }
    .gcal-text { flex: 1; text-align: left; }
    .gcal-sync-hint { font-size: 0.65rem; color: var(--sidebar-text-dim); opacity: 0; transition: opacity 0.15s; }
    .gcal-btn:hover .gcal-sync-hint { opacity: 1; }
    .gcal-connected { display: flex; gap: 4px; }
    .gcal-connected .gcal-btn { flex: 1; }
    .gcal-disconnect {
      background: transparent; border: 1px solid var(--sidebar-border); border-radius: 8px;
      color: var(--sidebar-text-dim); cursor: pointer; padding: 4px 6px; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s;
    }
    .gcal-disconnect:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
  `],
})
export class SidebarComponent implements OnInit {
  // Expose AuthService publicly so the template can access currentUser() and logout()
  auth = inject(AuthService);
  // Expose ThemeService publicly so the template can call toggle() and read theme()
  themeService = inject(ThemeService);
  // Observable stream of user's categories — used in the template with async pipe
  gcalService = inject(GoogleCalendarService);
  private toast = inject(ToastService);

  ngOnInit() {
    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe();
    }
    // Check Google Calendar connection status
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

  // Get the first letter of the user's display name (or username, or "U" as fallback)
  // for display in the circular avatar widget.
  getUserInitial(): string {
    const user = this.auth.currentUser();
    return (user?.displayName ?? user?.username ?? 'U')[0].toUpperCase();
  }

  // Get the user's display name for the sidebar user block.
  // Falls back to username, then to the generic "User" string.
  getUserName(): string {
    const user = this.auth.currentUser();
    return user?.displayName ?? user?.username ?? 'User';
  }
}
