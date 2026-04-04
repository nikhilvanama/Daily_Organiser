// Import class-validator decorators to validate incoming registration data in the request body
// IsEmail ensures the email field is a valid email format
// IsString ensures string type for username, password, and displayName
// MinLength/MaxLength enforce length constraints on fields
// IsOptional marks displayName as not required
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /auth/register request body
export class RegisterDto {
  // Validates that the email field is a properly formatted email address (e.g., user@example.com)
  @IsEmail()
  email: string;

  // Validates that the username is a string type
  @IsString()
  // Enforces a minimum length of 3 characters for the username to ensure meaningful usernames
  @MinLength(3)
  // Enforces a maximum length of 30 characters for the username to keep display names manageable
  @MaxLength(30)
  username: string;

  // Validates that the password is a string type
  @IsString()
  // Enforces a minimum length of 8 characters for password security
  @MinLength(8)
  password: string;

  // Marks displayName as optional; if not provided, AuthService defaults it to the username
  @IsOptional()
  // Validates that displayName is a string if provided
  @IsString()
  // Enforces a maximum length of 50 characters for the display name
  @MaxLength(50)
  displayName?: string;
}
