// Import ForbiddenException to block access when a user tries to modify another user's wishlist item
// Import Injectable to register this service in NestJS dependency injection
// Import NotFoundException when a requested wishlist item does not exist in the database
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// Import FirebaseService to perform CRUD operations on wishlist items in the Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import CreateWishlistItemDto which defines and validates the fields for creating a new wishlist (buy list) item
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
// Import UpdateWishlistItemDto which extends CreateWishlistItemDto with all fields optional for partial updates
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
// Import randomUUID to generate unique IDs for wishlist items
import { randomUUID } from 'crypto';

// @Injectable() marks this class as a NestJS service that can be injected into WishlistController
@Injectable()
export class WishlistService {
  // Inject FirebaseService to perform database operations on the 'wishlist' and 'categories' collections
  constructor(private firebase: FirebaseService) {}

  // Retrieves all wishlist items for the authenticated user, with optional filtering by status, priority, and categoryId
  async findAll(userId: string, query: Record<string, string>) {
    // Destructure optional filter parameters from the query string
    const { status, priority, categoryId } = query;
    // Fetch all wishlist items from the 'wishlist' collection in Firebase
    let items = await this.firebase.getList<any>('wishlist');
    // Filter to only include items belonging to the authenticated user
    items = items.filter((i: any) => i.userId === userId);
    // Apply optional status filter (e.g., WANTED, PURCHASED) if provided in the query string
    if (status) items = items.filter((i: any) => i.status === status);
    // Apply optional priority filter (e.g., LOW, MEDIUM, HIGH) if provided in the query string
    if (priority) items = items.filter((i: any) => i.priority === priority);
    // Apply optional categoryId filter to show items from a specific category
    if (categoryId) items = items.filter((i: any) => i.categoryId === categoryId);
    // Attach the full category object to each item in parallel and return the enriched list
    return Promise.all(items.map((i: any) => this.withCategory(i)));
  }

  // Retrieves a single wishlist item by ID, verifying that it belongs to the authenticated user
  async findOne(userId: string, id: string) {
    // Fetch the wishlist item from Firebase by its unique ID
    const item = await this.firebase.get<any>(`wishlist/${id}`);
    // If the item does not exist, throw a 404 error
    if (!item) throw new NotFoundException('Item not found');
    // If the item belongs to a different user, throw a 403 error to prevent unauthorized access
    if (item.userId !== userId) throw new ForbiddenException();
    // Attach the category object and return the enriched item
    return this.withCategory(item);
  }

  // Creates a new wishlist (buy list) item for the authenticated user with default status WANTED
  async create(userId: string, dto: CreateWishlistItemDto) {
    // Generate a unique UUID for the new wishlist item
    const id = randomUUID();
    // Build the complete wishlist item record with defaults for optional fields
    const item = {
      id, // Unique wishlist item identifier used as the Firebase key
      name: dto.name, // Item name (required) - what the user wants to buy
      description: dto.description ?? null, // Optional description or notes about the item
      price: dto.price ?? null, // Optional price of the item for budget tracking
      currency: dto.currency ?? 'USD', // Currency for the price; defaults to USD
      url: dto.url ?? null, // Optional link to the product page for quick access
      imageUrl: dto.imageUrl ?? null, // Optional image URL for visual identification
      status: 'WANTED', // Initial status is WANTED; changes to PURCHASED when the user buys it
      priority: dto.priority ?? 'MEDIUM', // Priority level: LOW, MEDIUM, or HIGH; defaults to MEDIUM
      purchasedAt: null, // Timestamp set when the item is marked as purchased; null until then
      userId, // Foreign key linking this item to the authenticated user who added it
      categoryId: dto.categoryId ?? null, // Optional foreign key linking to a category for organization
      createdAt: new Date().toISOString(), // Timestamp when the item was added to the wishlist
      updatedAt: new Date().toISOString(), // Timestamp of the last modification
    };
    // Write the wishlist item record to Firebase at wishlist/{id}
    await this.firebase.ref(`wishlist/${id}`).set(item);
    // Attach the category object (if categoryId is set) and return the enriched item
    return this.withCategory(item);
  }

  // Updates an existing wishlist item with the provided fields (partial update)
  async update(userId: string, id: string, dto: UpdateWishlistItemDto) {
    // Verify the item exists and belongs to the authenticated user before allowing modifications
    await this.ensureOwnership(userId, id);
    // Apply the partial update to the item in Firebase with an updated timestamp
    await this.firebase.update(`wishlist/${id}`, { ...dto, updatedAt: new Date().toISOString() });
    // Fetch the fully updated item record from Firebase
    const updated = await this.firebase.get<any>(`wishlist/${id}`);
    // Attach the category and return the enriched updated item
    return this.withCategory(updated);
  }

  // Marks a wishlist item as purchased by updating its status and recording the purchase timestamp
  async purchase(userId: string, id: string) {
    // Verify the item exists and belongs to the authenticated user
    await this.ensureOwnership(userId, id);
    // Update the item's status to PURCHASED and record when the purchase happened
    await this.firebase.update(`wishlist/${id}`, {
      status: 'PURCHASED', // Change status from WANTED to PURCHASED
      purchasedAt: new Date().toISOString(), // Record the purchase timestamp
    });
    // Return the updated item with its new purchase status
    return this.firebase.get(`wishlist/${id}`);
  }

  // Deletes a wishlist item from the database after verifying ownership
  async remove(userId: string, id: string) {
    // Verify the item exists and belongs to the authenticated user before deletion
    await this.ensureOwnership(userId, id);
    // Remove the item record from Firebase permanently
    await this.firebase.remove(`wishlist/${id}`);
    // Return a confirmation object indicating successful deletion
    return { deleted: true };
  }

  // Private helper that verifies a wishlist item exists and belongs to the specified user; throws exceptions if not
  private async ensureOwnership(userId: string, id: string) {
    // Fetch the wishlist item from Firebase by its ID
    const item = await this.firebase.get<any>(`wishlist/${id}`);
    // If the item does not exist, throw a 404 Not Found error
    if (!item) throw new NotFoundException('Item not found');
    // If the item belongs to a different user, throw a 403 Forbidden error
    if (item.userId !== userId) throw new ForbiddenException();
    // Return the item data so callers can use it without an extra database read
    return item;
  }

  // Private helper that attaches the full category object to a wishlist item by looking up the categoryId in Firebase
  private async withCategory(item: any) {
    // If the item has a categoryId, fetch the category record and attach it
    if (item.categoryId) {
      item.category = await this.firebase.get(`categories/${item.categoryId}`) ?? null;
    } else {
      // If no categoryId is set, explicitly set category to null for consistent API response shape
      item.category = null;
    }
    // Return the item with the category object attached
    return item;
  }
}
