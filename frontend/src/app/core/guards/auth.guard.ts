// inject() provides access to Angular services inside functional guards
import { inject } from '@angular/core';
// CanActivateFn is the type for functional route guards; Router is used for redirect
import { CanActivateFn, Router } from '@angular/router';
// AuthService exposes the isLoggedIn() check used to determine access
import { AuthService } from '../services/auth.service';

// Functional route guard that protects authenticated-only routes (dashboard, tasks, goals, etc.).
// If the user has a valid access token, navigation proceeds; otherwise, they are
// redirected to the login page. Applied to the layout wrapper route in app.routes.ts.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); // Get the singleton AuthService instance
  const router = inject(Router); // Get the Router for creating redirect URL trees
  // Allow navigation if a stored access token exists
  if (auth.isLoggedIn()) return true;
  // No token found — redirect to the login page instead of allowing access
  return router.createUrlTree(['/auth/login']);
};
