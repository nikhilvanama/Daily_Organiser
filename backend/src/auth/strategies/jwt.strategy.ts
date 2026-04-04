// Import Injectable to register this strategy as a NestJS provider
// Import UnauthorizedException to reject requests with invalid or expired access tokens
import { Injectable, UnauthorizedException } from '@nestjs/common';
// Import ConfigService to read the JWT_SECRET from environment variables for token verification
import { ConfigService } from '@nestjs/config';
// Import PassportStrategy to integrate Passport.js strategy pattern with NestJS dependency injection
import { PassportStrategy } from '@nestjs/passport';
// Import ExtractJwt to define where to find the JWT in the request (Authorization: Bearer <token>)
// Import Strategy (passport-jwt Strategy class) as the base class for JWT-based authentication
import { ExtractJwt, Strategy } from 'passport-jwt';
// Import FirebaseService to look up the user in the Firebase Realtime Database after token validation
import { FirebaseService } from '../../prisma/firebase.service';

// @Injectable() allows NestJS to manage this strategy's lifecycle and inject dependencies
@Injectable()
// Extends PassportStrategy with the 'jwt' name; this strategy is triggered by JwtAuthGuard on protected routes
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // ConfigService provides the JWT_SECRET environment variable used to verify the access token signature
    config: ConfigService,
    // FirebaseService is used to fetch the full user record from the database after the token is verified
    private firebase: FirebaseService,
  ) {
    // Call the parent Strategy constructor with configuration options for JWT extraction and verification
    super({
      // Extract the JWT from the Authorization header as a Bearer token (e.g., "Authorization: Bearer eyJ...")
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Use the JWT_SECRET from environment variables to verify the token's signature; the ! asserts it is defined
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Called by Passport after the JWT is successfully verified; the payload contains the decoded token claims (sub, email)
  async validate(payload: { sub: string; email: string }) {
    // Fetch the user from Firebase using the 'sub' claim (user ID) to ensure the user still exists in the database
    const user = await this.firebase.get<any>(`users/${payload.sub}`);
    // If the user no longer exists (e.g., account deleted), reject the request
    if (!user) throw new UnauthorizedException();
    // Return a sanitized user object (without passwordHash or refreshToken) that gets attached to request.user
    // This object is what @CurrentUser() decorator extracts in controllers
    return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
  }
}
