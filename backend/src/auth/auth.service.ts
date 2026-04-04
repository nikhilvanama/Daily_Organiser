// Import BadRequestException for duplicate email/username errors during registration
// Import Injectable to register this service in NestJS dependency injection
// Import UnauthorizedException for invalid credentials during login and expired/missing tokens during refresh
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
// Import ConfigService to read JWT secrets and expiration times from environment variables (.env file)
import { ConfigService } from '@nestjs/config';
// Import JwtService to sign (generate) JWT access tokens and refresh tokens for authenticated users
import { JwtService } from '@nestjs/jwt';
// Import bcrypt for securely hashing passwords during registration and comparing hashes during login
import * as bcrypt from 'bcrypt';
// Import FirebaseService to read/write user data in the Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import RegisterDto which defines and validates the shape of registration request data (email, username, password, displayName)
import { RegisterDto } from './dto/register.dto';
// Import LoginDto which defines and validates the shape of login request data (email, password)
import { LoginDto } from './dto/login.dto';
// Import randomUUID to generate unique user IDs since Firebase Realtime Database does not auto-generate UUIDs
import { randomUUID } from 'crypto';

// @Injectable() marks this class as a NestJS service that can be injected into the AuthController
@Injectable()
export class AuthService {
  // Inject FirebaseService for database operations, JwtService for token generation, and ConfigService for reading env vars
  constructor(
    // FirebaseService provides CRUD methods for the Firebase Realtime Database where user records are stored
    private firebase: FirebaseService,
    // JwtService handles signing JWT tokens with different secrets and expiration times for access vs refresh tokens
    private jwt: JwtService,
    // ConfigService reads JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN from environment variables
    private config: ConfigService,
  ) {}

  // Handles new user registration: validates uniqueness, hashes password, creates user record, and returns tokens
  async register(dto: RegisterDto) {
    // Fetch all existing users from Firebase to check for duplicate email or username
    const users = await this.firebase.getList<any>('users');
    // Search for any user with the same email or username to prevent duplicate accounts
    const existing = users.find(
      (u: any) => u.email === dto.email || u.username === dto.username,
    );
    // If a user with the same email or username already exists, reject the registration
    if (existing) throw new BadRequestException('Email or username already taken');

    // Generate a new UUID to serve as the unique identifier for this user in the database
    const id = randomUUID();
    // Hash the plaintext password with bcrypt using 12 salt rounds for secure storage
    const passwordHash = await bcrypt.hash(dto.password, 12);
    // Build the complete user record with all fields needed for the Daily Organizer app
    const user = {
      id, // Unique user identifier used as the Firebase key and JWT subject claim
      email: dto.email, // User's email address used for login
      username: dto.username, // Unique username for display and identification
      passwordHash, // Bcrypt-hashed password (never stored in plaintext)
      displayName: dto.displayName ?? dto.username, // Friendly display name, defaults to username if not provided
      avatarUrl: null, // Profile picture URL, initially null until the user uploads one
      refreshToken: null, // Will be set after generating tokens below
      createdAt: new Date().toISOString(), // Timestamp when the account was created
      updatedAt: new Date().toISOString(), // Timestamp of the last account update
    };

    // Write the user record to Firebase at the path users/{id}
    await this.firebase.ref(`users/${id}`).set(user);

    // Generate both an access token (short-lived) and a refresh token (long-lived) for the new user
    const tokens = await this.generateTokens(id, user.email);
    // Store the refresh token in the user's database record so it can be validated during token refresh
    await this.firebase.update(`users/${id}`, { refreshToken: tokens.refreshToken });

    // Return the user's public profile data along with both tokens for the frontend to store
    return {
      user: { id, email: user.email, username: user.username, displayName: user.displayName, avatarUrl: null },
      ...tokens, // Spread accessToken and refreshToken into the response
    };
  }

  // Handles user login: verifies credentials and returns tokens if valid
  async login(dto: LoginDto) {
    // Fetch all users from Firebase to find the one matching the provided email address
    const users = await this.firebase.getList<any>('users');
    // Look up the user by email; returns undefined if no match is found
    const user = users.find((u: any) => u.email === dto.email);
    // If no user exists with this email, throw an unauthorized error with a generic message (avoids leaking info about which field is wrong)
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Compare the provided plaintext password with the stored bcrypt hash to verify the user's identity
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    // If the password does not match the hash, reject the login attempt
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Generate fresh access and refresh tokens for the authenticated user
    const tokens = await this.generateTokens(user.id, user.email);
    // Update the user's stored refresh token in Firebase so it matches the newly issued one
    await this.firebase.update(`users/${user.id}`, { refreshToken: tokens.refreshToken });

    // Return the user's public profile along with both tokens for the frontend
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens, // Spread accessToken and refreshToken into the response
    };
  }

  // Handles user logout by clearing the stored refresh token, effectively invalidating it
  async logout(userId: string) {
    // Set the user's refreshToken to null in Firebase, preventing any future token refresh attempts with the old token
    await this.firebase.update(`users/${userId}`, { refreshToken: null });
  }

  // Issues new access and refresh tokens when the current access token has expired but the refresh token is still valid
  async refreshTokens(userId: string) {
    // Fetch the user record from Firebase to verify the user still exists
    const user = await this.firebase.get<any>(`users/${userId}`);
    // If the user no longer exists in the database, reject the refresh attempt
    if (!user) throw new UnauthorizedException();

    // Generate a new pair of access and refresh tokens for the user
    const tokens = await this.generateTokens(user.id, user.email);
    // Rotate the refresh token in the database to the newly generated one (old refresh token becomes invalid)
    await this.firebase.update(`users/${userId}`, { refreshToken: tokens.refreshToken });
    // Return the new token pair to the frontend
    return tokens;
  }

  // Private helper that creates a signed JWT access token and refresh token pair using different secrets and expiration times
  private async generateTokens(userId: string, email: string) {
    // Build the JWT payload with the user's ID as the subject claim and their email
    const payload = { sub: userId, email };
    // Sign both tokens concurrently using Promise.all for better performance
    const [accessToken, refreshToken] = await Promise.all([
      // Sign the access token with JWT_SECRET and a short expiration (e.g., 15m) for secure, short-lived authentication
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN'),
      }),
      // Sign the refresh token with a separate JWT_REFRESH_SECRET and a longer expiration (e.g., 7d) for token renewal
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);
    // Return both tokens as an object to be spread into API responses
    return { accessToken, refreshToken };
  }
}
