// Import Component decorator from Angular core
import { Component } from '@angular/core';
// RouterOutlet renders the matched child route component (dashboard, tasks, goals, etc.)
import { RouterOutlet } from '@angular/router';
// SidebarComponent provides the left navigation panel with links, categories, and user info
import { SidebarComponent } from '../sidebar/sidebar.component';
// ToastContainerComponent renders ephemeral notification popups in the bottom-right corner
import { ToastContainerComponent } from '../toast-container/toast-container.component';

// LayoutComponent is the "app shell" that wraps all authenticated pages.
// It provides the sidebar + main content area layout. This component is lazy-loaded
// and used as a parent route component in app.routes.ts, so only logged-in users see it.
@Component({
  selector: 'app-layout', // Used internally by the router — not manually placed in templates
  standalone: true, // Angular 19 standalone component — no NgModule needed
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent], // Declare child components used in the template
  template: `
    <!-- Flex container: sidebar on the left, main content on the right -->
    <div class="layout">
      <!-- Left sidebar with navigation links, categories, theme toggle, and user info -->
      <app-sidebar />
      <!-- Main content area that grows to fill remaining horizontal space -->
      <div class="layout-main">
        <!-- Scrollable content region where child route components are rendered -->
        <main class="layout-content">
          <!-- The router inserts the active page component here (dashboard, task list, etc.) -->
          <router-outlet />
        </main>
      </div>
    </div>
    <!-- Toast notifications are rendered outside the layout flex container so they float above content -->
    <app-toast-container />
  `,
  styles: [`
    /* Make the host element fill the full viewport height */
    :host { display: block; height: 100vh; }
    /* Horizontal flex layout: sidebar + main content, filling the entire viewport */
    .layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden; /* Prevent the layout itself from scrolling — only inner content scrolls */
    }
    /* Main content column that takes all remaining space after the fixed-width sidebar */
    .layout-main {
      flex: 1; /* Grow to fill available horizontal space */
      display: flex;
      flex-direction: column;
      overflow: hidden; /* Prevent overflow — scrolling happens inside .layout-content */
      background: var(--bg-secondary); /* Slightly different background than cards for visual depth */
      min-width: 0; /* Prevent flex item from overflowing when content is wide */
    }
    /* Inner scrollable area with padding for page content */
    .layout-content {
      flex: 1; /* Fill all vertical space in the main column */
      overflow-y: auto; /* Enable vertical scrolling for long page content */
      padding: 2rem 2.5rem; /* Comfortable padding around page content */
    }
  `],
})
export class LayoutComponent {}
// This component has no logic — it is purely a structural shell for the authenticated layout.
