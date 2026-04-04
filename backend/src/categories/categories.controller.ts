// Import Body to extract request body data for creating/updating categories
// Import Controller to define this class as a NestJS REST controller handling /categories routes
// Import Delete for removing categories
// Import Get for retrieving categories
// Import Param to extract route parameters (category id)
// Import Patch for partial updates to categories
// Import Post for creating new categories
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
// Import CategoriesService which contains the business logic for managing user-defined categories
import { CategoriesService } from './categories.service';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';
// Import CreateCategoryDto to validate the request body when creating a new category
import { CreateCategoryDto } from './dto/create-category.dto';
// Import UpdateCategoryDto to validate the request body when partially updating an existing category
import { UpdateCategoryDto } from './dto/update-category.dto';

// Define the controller at the /categories route prefix; all endpoints are protected by the global JwtAuthGuard
@Controller('categories')
export class CategoriesController {
  // Inject CategoriesService to delegate all category-related business logic
  constructor(private categoriesService: CategoriesService) {}

  // GET /categories - Returns all categories for the authenticated user, sorted alphabetically
  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.categoriesService.findAll(userId);
  }

  // POST /categories - Creates a new category for organizing tasks and wishlist items
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  // PATCH /categories/:id - Partially updates an existing category (name, color, icon)
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(userId, id, dto);
  }

  // DELETE /categories/:id - Permanently removes a category from the database
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.categoriesService.remove(userId, id);
  }
}
