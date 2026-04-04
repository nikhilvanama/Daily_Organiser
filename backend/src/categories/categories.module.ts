// Import Module decorator to define the Categories module which provides color-coded organization for tasks and wishlist items
import { Module } from '@nestjs/common';
// Import CategoriesController which exposes CRUD endpoints for user-defined categories at /categories/*
import { CategoriesController } from './categories.controller';
// Import CategoriesService which contains the business logic for managing categories (create, read, update, delete)
import { CategoriesService } from './categories.service';

// Define the CategoriesModule which bundles the categories controller and service together
@Module({
  // Register CategoriesController to handle HTTP requests to /categories/* endpoints
  controllers: [CategoriesController],
  // Register CategoriesService as a provider for dependency injection into the controller
  providers: [CategoriesService],
  // Export CategoriesService so other modules (like tasks or wishlist) could use it if needed for category lookups
  exports: [CategoriesService],
})
export class CategoriesModule {}
