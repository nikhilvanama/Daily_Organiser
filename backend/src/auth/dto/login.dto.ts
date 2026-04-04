// Import class-validator decorators to validate the login request body
// IsEmail ensures the email field is a valid email format
// IsString ensures the password field is a string type
import { IsEmail, IsString } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /auth/login request body
export class LoginDto {
  // Validates that the email field contains a properly formatted email address used to look up the user in Firebase
  @IsEmail()
  email: string;

  // Validates that the password field is a string; this plaintext password will be compared against the stored bcrypt hash
  @IsString()
  password: string;
}
