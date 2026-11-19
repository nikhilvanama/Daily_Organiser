import { Component, HostListener, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastContainerComponent } from '../toast-container/toast-container.component';
import { ThemeService } from '../../../core/services/theme.service';
import { IdleService } from '../../../core/services/idle.service';
import { GlobalSearchComponent, GlobalSearchService } from '../global-search/global-search.component';
import { AiChatComponent } from '../ai-chat/ai-chat.component';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

const BOARD_ROUTES = new Set(['/trips', '/buy-list']);

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent, TopbarComponent, ToastContainerComponent, GlobalSearchComponent, AiChatComponent],
  template: `
    <div class="layout">
      <!-- Mobile top bar -->
      <div class="mobile-topbar">
        <button class="hamburger" (click)="sidebarOpen.set(true)" title="Menu" aria-label="Menu">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span class="mobile-title">Daily Organizer</span>

        <div class="mobile-actions">
          <!-- Search button -->
          <button class="mobile-icon-btn" (click)="globalSearch.open()" title="Search (Ctrl+K)" aria-label="Search">
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          <!-- Google Calendar sync -->
          <button class="mobile-gcal" [class.gcal-on]="gcal.connected()" (click)="handleGcal()"
            [title]="gcal.connected() ? (gcalSyncing ? 'Syncing…' : 'Sync to Google Calendar') : 'Connect Google Calendar'" aria-label="Google Calendar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            @if (gcal.connected()) { <span class="mobile-gcal-dot"></span> }
          </button>

          <!-- Theme toggle -->
          <button class="mobile-theme" (click)="themeService.toggle()" title="Toggle theme" aria-label="Toggle theme">
            @if (themeService.theme() === 'light') {
              <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            } @else {
              <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
            }
          </button>

          <!-- Profile circle avatar with dropdown -->
          <div class="mobile-profile-wrap">
            <button class="mobile-avatar-btn" (click)="toggleProfileMenu($event)" title="Profile menu" aria-label="Open profile menu">
              <span class="mobile-avatar">{{ getUserInitial() }}</span>
            </button>

            @if (profileMenuOpen()) {
              <div class="mobile-dropdown-backdrop" (click)="profileMenuOpen.set(false)"></div>
              <div class="mobile-profile-dropdown" (click)="$event.stopPropagation()">
                <div class="mp-header">
                  <span class="mp-avatar">{{ getUserInitial() }}</span>
                  <div class="mp-user">
                    <strong class="mp-name">{{ getUserName() }}</strong>
                    <span class="mp-email">{{ getUserEmail() }}</span>
                  </div>
                </div>

                <div class="mp-divider"></div>

                <a routerLink="/profile" class="mp-item" (click)="profileMenuOpen.set(false)">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Profile Page</span>
                </a>

                <button class="mp-item mp-logout" (click)="handleLogout()">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Quick Logout</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Sidebar overlay for mobile -->
      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Sidebar -->
      <div class="sidebar-wrap" [class.open]="sidebarOpen()">
        <app-sidebar (click)="closeSidebarOnNav($event)" />
      </div>

      <!-- Main content -->
      <div class="layout-main">
        <!-- Decorative aurora curves pinned to the top of the viewport on
             every page, flowing behind the transparent header. Fades out
             while the page is scrolled so the curves never hang over
             content, and returns at the top. -->
        <svg class="aurora" [class.away]="contentScrolled()" viewBox="0 0 900 260" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
          <defs>
            <linearGradient id="auroraV" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0"/>
              <stop offset="45%" stop-color="#8b5cf6" stop-opacity=".55"/>
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="auroraG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
              <stop offset="50%" stop-color="#34d399" stop-opacity=".5"/>
              <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
            </linearGradient>
            <filter id="auroraBlur" x="-20%" y="-50%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="14"/>
            </filter>
          </defs>
          <path d="M240 -40 C 420 90, 620 20, 940 130" stroke="url(#auroraV)" stroke-width="56" fill="none" filter="url(#auroraBlur)"/>
          <path d="M380 -60 C 560 110, 740 -10, 980 70" stroke="url(#auroraG)" stroke-width="40" fill="none" filter="url(#auroraBlur)"/>
          <path d="M300 -30 C 500 100, 680 10, 920 100" stroke="#a78bfa" stroke-opacity=".35" stroke-width="2" fill="none"/>
          <path d="M420 -40 C 600 100, 760 0, 960 60" stroke="#34d399" stroke-opacity=".3" stroke-width="1.6" fill="none"/>
        </svg>
        <app-topbar />
        <main class="layout-content" [class.board-route]="isBoardRoute()" (scroll)="onContentScroll($event)">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Mobile bottom tab bar: 5 tabs for an app-like feel on phones -->
    <nav class="mobile-tabbar">
      <a routerLink="/dashboard" routerLinkActive="active" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>
          <path d="M10 21v-6h4v6" fill="currentColor" opacity=".25" stroke="none"/>
        </svg>
        <span>Home</span>
      </a>
      <a routerLink="/tasks" routerLinkActive="active" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/>
          <rect x="4.5" y="3.5" width="15" height="5" rx="2.5" fill="currentColor" opacity=".25" stroke="none"/>
          <path d="M8.5 12.5h7M8.5 16h4.5"/>
        </svg>
        <span>Plans</span>
      </a>
      <button class="tab tab-ai" (click)="toggleAi()" title="AI assistant">
        <span class="ai-orb">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="#fff" fill-opacity=".25"/>
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="#fff"/>
          </svg>
        </span>
        <span>AI</span>
      </button>
      <a routerLink="/calendar" routerLinkActive="active" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>
          <path d="M3.5 10h17" />
          <path d="M3.5 7.5a2.5 2.5 0 0 1 2.5-2.5h12a2.5 2.5 0 0 1 2.5 2.5V10h-17z" fill="currentColor" opacity=".25" stroke="none"/>
          <path d="M8 3v3.4M16 3v3.4"/>
          <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/>
        </svg>
        <span>Calendar</span>
      </a>
      <a routerLink="/habits" routerLinkActive="active" class="tab" title="Daily Routine">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <circle cx="12" cy="12" r="8.6"/>
          <path d="M12 12 12 7.2" />
          <path d="m12 12 3.4 2.2"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <path d="M12 3.4v1M20.6 12h-1M12 20.6v-1M3.4 12h1" opacity=".55"/>
        </svg>
        <span>Daily Routine</span>
      </a>
    </nav>

    <app-toast-container />
    <app-global-search />
    <app-ai-chat />
  `,
  styles: [`
    :host { display: block; height: 100vh; height: 100dvh; }
    .layout { display: flex; height: 100vh; height: 100dvh; width: 100vw; overflow: hidden; }
    .layout-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); min-width: 0; }
    /* position:relative (no z-index!) paints content above the earlier
       aurora by DOM order, without trapping page overlays (day drawer,
       modals) in a stacking context below the topbar */
    .layout-content { flex: 1; overflow-y: auto; padding: 1rem 1.5rem 2rem; position: relative; }
    .layout-content.board-route { padding-bottom: 0; overflow: hidden; }

    /* Aurora curves pinned to the top of the viewport, behind the
       transparent header bar (topbar z 2, content z 1) */
    .aurora {
      position: fixed; top: 0; right: 0; width: min(84vw, 1340px); height: 220px;
      pointer-events: none; z-index: 0; opacity: .35;
      transition: opacity .4s ease, transform .4s ease;
    }
    [data-theme="dark"] .aurora { opacity: .85; }
    @media (max-width: 768px) {
      .aurora { width: 100vw; height: 170px; opacity: .5; }
      [data-theme="dark"] .aurora { opacity: 1; }
    }
    /* Scrolled: drift up and fade so the curves never sit over content */
    .aurora.away { opacity: 0 !important; transform: translateY(-24px); }

    .sidebar-wrap { flex-shrink: 0; }
    .mobile-topbar { display: none; }
    .mobile-tabbar { display: none; }
    .sidebar-overlay { display: none; }

    @media (max-width: 768px) {
      /* 56px fixed mobile topbar + exactly 1rem gap below it; extra bottom
         padding so the last content can scroll clear of the floating AI
         button AND the bottom tab bar */
      .layout-content { padding: 1rem; padding-top: calc(56px + 1rem); padding-bottom: calc(66px + 28px + env(safe-area-inset-bottom)); }
      .layout-content.board-route { padding-bottom: calc(66px + env(safe-area-inset-bottom)); }

      .mobile-topbar {
        display: flex; align-items: center; gap: 10px;
        position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
        height: 56px; padding: 0 12px;
        background: var(--bg-card); border-bottom: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
      }

      /* App-like bottom tab bar */
      .mobile-tabbar {
        display: grid; grid-template-columns: repeat(5, 1fr);
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 1000;
        height: calc(62px + env(safe-area-inset-bottom));
        padding: 7px 6px calc(7px + env(safe-area-inset-bottom));
        background: var(--bg-card); border-top: 1px solid var(--border);
        box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.18);
      }
      .tab {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
        border: none; background: transparent; color: var(--text-muted);
        text-decoration: none; cursor: pointer; border-radius: 12px; padding: 0;
        font-family: inherit;
      }
      .tab span {
        font-size: 0.58rem; font-weight: 600; letter-spacing: 0.01em; line-height: 1.1;
        white-space: nowrap; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
      }
      @media (max-width: 360px) {
        .tab span { font-size: 0.52rem; }
      }
      .tab svg { transition: transform 0.15s; }
      .tab.active { color: var(--accent); }
      .tab.active svg { transform: translateY(-1px); }
      .tab:active svg { transform: scale(0.92); }

      /* Center AI tab: raised glowing orb that floats above the bar */
      .tab-ai { gap: 4px; overflow: visible; }
      .tab-ai span:last-child { color: var(--accent); }
      .ai-orb {
        width: 60px; height: 60px; border-radius: 50%; margin-top: -40px;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(145deg, var(--accent), var(--accent-hover));
        border: 4px solid var(--bg-card);
        box-shadow: 0 8px 24px var(--accent-glow), inset 0 2px 0 rgba(255, 255, 255, 0.35);
        transition: transform 0.15s;
      }
      .ai-orb svg { width: 28px; height: 28px; }
      .tab-ai:active .ai-orb { transform: scale(0.92); }
      .hamburger {
        display: flex; align-items: center; justify-content: center;
        width: 34px; height: 34px; border-radius: 8px;
        background: transparent; border: none; cursor: pointer;
        color: var(--text-primary); flex-shrink: 0;
      }
      .hamburger:hover { background: var(--bg-hover); }
      .mobile-title {
        flex: 1; font-size: 0.92rem; font-weight: 700; color: var(--text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
      }
      .mobile-actions {
        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
      }
      .mobile-icon-btn, .mobile-theme, .mobile-gcal {
        display: flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 8px;
        background: var(--bg-secondary); border: 1px solid var(--border); cursor: pointer;
        color: var(--text-secondary); transition: all 0.15s; padding: 0; flex-shrink: 0;
      }
      .mobile-icon-btn:hover, .mobile-theme:hover, .mobile-gcal:hover {
        background: var(--bg-hover); color: var(--text-primary);
      }
      .mobile-gcal { position: relative; }
      .mobile-gcal.gcal-on { border-color: rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.06); }
      .mobile-gcal-dot {
        position: absolute; top: 4px; right: 4px; width: 6px; height: 6px;
        background: #10b981; border-radius: 50%; border: 1.5px solid var(--bg-card);
      }

      .mobile-profile-wrap {
        position: relative; display: flex; align-items: center;
      }
      .mobile-avatar-btn {
        background: transparent; border: none; padding: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; outline: none;
      }
      .mobile-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover));
        color: #fff; font-weight: 700; font-size: 0.78rem;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px var(--accent-glow);
        border: 1.5px solid var(--border); text-transform: uppercase;
      }
      .mobile-dropdown-backdrop {
        position: fixed; inset: 0; z-index: 1009; background: transparent;
      }
      .mobile-profile-dropdown {
        position: absolute; top: calc(100% + 10px); right: 0; z-index: 1010;
        min-width: 210px; max-width: 270px;
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        padding: 6px; display: flex; flex-direction: column; gap: 3px;
        animation: dropdownIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes dropdownIn {
        from { opacity: 0; transform: translateY(-6px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mp-header {
        display: flex; align-items: center; gap: 9px;
        padding: 8px 10px;
      }
      .mp-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover));
        color: #fff; font-weight: 700; font-size: 0.82rem;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; box-shadow: 0 2px 8px var(--accent-glow);
        text-transform: uppercase;
      }
      .mp-user {
        display: flex; flex-direction: column; overflow: hidden;
      }
      .mp-name {
        font-size: 0.84rem; font-weight: 600; color: var(--text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mp-email {
        font-size: 0.72rem; color: var(--text-secondary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mp-divider {
        height: 1px; background: var(--border); margin: 3px 6px;
      }
      .mp-item {
        display: flex; align-items: center; gap: 9px;
        width: 100%; padding: 8px 10px; border: none; background: transparent;
        border-radius: 8px; font-family: inherit; font-size: 0.82rem;
        font-weight: 500; color: var(--text-primary); text-decoration: none;
        cursor: pointer; transition: background 0.12s; box-sizing: border-box;
      }
      .mp-item:hover, .mp-item:active {
        background: var(--bg-hover);
      }
      .mp-logout {
        color: #ef4444;
      }
      .mp-logout:hover, .mp-logout:active {
        background: rgba(239, 68, 68, 0.1);
      }

      .sidebar-wrap {
        position: fixed; top: 0; left: 0; bottom: 0; z-index: 1002;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }
      .sidebar-wrap.open { transform: translateX(0); }

      .sidebar-overlay {
        display: block; position: fixed; inset: 0;
        background: rgba(0,0,0,0.5); z-index: 1001;
      }
    }
  `],
})
export class LayoutComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  private idle = inject(IdleService);
  private router = inject(Router);
  globalSearch = inject(GlobalSearchService);
  gcal = inject(GoogleCalendarService);
  private toast = inject(ToastService);
  sidebarOpen = signal(false);
  profileMenuOpen = signal(false);
  gcalSyncing = false;
  private routerSub?: any;

  // Center tab of the mobile tab bar opens the AI assistant panel
  @ViewChild(AiChatComponent) private aiChat?: AiChatComponent;
  toggleAi() { this.aiChat?.toggle(); }

  // True while the content area is scrolled away from the top — fades the
  // aurora curves out so they never hang over scrolled cards.
  contentScrolled = signal(false);
  onContentScroll(e: Event) {
    this.contentScrolled.set((e.target as HTMLElement).scrollTop > 24);
  }

  toggleProfileMenu(e?: Event) {
    e?.stopPropagation();
    this.profileMenuOpen.update(v => !v);
  }

  handleLogout() {
    this.profileMenuOpen.set(false);
    this.auth.logout();
  }

  getUserInitial(): string {
    const u = this.auth.currentUser();
    return (u?.displayName ?? u?.username ?? 'U')[0].toUpperCase();
  }

  getUserName(): string {
    const u = this.auth.currentUser();
    return u?.displayName ?? u?.username ?? 'User';
  }

  getUserEmail(): string {
    const u = this.auth.currentUser();
    return u?.email ?? '';
  }

  // Same behavior as the desktop topbar button (hidden on phones):
  // connected → sync all plans; not connected → start the OAuth flow.
  handleGcal() {
    if (this.gcal.connected()) {
      if (this.gcalSyncing) return;
      this.gcalSyncing = true;
      this.gcal.syncAll().subscribe({
        next: (res) => {
          this.gcalSyncing = false;
          if (res.synced > 0) this.toast.success(`Synced ${res.synced} plan(s) to Google Calendar`);
          else this.toast.info('All plans are already synced');
        },
        error: () => { this.gcalSyncing = false; this.toast.error('Sync failed'); },
      });
    } else {
      this.gcal.connect();
    }
  }

  // Ctrl+K (or Cmd+K on Mac) opens the global search from anywhere in the app
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.globalSearch.open();
    }
  }

  isBoardRoute = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => BOARD_ROUTES.has((e as NavigationEnd).urlAfterRedirects)),
      startWith(BOARD_ROUTES.has(this.router.url)),
    ),
    { initialValue: BOARD_ROUTES.has(this.router.url) },
  );

  ngOnInit() {
    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe();
    }
    // The layout is only mounted for authenticated users (route is behind authGuard),
    // so this is the right place to start the idle-timeout watcher.
    this.idle.start();

    this.routerSub = this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.profileMenuOpen.set(false);
        this.sidebarOpen.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.idle.stop();
    this.routerSub?.unsubscribe();
  }

  closeSidebarOnNav(event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('a[routerLink]')) {
      this.sidebarOpen.set(false);
      this.profileMenuOpen.set(false);
    }
  }
}
