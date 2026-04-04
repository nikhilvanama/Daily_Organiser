// Import PartialType from NestJS mapped-types to create a DTO where all fields from CreateTaskDto become optional
import { PartialType } from '@nestjs/mapped-types';
// Import CreateTaskDto as the base DTO whose fields will be made optional for partial updates
import { CreateTaskDto } from './create-task.dto';

// Data Transfer Object for PATCH /tasks/:id requests; extends CreateTaskDto with all fields optional
// This allows the frontend to send only the fields that changed (e.g., just status: "DONE" to complete a task)
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
