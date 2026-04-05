import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastContainerComponent } from '../toast-container/toast-container.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent],
  template: `
    <div class="layout">
      <!-- Mobile hamburger button -->
      <button class="hamburger" (click)="sidebarOpen.set(true)">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

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
    .hamburger { display: none; }
    .sidebar-overlay { display: none; }

    /* Mobile: sidebar becomes overlay */
    @media (max-width: 768px) {
      .layout-content { padding: 1rem 1rem 1.5rem; padding-top: 3.5rem; }

      .hamburger {
        display: flex; align-items: center; justify-content: center;
        position: fixed; top: 12px; left: 12px; z-index: 1001;
        width: 40px; height: 40px; border-radius: 10px;
        background: var(--bg-card); border: 1px solid var(--border);
        box-shadow: var(--shadow-md); cursor: pointer;
        color: var(--text-primary);
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
export class LayoutComponent {
  sidebarOpen = signal(false);

  closeSidebarOnNav(event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('a[routerLink]')) {
      this.sidebarOpen.set(false);
    }
  }
}
