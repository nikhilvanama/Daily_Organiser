// Import Injectable to register this service in NestJS dependency injection container
import { Injectable } from '@nestjs/common';
// Import FirebaseService to read and update user records in the Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import UpdateUserDto which defines and validates the allowed fields for profile updates (displayName, avatarUrl)
import { UpdateUserDto } from './dto/update-user.dto';

// @Injectable() marks this class as a NestJS service that can be injected into UsersController
@Injectable()
export class UsersService {
  // Inject FirebaseService to perform database operations on user records
  constructor(private firebase: FirebaseService) {}

  // Updates the authenticated user's profile with the provided fields and returns the updated public profile
  async updateMe(userId: string, dto: UpdateUserDto) {
    // Update only the fields present in the DTO (displayName, avatarUrl) for the user at users/{userId}
    await this.firebase.update(`users/${userId}`, dto);
    // Fetch the updated user record from Firebase to return the latest data
    const user = await this.firebase.get<any>(`users/${userId}`);
    // Return only the public-facing fields (excludes passwordHash, refreshToken) to avoid leaking sensitive data
    return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
  }
}
