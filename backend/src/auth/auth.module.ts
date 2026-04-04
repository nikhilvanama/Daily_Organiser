// Import Module decorator to define the authentication module that bundles all auth-related providers and controllers
import { Module } from '@nestjs/common';
// Import JwtModule to enable JWT token signing and verification for access tokens and refresh tokens
import { JwtModule } from '@nestjs/jwt';
// Import PassportModule to integrate Passport.js authentication strategies (JWT and JWT-refresh) with NestJS
import { PassportModule } from '@nestjs/passport';
// Import AuthService which contains the core authentication logic: register, login, logout, refresh tokens
import { AuthService } from './auth.service';
// Import AuthController which exposes the /auth endpoints (register, login, logout, refresh, me)
import { AuthController } from './auth.controller';
// Import JwtStrategy which validates access tokens from the Authorization header on every protected request
import { JwtStrategy } from './strategies/jwt.strategy';
// Import JwtRefreshStrategy which validates refresh tokens sent in the request body during token renewal
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
// Import JwtAuthGuard which is the global guard that protects all routes by default, unless marked with @Public()
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Define the AuthModule which wires together all authentication-related components for the Daily Organizer app
@Module({
  // Register PassportModule for strategy-based auth, and JwtModule with empty config (secrets are provided per-sign call in AuthService)
  imports: [PassportModule, JwtModule.register({})],
  // Register AuthController to handle HTTP requests to /auth/* endpoints
  controllers: [AuthController],
  // Register AuthService for business logic, both JWT strategies for token validation, and JwtAuthGuard for route protection
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, JwtAuthGuard],
  // Export JwtAuthGuard so it can be applied globally in the root AppModule to protect all routes by default
  exports: [JwtAuthGuard],
})
export class AuthModule {}
