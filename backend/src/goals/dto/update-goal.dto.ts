// Import PartialType from NestJS mapped-types to create a DTO where all fields from CreateGoalDto become optional
import { PartialType } from '@nestjs/mapped-types';
// Import CreateGoalDto as the base DTO whose fields will be made optional for partial updates
import { CreateGoalDto } from './create-goal.dto';

// Data Transfer Object for PATCH /goals/:id requests; extends CreateGoalDto with all fields optional
// This allows the frontend to send only the fields that changed (e.g., just status: "COMPLETED" to finish a goal)
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
