// Development environment configuration — used during `ng serve` local development.
// Angular's file replacement mechanism swaps this file with environment.prod.ts at build time.
export const environment = {
  production: false, // Indicates this is a development build (enables debugging tools like Angular DevTools)
  apiUrl: 'http://localhost:3000/api', // Base URL for the NestJS backend running locally on port 3000
};
