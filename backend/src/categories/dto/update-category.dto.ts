// Import PartialType from NestJS mapped-types to create a DTO where all fields from CreateCategoryDto become optional
import { PartialType } from '@nestjs/mapped-types';
// Import CreateCategoryDto as the base DTO whose fields will be made optional for partial updates
import { CreateCategoryDto } from './create-category.dto';

// Data Transfer Object for PATCH /categories/:id requests; extends CreateCategoryDto with all fields optional
// This allows the frontend to send only the fields that changed (e.g., just color to update the category color)
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
