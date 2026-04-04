// Module decorator — used to organize the app into logical feature groups
import { Module } from '@nestjs/common';
// ConfigModule — loads .env file variables (JWT_SECRET, DATABASE_URL, etc.) into process.env
import { ConfigModule } from '@nestjs/config';
// APP_GUARD token — lets us register a guard globally so ALL routes are protected by default
import { APP_GUARD } from '@nestjs/core';
// AuthModule — handles user registration, login, JWT token generation and refresh
import { AuthModule } from './auth/auth.module';
// UsersModule — handles user profile updates (display name, avatar)
import { UsersModule } from './users/users.module';
// TasksModule — CRUD for daily plans (tasks, trips, trains, dinners, meetings, events, reminders)
import { TasksModule } from './tasks/tasks.module';
// GoalsModule — CRUD for goals with milestones and mini-goals (e.g., "Learn SQL", "JS Revision")
import { GoalsModule } from './goals/goals.module';
// WishlistModule — CRUD for the Buy List (products the user wants to purchase)
import { WishlistModule } from './wishlist/wishlist.module';
// CategoriesModule — CRUD for user-defined categories (Work, Personal, Travel, etc.)
import { CategoriesModule } from './categories/categories.module';
// DashboardModule — provides aggregate stats, today's plans, calendar data, and activity feed
import { DashboardModule } from './dashboard/dashboard.module';
// PrismaModule — provides the FirebaseService globally (connects to Firebase Realtime Database)
import { PrismaModule } from './prisma/prisma.module';
// JwtAuthGuard — the guard that checks JWT tokens on every request (unless marked @Public())
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// @Module decorator defines AppModule as the root module that imports all feature modules
@Module({
  imports: [
    // Load .env variables globally so any service can inject ConfigService to read them
    ConfigModule.forRoot({ isGlobal: true }),
    // Register FirebaseService as a global provider (available in all modules without importing)
    PrismaModule,
    // Feature modules — each handles a specific domain of the Daily Organizer app
    AuthModule,       // /api/auth/* — register, login, logout, refresh, me
    UsersModule,      // /api/users/* — profile updates
    TasksModule,      // /api/tasks/* — daily plans CRUD + timer
    GoalsModule,      // /api/goals/* — goals + milestones + mini-goals
    WishlistModule,   // /api/wishlist/* — buy list items
    CategoriesModule, // /api/categories/* — user categories
    DashboardModule,  // /api/dashboard/* — stats, activity, calendar data
  ],
  providers: [
    {
      // Register JwtAuthGuard as a GLOBAL guard — every route requires a valid JWT by default
      // Routes that should be public (login, register) use the @Public() decorator to opt out
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
// AppModule is the root of the application — NestJS bootstraps from this module
export class AppModule {}
