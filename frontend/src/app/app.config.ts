// Import ApplicationConfig type and zone change detection provider from Angular core
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
// provideRouter registers the route configuration with the Angular DI system
import { provideRouter } from '@angular/router';
// provideHttpClient sets up HttpClient; withInterceptors attaches functional interceptors
import { provideHttpClient, withInterceptors } from '@angular/common/http';
// Import the app's route definitions (lazy-loaded feature routes)
import { routes } from './app.routes';
// Import the auth interceptor that attaches JWT tokens and handles 401 refresh logic
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Application-wide configuration object used by bootstrapApplication() in main.ts.
// This replaces the traditional AppModule providers array in Angular 19 standalone apps.
export const appConfig: ApplicationConfig = {
  providers: [
    // Enable zone.js change detection with event coalescing — batches multiple
    // browser events in the same tick into a single change detection cycle for performance
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Register all route definitions so the Router can resolve paths to components
    provideRouter(routes),
    // Set up HttpClient globally and wire in the auth interceptor so every outgoing
    // HTTP request automatically includes the Bearer token header
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
