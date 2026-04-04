// Import Injectable to register this guard as a NestJS provider for dependency injection
import { Injectable } from '@nestjs/common';
// Import AuthGuard from Passport to create a guard that triggers a specific Passport strategy
import { AuthGuard } from '@nestjs/passport';

// @Injectable() allows NestJS to manage this guard's lifecycle
@Injectable()
// Extends AuthGuard('jwt-refresh') to trigger the JwtRefreshStrategy specifically for the POST /auth/refresh endpoint
// Unlike JwtAuthGuard which extracts tokens from the Authorization header, this guard expects the refresh token in the request body
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
