// Import PartialType from NestJS mapped-types to create a DTO where all fields from CreateWishlistItemDto become optional
import { PartialType } from '@nestjs/mapped-types';
// Import CreateWishlistItemDto as the base DTO whose fields will be made optional for partial updates
import { CreateWishlistItemDto } from './create-wishlist-item.dto';

// Data Transfer Object for PATCH /wishlist/:id requests; extends CreateWishlistItemDto with all fields optional
// This allows the frontend to send only the fields that changed (e.g., just price to update the price without affecting other fields)
export class UpdateWishlistItemDto extends PartialType(CreateWishlistItemDto) {}
