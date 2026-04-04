// Import Injectable so this service can be registered in Angular's dependency injection system
import { Injectable } from '@angular/core';

// TokenStorageService is a thin abstraction over localStorage for managing JWT tokens.
// Centralizing token storage here (instead of scattering localStorage calls) makes it
// easy to swap the storage mechanism later (e.g., to sessionStorage or cookies).
@Injectable({ providedIn: 'root' }) // Singleton — one shared instance across the entire app
export class TokenStorageService {
  // localStorage key for the short-lived access token (sent with every API request)
  private readonly ACCESS_KEY = 'tf_access';
  // localStorage key for the long-lived refresh token (used to obtain new access tokens)
  private readonly REFRESH_KEY = 'tf_refresh';

  // Persist both tokens after a successful login, register, or token refresh.
  // Both tokens are saved together to keep them in sync.
  saveTokens(access: string, refresh: string) {
    localStorage.setItem(this.ACCESS_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
  }

  // Retrieve the access token — called by the auth interceptor before every HTTP request
  // to attach the Authorization header. Returns null if no token is stored (user not logged in).
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  // Retrieve the refresh token — called by AuthService.refresh() when the access token
  // has expired and a new one needs to be obtained from the backend.
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  // Remove both tokens from localStorage — called on logout or when a refresh fails,
  // effectively ending the user's session.
  clearTokens() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }
}
