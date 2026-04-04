// Import Category because wishlist items can be organized into user-defined categories
import { Category } from './category.model';
// Import Priority from task model — wishlist items reuse the same LOW/MEDIUM/HIGH priority system
import { Priority } from './task.model';

// WishlistItemStatus tracks the purchasing lifecycle of a buy-list item
export type WishlistItemStatus = 'WANTED' | 'PURCHASED' | 'ARCHIVED';

// WishlistItem represents a product the user wants to buy.
// Mirrors the WishlistItem entity from the NestJS/Prisma backend.
export interface WishlistItem {
  id: string; // Unique identifier for the wishlist item
  name: string; // Product name displayed as the card title
  description: string | null; // Optional description or notes about the product
  price: number | null; // Optional price — used for total cost calculations
  currency: string; // Currency code (USD, EUR, GBP, INR) for price display formatting
  url: string | null; // Optional link to the product page (shown as "View" button)
  imageUrl: string | null; // Optional product image URL displayed in the card thumbnail
  status: WishlistItemStatus; // Current status — WANTED items can be marked as PURCHASED
  priority: Priority; // How urgently the user wants to buy this (reuses task priority levels)
  purchasedAt: string | null; // ISO timestamp when the item was marked as purchased
  userId: string; // Foreign key to the owning user
  categoryId: string | null; // Optional foreign key to a user-defined category
  category: Category | null; // Populated category object (included via backend JOIN)
  createdAt: string; // ISO timestamp of creation
  updatedAt: string; // ISO timestamp of last modification
}

// DTO for creating a new wishlist item — only name is required
export interface CreateWishlistItemDto {
  name: string; // Required: product name
  description?: string; // Optional description
  price?: number; // Optional price value
  currency?: string; // Currency code — defaults to 'USD' in the form
  url?: string; // Optional product URL
  imageUrl?: string; // Optional product image URL
  priority?: Priority; // Defaults to 'MEDIUM' in the form
  categoryId?: string; // Optional category assignment
}

// DTO for updating an existing wishlist item — all fields optional (PATCH semantics)
export type UpdateWishlistItemDto = Partial<CreateWishlistItemDto>;
