// inject() provides access to Angular services inside functional guards
import { inject } from '@angular/core';
// CanActivateFn is the type for functional route guards; Router is used for redirect
import { CanActivateFn, Router } from '@angular/router';
// AuthService exposes the isLoggedIn() check used to determine access
import { AuthService } from '../services/auth.service';

// Functional route guard that protects public-only routes (login, register).
// If the user is already logged in, they are redirected to the dashboard
// instead of seeing the auth forms again. This prevents confusion when
// a user manually navigates to /auth/login while already authenticated.
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService); // Get the singleton AuthService instance
  const router = inject(Router); // Get the Router for creating redirect URL trees
  // Allow navigation only if the user is NOT logged in
  if (!auth.isLoggedIn()) return true;
  // User is already authenticated — redirect them to the dashboard
  return router.createUrlTree(['/dashboard']);
};
