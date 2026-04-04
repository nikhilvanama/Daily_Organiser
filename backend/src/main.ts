// Import NestFactory — the core factory that creates the NestJS application instance
import { NestFactory } from '@nestjs/core';
// Import ValidationPipe — automatically validates incoming request bodies against DTO rules
import { ValidationPipe } from '@nestjs/common';
// Import the root AppModule which registers all feature modules (auth, tasks, goals, etc.)
import { AppModule } from './app.module';

// bootstrap() is the entry point — it initializes and starts the NestJS server
async function bootstrap() {
  // Create the NestJS app instance from AppModule (loads all controllers, services, guards)
  const app = await NestFactory.create(AppModule);

  // Prefix all routes with /api — so /tasks becomes /api/tasks, /auth becomes /api/auth, etc.
  app.setGlobalPrefix('api');

  // Enable global validation on all incoming requests using class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip any properties not defined in the DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties are sent
      transform: true,           // Auto-transform payloads to DTO class instances
    }),
  );

  // Enable CORS so the Angular frontend (running on port 4200) can call the API
  app.enableCors({
    origin: 'http://localhost:4200', // Only allow requests from our Angular frontend
    credentials: true,               // Allow cookies and auth headers to be sent
  });

  // Read the port from environment variables or default to 3000
  const port = process.env.PORT ?? 3000;
  // Start the HTTP server and listen for incoming requests
  await app.listen(port);
  // Log a confirmation message showing the API URL
  console.log(`Daily Organizer API running on http://localhost:${port}/api`);
}
// Call bootstrap to start the application
bootstrap();
