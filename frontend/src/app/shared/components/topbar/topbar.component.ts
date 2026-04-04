// Import Component decorator and inject function for dependency injection
import { Component, inject } from '@angular/core';
// AuthService provides the current user signal for displaying the avatar
import { AuthService } from '../../../core/services/auth.service';
// ThemeService provides the theme signal and toggle method for the theme switch button
import { ThemeService } from '../../../core/services/theme.service';

// TopbarComponent is an alternative header bar (not currently used in the layout,
// but available as a standalone component). It shows the current page title,
// a theme toggle button, and the user's avatar initial.
@Component({
  selector: 'app-topbar', // Could be added to the layout template if a top bar is desired
  standalone: true, // Angular 19 standalone component
  imports: [], // No child components or directives needed
  template: `
    <!-- Horizontal header bar spanning the top of the main content area -->
    <header class="topbar">
      <!-- Left side: dynamic page title based on the current URL -->
      <div class="topbar-left">
        <h1 class="page-title">{{ getTitle() }}</h1>
      </div>
      <!-- Right side: theme toggle button and user avatar -->
      <div class="topbar-right">
        <!-- Theme toggle button: moon icon for light mode, sun icon for dark mode -->
        <button class="topbar-btn" (click)="theme.toggle()" title="Toggle theme">
          @if (theme.theme() === 'light') {
            <!-- Moon SVG icon — shown in light mode, clicking switches to dark -->
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          } @else {
            <!-- Sun SVG icon — shown in dark mode, clicking switches to light -->
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
          }
        </button>
        <!-- User avatar circle: shows the first initial of the user's display name -->
        @if (auth.currentUser()) {
          <div class="topbar-avatar">
            {{ (auth.currentUser()?.displayName ?? 'U')[0].toUpperCase() }}
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    /* Top bar container: horizontal flex layout with space-between alignment */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      height: 56px;
      min-height: 56px; /* Fixed height so the topbar never collapses */
      background: var(--bg-primary); /* Uses the primary background color from the theme */
      border-bottom: 1px solid var(--border); /* Subtle separator line below the topbar */
    }
    /* Page title: semibold, normal size to avoid competing with page-level headings */
    .page-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
    /* Right section: flex row for theme button and avatar */
    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }
    /* Theme toggle button: bordered, transparent background, subtle hover effect */
    .topbar-btn { background: transparent; border: 1px solid var(--border); border-radius: 0.375rem; padding: 0.375rem; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; }
    .topbar-btn:hover { background: var(--bg-secondary); }
    /* User avatar: small green circle with white initial letter */
    .topbar-avatar { width: 32px; height: 32px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
  `],
})
export class TopbarComponent {
  // Expose AuthService so the template can access currentUser() for the avatar
  auth = inject(AuthService);
  // Expose ThemeService so the template can call toggle() and read theme()
  theme = inject(ThemeService);

  // Derive the page title from the current URL path.
  // This is a simple approach — in a more complex app, this could use ActivatedRoute data.
  getTitle(): string {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'Today'; // Dashboard page
    if (path.includes('tasks')) return 'My Plans'; // Task list or detail page
    if (path.includes('goals')) return 'Goals'; // Goal list or detail page
    if (path.includes('wishlist')) return 'Buy List'; // Wishlist page
    if (path.includes('calendar')) return 'Calendar'; // Calendar page
    return 'Daily Organizer'; // Fallback title
  }
}
