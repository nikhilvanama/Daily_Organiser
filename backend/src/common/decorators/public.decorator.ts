// Import SetMetadata from NestJS to attach custom metadata to route handlers, used by guards to determine access control
import { SetMetadata } from '@nestjs/common';

// Metadata key constant used by JwtAuthGuard to check if a route is marked as public (no JWT token required)
export const IS_PUBLIC_KEY = 'isPublic';
// Custom decorator that marks a controller method as publicly accessible, bypassing JWT authentication
// Applied to routes like POST /auth/register, POST /auth/login, and POST /auth/refresh that must work without a valid access token
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
