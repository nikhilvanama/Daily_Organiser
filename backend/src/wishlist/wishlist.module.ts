// Import Module decorator to define the Wishlist module which handles the "buy list" feature in the Daily Organizer app
import { Module } from '@nestjs/common';
// Import WishlistController which exposes CRUD endpoints and a purchase action for wishlist items at /wishlist/*
import { WishlistController } from './wishlist.controller';
// Import WishlistService which contains the business logic for managing wishlist (buy list) items with categories and purchase tracking
import { WishlistService } from './wishlist.service';

// Define the WishlistModule which bundles the wishlist controller and service together
@Module({
  // Register WishlistController to handle HTTP requests to /wishlist/* endpoints (CRUD + purchase)
  controllers: [WishlistController],
  // Register WishlistService as a provider for dependency injection into the controller
  providers: [WishlistService],
})
export class WishlistModule {}
