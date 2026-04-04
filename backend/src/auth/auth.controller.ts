// Import Body to extract the request body for register/login DTOs
// Import Controller to define this class as a NestJS REST controller handling /auth routes
// Import Get for the GET /auth/me endpoint that returns the current user profile
// Import Post for POST endpoints (register, login, logout, refresh)
// Import UseGuards to apply the JwtRefreshGuard specifically to the refresh endpoint
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
// Import AuthService which contains the business logic for registration, login, logout, and token refresh
import { AuthService } from './auth.service';
// Import RegisterDto to validate and type-check the registration request body (email, username, password, displayName)
import { RegisterDto } from './dto/register.dto';
// Import LoginDto to validate and type-check the login request body (email, password)
import { LoginDto } from './dto/login.dto';
// Import Public decorator to bypass the global JwtAuthGuard on routes that don't require authentication
import { Public } from '../common/decorators/public.decorator';
// Import CurrentUser decorator to extract the authenticated user (or a specific field like 'id') from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';
// Import JwtRefreshGuard which validates the refresh token from the request body instead of the access token from the Authorization header
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

// Define the controller at the /auth route prefix; all endpoints in this controller are under /auth/*
@Controller('auth')
export class AuthController {
  // Inject AuthService to delegate all authentication business logic
  constructor(private authService: AuthService) {}

  // @Public() bypasses JWT authentication since users cannot have a token before registering
  @Public()
  // POST /auth/register - Creates a new user account and returns user profile + access/refresh tokens
  @Post('register')
  register(@Body() dto: RegisterDto) {
    // Delegate to AuthService.register which validates uniqueness, hashes password, and generates tokens
    return this.authService.register(dto);
  }

  // @Public() bypasses JWT authentication since users need to log in to get a token in the first place
  @Public()
  // POST /auth/login - Authenticates a user with email/password and returns user profile + access/refresh tokens
  @Post('login')
  login(@Body() dto: LoginDto) {
    // Delegate to AuthService.login which verifies credentials and generates new tokens
    return this.authService.login(dto);
  }

  // POST /auth/logout - Clears the user's refresh token to invalidate future refresh attempts (requires valid access token)
  @Post('logout')
  logout(@CurrentUser('id') userId: string) {
    // Extract the authenticated user's id from the JWT and pass it to AuthService.logout
    return this.authService.logout(userId);
  }

  // @Public() bypasses the global JwtAuthGuard since the access token may be expired; uses JwtRefreshGuard instead
  @Public()
  // Apply JwtRefreshGuard which validates the refresh token from the request body using the jwt-refresh Passport strategy
  @UseGuards(JwtRefreshGuard)
  // POST /auth/refresh - Issues new access and refresh tokens using a valid refresh token (token rotation)
  @Post('refresh')
  refresh(@CurrentUser('id') userId: string) {
    // Extract the user's id from the validated refresh token and generate a new token pair
    return this.authService.refreshTokens(userId);
  }

  // GET /auth/me - Returns the current authenticated user's profile (protected by the global JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    // Return the full user object extracted from the JWT by the JwtStrategy (id, email, username, displayName, avatarUrl)
    return user;
  }
}
