// Import ExecutionContext to inspect the current request context and check route metadata
// Import Injectable to register this guard as a NestJS provider
import { ExecutionContext, Injectable } from '@nestjs/common';
// Import Reflector to read custom metadata (like IS_PUBLIC_KEY) attached to route handlers and controllers
import { Reflector } from '@nestjs/core';
// Import AuthGuard from Passport to create a guard that triggers the 'jwt' Passport strategy for token validation
import { AuthGuard } from '@nestjs/passport';
// Import IS_PUBLIC_KEY constant used to check if a route has been marked with the @Public() decorator
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

// @Injectable() allows NestJS to manage this guard and inject the Reflector dependency
@Injectable()
// Extends AuthGuard('jwt') to trigger the JwtStrategy for every incoming request; applied globally in the AppModule
// This guard protects all routes by default, requiring a valid JWT access token in the Authorization header
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Inject Reflector to access route metadata set by decorators like @Public()
  constructor(private reflector: Reflector) {
    // Call the parent AuthGuard constructor
    super();
  }

  // Override canActivate to check if the route is marked as public before enforcing JWT authentication
  canActivate(context: ExecutionContext) {
    // Check if the IS_PUBLIC_KEY metadata is set to true on either the route handler method or the controller class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      // Check the specific route handler method first (e.g., the register() method in AuthController)
      context.getHandler(),
      // Then check the controller class level (in case all routes in a controller are public)
      context.getClass(),
    ]);
    // If the route is marked as @Public(), skip JWT validation and allow the request through
    if (isPublic) return true;
    // Otherwise, delegate to the parent AuthGuard which triggers JwtStrategy to validate the access token
    return super.canActivate(context);
  }
}
