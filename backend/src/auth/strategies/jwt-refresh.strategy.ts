// Import Injectable to register this strategy as a NestJS provider for dependency injection
// Import UnauthorizedException to reject requests with invalid, expired, or mismatched refresh tokens
import { Injectable, UnauthorizedException } from '@nestjs/common';
// Import ConfigService to read the JWT_REFRESH_SECRET from environment variables for refresh token verification
import { ConfigService } from '@nestjs/config';
// Import PassportStrategy to integrate Passport.js strategy pattern with NestJS
import { PassportStrategy } from '@nestjs/passport';
// Import ExtractJwt to define where to find the refresh token in the request
// Import Strategy (passport-jwt Strategy class) as the base class for JWT-based authentication
import { ExtractJwt, Strategy } from 'passport-jwt';
// Import Express Request type to access the raw request body and extract the refresh token for comparison
import { Request } from 'express';
// Import FirebaseService to look up the user and their stored refresh token in the Firebase Realtime Database
import { FirebaseService } from '../../prisma/firebase.service';

// @Injectable() allows NestJS to manage this strategy's lifecycle and inject dependencies
@Injectable()
// Extends PassportStrategy with the 'jwt-refresh' name; this strategy is triggered by JwtRefreshGuard on the refresh endpoint
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    // ConfigService provides the JWT_REFRESH_SECRET environment variable used to verify the refresh token signature
    config: ConfigService,
    // FirebaseService is used to fetch the user's stored refresh token from the database for comparison
    private firebase: FirebaseService,
  ) {
    // Call the parent Strategy constructor with configuration options specific to refresh token handling
    super({
      // Extract the JWT refresh token from the 'refreshToken' field in the request body (not from Authorization header)
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      // Use the JWT_REFRESH_SECRET (different from the access token secret) to verify the refresh token's signature
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,
      // Pass the Express request object to the validate() method so we can access the raw refresh token from the body
      passReqToCallback: true,
    });
  }

  // Called by Passport after the refresh token JWT is verified; validates the token matches what is stored in the database
  async validate(req: Request, payload: { sub: string }) {
    // Extract the raw refresh token string from the request body for comparison with the stored token
    const refreshToken = req.body?.refreshToken;
    // If no refresh token was provided in the request body, reject the request
    if (!refreshToken) throw new UnauthorizedException();
    // Fetch the user record from Firebase using the 'sub' claim (user ID) from the decoded token
    const user = await this.firebase.get<any>(`users/${payload.sub}`);
    // Verify the user exists AND that the provided refresh token matches the one stored in the database (prevents reuse of old tokens)
    if (!user || user.refreshToken !== refreshToken) throw new UnauthorizedException();
    // Return the user object which gets attached to request.user for the controller to use via @CurrentUser()
    return user;
  }
}
