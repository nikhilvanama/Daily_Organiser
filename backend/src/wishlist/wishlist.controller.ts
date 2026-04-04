// Import Body to extract request body data for creating/updating wishlist items
// Import Controller to define this class as a NestJS REST controller handling /wishlist routes
// Import Delete for removing wishlist items
// Import Get for retrieving wishlist items
// Import Param to extract route parameters (item id)
// Import Patch for partial updates and marking items as purchased
// Import Post for creating new wishlist items
// Import Query to extract URL query parameters for filtering items
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
// Import WishlistService which contains the business logic for all wishlist (buy list) operations
import { WishlistService } from './wishlist.service';
// Import CreateWishlistItemDto to validate the request body when adding a new item to the buy list
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
// Import UpdateWishlistItemDto to validate the request body when partially updating an existing item
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Define the controller at the /wishlist route prefix; all endpoints are protected by the global JwtAuthGuard
@Controller('wishlist')
export class WishlistController {
  // Inject WishlistService to delegate all wishlist-related business logic
  constructor(private wishlistService: WishlistService) {}

  // GET /wishlist - Returns all wishlist items for the authenticated user with optional query filters (status, priority, categoryId)
  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: Record<string, string>) {
    // Pass the user ID and query parameters to the service for filtered item retrieval
    return this.wishlistService.findAll(userId, query);
  }

  // GET /wishlist/:id - Returns a single wishlist item by ID, verifying it belongs to the authenticated user
  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.wishlistService.findOne(userId, id);
  }

  // POST /wishlist - Creates a new wishlist (buy list) item for the authenticated user
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWishlistItemDto) {
    return this.wishlistService.create(userId, dto);
  }

  // PATCH /wishlist/:id - Partially updates an existing wishlist item (name, price, priority, etc.)
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateWishlistItemDto) {
    return this.wishlistService.update(userId, id, dto);
  }

  // PATCH /wishlist/:id/purchase - Marks a wishlist item as purchased (changes status from WANTED to PURCHASED)
  @Patch(':id/purchase')
  purchase(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.wishlistService.purchase(userId, id);
  }

  // DELETE /wishlist/:id - Permanently removes a wishlist item from the database
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.wishlistService.remove(userId, id);
  }
}
