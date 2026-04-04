// Import Body to extract the request body containing profile update fields
// Import Controller to define this class as a NestJS REST controller handling /users routes
// Import Patch to handle HTTP PATCH requests for partial profile updates
import { Body, Controller, Patch } from '@nestjs/common';
// Import UsersService which contains the business logic for updating user profile data in Firebase
import { UsersService } from './users.service';
// Import UpdateUserDto to validate the incoming profile update fields (displayName, avatarUrl)
import { UpdateUserDto } from './dto/update-user.dto';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Define the controller at the /users route prefix; protected by the global JwtAuthGuard (requires valid access token)
@Controller('users')
export class UsersController {
  // Inject UsersService to delegate profile update business logic
  constructor(private usersService: UsersService) {}

  // PATCH /users/me - Updates the authenticated user's profile (displayName, avatarUrl)
  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    // Extract the authenticated user's id via @CurrentUser('id') and pass it with the update DTO to the service
    return this.usersService.updateMe(userId, dto);
  }
}
