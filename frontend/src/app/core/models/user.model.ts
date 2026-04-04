// User model interface — mirrors the User entity returned by the NestJS backend.
// Used throughout the app to type-check user profile data (sidebar, topbar, auth state).
export interface User {
  id: string; // Firebase UID or database primary key for the user
  email: string; // User's email address, used for login and displayed in the sidebar
  username: string; // Unique handle chosen at registration, used as a fallback display name
  displayName: string | null; // Optional friendly name shown in the UI (e.g., "John Doe")
  avatarUrl: string | null; // Optional profile picture URL — currently unused but reserved for future avatar support
}
