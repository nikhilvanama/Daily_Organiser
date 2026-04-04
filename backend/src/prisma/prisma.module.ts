// Import Global decorator to make this module's providers available app-wide without needing to import it in every feature module
// Import Module decorator to define this class as a NestJS module that bundles the Firebase database service
import { Global, Module } from '@nestjs/common';
// Import FirebaseService which wraps all Firebase Realtime Database operations (CRUD) for the Daily Organizer app
import { FirebaseService } from './firebase.service';

// @Global() ensures FirebaseService is injectable everywhere (tasks, goals, wishlist, auth, etc.) without explicit imports
@Global()
// @Module registers FirebaseService as both a provider (for dependency injection) and an export (so other modules can use it)
@Module({
  // Register FirebaseService so NestJS can instantiate and inject it into any service that needs database access
  providers: [FirebaseService],
  // Export FirebaseService so all feature modules (tasks, goals, wishlist, categories, dashboard, auth, users) can inject it
  exports: [FirebaseService],
})
// Named PrismaModule for historical reasons (originally used Prisma ORM), now wraps Firebase Realtime Database connectivity
export class PrismaModule {}
