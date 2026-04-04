// Import class-validator decorators to validate the wishlist item creation request body
// IsNumber ensures price is a numeric value
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// IsUrl validates URL format (imported but validation is done via @IsString for flexibility)
// MaxLength limits item name length
// Min ensures price is non-negative
import { IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /wishlist request body
// Represents an item the user wants to buy, with price tracking and product link support
export class CreateWishlistItemDto {
  // Validates that the name is a string type (required field - what the user wants to buy)
  @IsString()
  // Enforces a maximum of 200 characters for the item name
  @MaxLength(200)
  name: string;

  // Marks description as optional; items can be added with just a name
  @IsOptional()
  // Validates that description is a string if provided (notes about the item)
  @IsString()
  description?: string;

  // Marks price as optional; useful for budget tracking on the dashboard
  @IsOptional()
  // Validates that price is a numeric value if provided
  @IsNumber()
  // Enforces a minimum value of 0 (no negative prices)
  @Min(0)
  price?: number;

  // Marks currency as optional; defaults to 'USD' in the service if not provided
  @IsOptional()
  // Validates that currency is a string if provided (e.g., "USD", "EUR", "GBP")
  @IsString()
  currency?: string;

  // Marks url as optional; a link to the product page where the item can be purchased
  @IsOptional()
  // Validates that url is a string if provided (product page link for quick access)
  @IsString()
  url?: string;

  // Marks imageUrl as optional; a link to an image of the product for visual identification
  @IsOptional()
  // Validates that imageUrl is a string if provided
  @IsString()
  imageUrl?: string;

  // Marks priority as optional; defaults to 'MEDIUM' in the service if not provided
  @IsOptional()
  // Validates that priority is a string if provided (values: LOW, MEDIUM, HIGH)
  @IsString()
  priority?: string;

  // Marks categoryId as optional; links the item to a user-defined category for organization
  @IsOptional()
  // Validates that categoryId is a string (UUID referencing a record in the categories collection)
  @IsString()
  categoryId?: string;
}
