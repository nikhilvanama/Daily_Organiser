// Production environment configuration — used when building with `ng build --configuration production`.
// Angular's file replacement mechanism swaps environment.ts with this file at build time.
export const environment = {
  production: true, // Indicates this is a production build (disables dev-only checks and logging)
  apiUrl: '/api', // Relative path — in production the frontend is served from the same domain as the API,
  // so requests go to the same origin (e.g., https://dailyorganizer.app/api) via a reverse proxy
};
