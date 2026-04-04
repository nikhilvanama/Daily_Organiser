// Import class-validator decorators to validate the profile update request body
// IsOptional marks fields as not required (partial update)
// IsString ensures the field value is a string type
// MaxLength enforces a character limit on the display name
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the PATCH /users/me request body
// All fields are optional since this is a partial update (user can update just displayName, just avatarUrl, or both)
export class UpdateUserDto {
  // Marks displayName as optional so the user can update their avatar without changing their name
  @IsOptional()
  // Validates that displayName is a string if provided
  @IsString()
  // Enforces a maximum of 50 characters for the display name to keep it reasonable for UI display
  @MaxLength(50)
  displayName?: string;

  // Marks avatarUrl as optional so the user can update their name without changing their avatar
  @IsOptional()
  // Validates that avatarUrl is a string (URL to the user's profile picture) if provided
  @IsString()
  avatarUrl?: string;
}
