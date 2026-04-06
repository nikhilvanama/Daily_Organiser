// Import the Routes type used to define the application's URL-to-component mapping
import { Routes } from '@angular/router';
// authGuard prevents unauthenticated users from accessing protected pages
import { authGuard } from './core/guards/auth.guard';
// noAuthGuard prevents already-logged-in users from seeing login/register pages
import { noAuthGuard } from './core/guards/no-auth.guard';

// Central route configuration for the Daily Organizer app.
// Uses lazy loading (loadComponent) for every feature page to keep the initial bundle small.
export const routes: Routes = [
  // Redirect the bare URL "/" to the dashboard — the app's default landing page
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth routes (login & register) are rendered WITHOUT the sidebar/layout wrapper
  // because unauthenticated users should see a clean, full-screen auth page.
  {
    path: 'auth',
    canActivate: [noAuthGuard], // Redirect to /dashboard if user is already logged in
    children: [
      {
        path: 'login',
        // Lazy-load the login component to avoid bundling auth pages with the main chunk
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        // Lazy-load the registration component
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      // Default /auth → /auth/login
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Authenticated routes — all wrapped inside the LayoutComponent which provides
  // the sidebar navigation, topbar, and toast container. This creates the "app shell".
  {
    path: '',
    canActivate: [authGuard], // Redirect to /auth/login if user has no token
    // Lazy-load the layout shell itself so it is only downloaded for authenticated users
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        // Dashboard shows today's plans, quick stats, and active goals summary
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'tasks',
        // Task list page — displays all plans (tasks, trips, meetings, etc.) with filters
        loadComponent: () =>
          import('./features/tasks/task-list/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'tasks/:id',
        // Task detail page — shows full task info, timer controls, and time tracking
        loadComponent: () =>
          import('./features/tasks/task-detail/task-detail.component').then((m) => m.TaskDetailComponent),
      },
      {
        path: 'goals',
        // Goal list page — displays all goals with progress bars and milestone counts
        loadComponent: () =>
          import('./features/goals/goal-list/goal-list.component').then((m) => m.GoalListComponent),
      },
      {
        path: 'goals/:id',
        // Goal detail page — shows milestones, mini-goals, and overall progress
        loadComponent: () =>
          import('./features/goals/goal-detail/goal-detail.component').then((m) => m.GoalDetailComponent),
      },
      {
        path: 'wishlist',
        // Buy list page — shows wishlist items as a product-card grid with purchase tracking
        loadComponent: () =>
          import('./features/wishlist/wishlist-list/wishlist-list.component').then((m) => m.WishlistListComponent),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then((m) => m.CalendarComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  // Wildcard route — catch any unmatched URL and redirect to the dashboard
  { path: '**', redirectTo: 'dashboard' },
];
