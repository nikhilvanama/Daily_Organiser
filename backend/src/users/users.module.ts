// Import Module decorator to define the Users module that handles user profile management in the Daily Organizer app
import { Module } from '@nestjs/common';
// Import UsersController which exposes the PATCH /users/me endpoint for updating the authenticated user's profile
import { UsersController } from './users.controller';
// Import UsersService which contains the business logic for updating user profile data (displayName, avatarUrl)
import { UsersService } from './users.service';

// Define the UsersModule which bundles the user profile controller and service together
@Module({
  // Register UsersController to handle HTTP requests to /users/* endpoints
  controllers: [UsersController],
  // Register UsersService as a provider for dependency injection into the controller
  providers: [UsersService],
  // Export UsersService so other modules can use it if needed (e.g., for looking up user data)
  exports: [UsersService],
})
export class UsersModule {}
