// Import the functional interceptor type and HttpErrorResponse for typing error handling
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
// inject() is used inside functional interceptors to access services from Angular's DI
import { inject } from '@angular/core';
// RxJS operators: catchError handles errors, switchMap chains observables, throwError re-throws
import { catchError, switchMap, throwError } from 'rxjs';
// TokenStorageService provides the stored JWT access token
import { TokenStorageService } from '../services/token-storage.service';
// AuthService provides the refresh() and logout() methods
import { AuthService } from '../services/auth.service';

// Module-level flag to prevent multiple simultaneous refresh attempts.
// Without this, parallel 401 responses could trigger multiple refresh requests.
let isRefreshing = false;

// Functional HTTP interceptor (Angular 19 style — no class-based interceptor needed).
// This interceptor does two things:
// 1. Attaches the Bearer token to every outgoing request (if a token exists)
// 2. Handles 401 errors by transparently refreshing the access token and retrying
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject services within the interceptor function (functional DI pattern)
  const tokens = inject(TokenStorageService);
  const auth = inject(AuthService);

  // Read the current access token from localStorage
  const token = tokens.getAccessToken();
  // If a token exists, clone the request and add the Authorization header;
  // otherwise, forward the original request unchanged.
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Send the (possibly modified) request and handle the response
  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only attempt a token refresh if:
      // 1. The response is 401 Unauthorized
      // 2. We are not already in the middle of a refresh
      // 3. The failing request is NOT an auth endpoint itself (prevents infinite loops)
      if (err.status === 401 && !isRefreshing && !req.url.includes('/auth/')) {
        isRefreshing = true; // Lock the refresh flag to prevent duplicate refresh calls
        return auth.refresh().pipe(
          switchMap((res) => {
            isRefreshing = false; // Unlock — refresh succeeded
            // Retry the original request with the new access token
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } });
            return next(retried);
          }),
          catchError((refreshErr) => {
            isRefreshing = false; // Unlock — refresh failed
            // If refresh fails, the session is expired — log the user out
            auth.logout();
            return throwError(() => refreshErr); // Propagate the error to the caller
          }),
        );
      }
      // For non-401 errors or auth endpoint errors, just re-throw
      return throwError(() => err);
    }),
  );
};
