import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastContainerComponent } from '../toast-container/toast-container.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent],
  template: `
    <div class="layout">
      <!-- Mobile top bar -->
      <div class="mobile-topbar">
        <button class="hamburger" (click)="sidebarOpen.set(true)">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span class="mobile-title">Daily Organizer</span>
        <button class="mobile-theme" (click)="themeService.toggle()">
          @if (themeService.theme() === 'light') {
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          } @else {
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
          }
        </button>
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
        <main class="layout-content">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toast-container />
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    .layout-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); min-width: 0; }
    .layout-content { flex: 1; overflow-y: auto; padding: 2rem 2.5rem; }

    .sidebar-wrap { flex-shrink: 0; }
    .mobile-topbar { display: none; }
    .sidebar-overlay { display: none; }

    @media (max-width: 768px) {
      .layout-content { padding: 1rem; padding-top: 4.8rem; }

      .mobile-topbar {
        display: flex; align-items: center; gap: 10px;
        position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
        height: 52px; padding: 0 12px;
        background: var(--bg-card); border-bottom: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
      }
      .hamburger {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 8px;
        background: transparent; border: none; cursor: pointer;
        color: var(--text-primary);
      }
      .hamburger:hover { background: var(--bg-hover); }
      .mobile-title { flex: 1; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
      .mobile-theme {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 8px;
        background: transparent; border: 1px solid var(--border); cursor: pointer;
        color: var(--text-secondary);
      }
      .mobile-theme:hover { background: var(--bg-hover); }

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
export class LayoutComponent {
  themeService = inject(ThemeService);
  sidebarOpen = signal(false);

  closeSidebarOnNav(event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('a[routerLink]')) {
      this.sidebarOpen.set(false);
    }
  }
}
