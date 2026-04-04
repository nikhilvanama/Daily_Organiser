// Import createParamDecorator to build a custom parameter decorator that extracts data from the request object
// Import ExecutionContext to access the current HTTP request context within the decorator
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Custom parameter decorator that extracts the authenticated user from the request object (set by JwtStrategy after token validation)
// Usage: @CurrentUser() gets the full user object, @CurrentUser('id') gets just the user's id
// Used across all protected controllers (tasks, goals, wishlist, categories, dashboard, users, auth) to identify the logged-in user
export const CurrentUser = createParamDecorator(
  // data is the optional property name (e.g., 'id', 'email'); ctx provides access to the HTTP request
  (data: string | undefined, ctx: ExecutionContext) => {
    // Switch to the HTTP context and extract the underlying Express request object
    const request = ctx.switchToHttp().getRequest();
    // The user object is attached to the request by Passport's JwtStrategy after successful JWT validation
    const user = request.user;
    // If a specific property was requested (e.g., 'id'), return just that field; otherwise return the entire user object
    return data ? user?.[data] : user;
  },
);
