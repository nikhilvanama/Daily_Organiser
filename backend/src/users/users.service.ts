import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../prisma/firebase.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  async getProfile(userId: string) {
    const user = await this.firebase.get<any>(`users/${userId}`);
    if (!user) return null;
    // Return all profile fields except sensitive data
    const { passwordHash, refreshToken, googleAccessToken, googleRefreshToken, googleTokenExpiry, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Firebase rejects undefined values — strip them out
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) clean[key] = val;
    }
    await this.firebase.update(`users/${userId}`, clean);
    return this.getProfile(userId);
  }
}
