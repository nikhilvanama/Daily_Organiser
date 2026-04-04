// Import class-validator decorators to validate the category creation request body
// IsHexColor validates that the color field is a valid hex color code (e.g., "#6366f1")
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// MaxLength limits category name length
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /categories request body
// Categories provide color-coded organization for tasks, trips, meetings, dinners, and wishlist items
export class CreateCategoryDto {
  // Validates that the name is a string type (required field - the category label like "Work", "Personal", "Shopping")
  @IsString()
  // Enforces a maximum of 40 characters for the category name to keep UI labels compact
  @MaxLength(40)
  name: string;

  // Marks color as optional; defaults to indigo (#6366f1) in the service if not provided
  @IsOptional()
  // Validates that color is a valid hex color code for consistent color-coded UI rendering
  @IsHexColor()
  color?: string;

  // Marks icon as optional; allows the user to assign an icon to the category for visual identification
  @IsOptional()
  // Validates that icon is a string if provided (e.g., a Material Icons name like "work" or "shopping_cart")
  @IsString()
  icon?: string;
}
