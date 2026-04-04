// Import Injectable for DI and signal for reactive state management (Angular 19 signals API)
import { Injectable, signal } from '@angular/core';
// HttpClient is used to call the NestJS backend auth endpoints
import { HttpClient } from '@angular/common/http';
// Router is needed to redirect users after logout
import { Router } from '@angular/router';
// tap operator lets us perform side effects (storing tokens, updating signals) within the observable pipeline
import { tap } from 'rxjs/operators';
// TokenStorageService abstracts localStorage access for JWT tokens
import { TokenStorageService } from './token-storage.service';
// User model interface for typing the current user signal
import { User } from '../models/user.model';
// Environment config provides the base API URL
import { environment } from '../../../environments/environment';

// Shape of the response returned by the login and register endpoints.
// Contains the authenticated user's profile plus both JWT tokens.
interface AuthResponse {
  user: User; // The user profile object
  accessToken: string; // Short-lived JWT for API authorization
  refreshToken: string; // Long-lived token used to obtain new access tokens
}

// AuthService is the central authentication service for the Daily Organizer app.
// It manages login, registration, logout, token refresh, and exposes the current user
// as a signal so any component can reactively read the auth state.
@Injectable({ providedIn: 'root' }) // Singleton — available app-wide without explicit provider registration
export class AuthService {
  // Base URL for all auth-related API endpoints (login, register, logout, refresh, me)
  private readonly base = `${environment.apiUrl}/auth`;
  // Reactive signal holding the currently logged-in user's profile (null when logged out).
  // Components like the sidebar and topbar read this signal to display user info.
  currentUser = signal<User | null>(null);

  constructor(
    private http: HttpClient, // For making HTTP requests to the backend
    private tokens: TokenStorageService, // For persisting/retrieving JWT tokens in localStorage
    private router: Router, // For programmatic navigation (e.g., redirect to login after logout)
  ) {}

  // Register a new user account — sends credentials to the backend,
  // stores the returned tokens, and sets the current user signal.
  register(dto: { email: string; username: string; password: string; displayName?: string }) {
    return this.http.post<AuthResponse>(`${this.base}/register`, dto).pipe(
      tap((res) => this.handleAuthResponse(res)), // Side effect: persist tokens + update user signal
    );
  }

  // Log in with email and password — same flow as register but hits the login endpoint.
  login(dto: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.base}/login`, dto).pipe(
      tap((res) => this.handleAuthResponse(res)), // Side effect: persist tokens + update user signal
    );
  }

  // Log out the current user — tells the backend to invalidate the refresh token,
  // then clears local state regardless of whether the API call succeeds.
  logout() {
    this.http.post(`${this.base}/logout`, {}).subscribe({
      complete: () => this.clearSession(), // On success: clear tokens and redirect
      error: () => this.clearSession(), // On failure: still clear tokens — user wants to log out
    });
  }

  // Refresh the access token using the stored refresh token.
  // Called by the auth interceptor when a 401 response is received.
  refresh() {
    const refreshToken = this.tokens.getRefreshToken();
    return this.http
      .post<{ accessToken: string; refreshToken: string }>(`${this.base}/refresh`, { refreshToken })
      .pipe(tap((res) => this.tokens.saveTokens(res.accessToken, res.refreshToken))); // Update stored tokens
  }

  // Fetch the current user's profile from the backend (/auth/me endpoint).
  // Called on app startup (AppComponent.ngOnInit) when a stored token exists,
  // so the UI can display user info without requiring a fresh login.
  loadCurrentUser() {
    return this.http.get<User>(`${this.base}/me`).pipe(
      tap((user) => this.currentUser.set(user)), // Update the reactive signal with the fetched profile
    );
  }

  // Quick synchronous check for whether the user has a stored access token.
  // Used by route guards and components to determine auth state without an API call.
  isLoggedIn(): boolean {
    return !!this.tokens.getAccessToken();
  }

  // Common handler for successful login/register responses — persists both tokens
  // in localStorage and updates the currentUser signal for the UI.
  private handleAuthResponse(res: AuthResponse) {
    this.tokens.saveTokens(res.accessToken, res.refreshToken);
    this.currentUser.set(res.user);
  }

  // Clears all auth state and redirects to the login page.
  // Called on logout or when a token refresh fails (session expired).
  private clearSession() {
    this.tokens.clearTokens(); // Remove JWT tokens from localStorage
    this.currentUser.set(null); // Reset the user signal to null
    this.router.navigate(['/auth/login']); // Redirect to the login page
  }
}
