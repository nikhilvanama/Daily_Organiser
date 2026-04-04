// Import Angular core decorators and lifecycle hook, plus the DI function
import { Component, inject, OnInit } from '@angular/core';
// RouterOutlet renders the matched child route component inside the template
import { RouterOutlet } from '@angular/router';
// AuthService handles login state, token management, and user data for the app
import { AuthService } from './core/services/auth.service';

// Root component of the Daily Organizer app — acts as the entry point that
// bootstraps the router; all pages are rendered via the <router-outlet>.
@Component({
  selector: 'app-root', // The root element selector used in index.html
  standalone: true, // Angular 19 standalone component — no NgModule required
  imports: [RouterOutlet], // Declare RouterOutlet so the template can use <router-outlet>
  template: `<router-outlet />`, // Minimal template — the router handles all view rendering
})
export class AppComponent implements OnInit {
  // Inject AuthService via the inject() function (preferred in standalone components)
  private auth = inject(AuthService);

  // On app startup, check whether the user already has a stored JWT token.
  // If so, fetch their profile from the backend so the UI can display user info
  // (sidebar avatar, display name, etc.) without forcing a re-login.
  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      // Fire-and-forget: errors are silently swallowed because a failed profile
      // fetch should not block the app — the user can still navigate.
      this.auth.loadCurrentUser().subscribe({ error: () => {} });
    }
  }
}
