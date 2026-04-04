// Import Body to extract request body data for creating/updating goals, milestones, and mini-goals
// Import Controller to define this class as a NestJS REST controller handling /goals routes
// Import Delete for removing goals, milestones, and mini-goals
// Import Get for retrieving goals
// Import Param to extract route parameters (goalId, milestoneId, miniGoalId)
// Import Patch for partial updates and completion toggling
// Import Post for creating new goals, milestones, and mini-goals
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
// Import GoalsService which contains the business logic for all goal, milestone, and mini-goal operations
import { GoalsService } from './goals.service';
// Import CreateGoalDto to validate the request body when creating a new goal
import { CreateGoalDto } from './dto/create-goal.dto';
// Import UpdateGoalDto to validate the request body when partially updating an existing goal
import { UpdateGoalDto } from './dto/update-goal.dto';
// Import CreateMilestoneDto to validate the request body when adding a milestone to a goal
import { CreateMilestoneDto } from './dto/create-milestone.dto';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Define the controller at the /goals route prefix; all endpoints are protected by the global JwtAuthGuard
@Controller('goals')
export class GoalsController {
  // Inject GoalsService to delegate all goal-related business logic
  constructor(private goalsService: GoalsService) {}

  // GET /goals - Returns all goals for the authenticated user, each with milestones and mini-goals attached
  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.goalsService.findAll(userId);
  }

  // GET /goals/:id - Returns a single goal by ID with its milestones and mini-goals
  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.findOne(userId, id);
  }

  // POST /goals - Creates a new goal for the authenticated user
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(userId, dto);
  }

  // PATCH /goals/:id - Partially updates an existing goal (title, description, status, targetDate)
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(userId, id, dto);
  }

  // DELETE /goals/:id - Permanently removes a goal and all its milestones from the database
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.remove(userId, id);
  }

  // POST /goals/:id/milestones - Adds a new milestone (checkpoint) to the specified goal
  @Post(':id/milestones')
  addMilestone(
    @CurrentUser('id') userId: string,
    @Param('id') goalId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.goalsService.addMilestone(userId, goalId, dto);
  }

  // PATCH /goals/:goalId/milestones/:milestoneId - Partially updates an existing milestone
  @Patch(':goalId/milestones/:milestoneId')
  updateMilestone(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: Partial<CreateMilestoneDto>,
  ) {
    return this.goalsService.updateMilestone(userId, goalId, milestoneId, dto);
  }

  // PATCH /goals/:goalId/milestones/:milestoneId/complete - Marks a milestone as completed and recalculates goal progress
  @Patch(':goalId/milestones/:milestoneId/complete')
  completeMilestone(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.goalsService.completeMilestone(userId, goalId, milestoneId);
  }

  // DELETE /goals/:goalId/milestones/:milestoneId - Removes a milestone and all its mini-goals from the database
  @Delete(':goalId/milestones/:milestoneId')
  removeMilestone(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.goalsService.removeMilestone(userId, goalId, milestoneId);
  }

  // ── Mini-Goals ──────────────────────────────────────────────────

  // POST /goals/:goalId/milestones/:milestoneId/minigoals - Adds a new mini-goal (small actionable step) to a milestone
  @Post(':goalId/milestones/:milestoneId/minigoals')
  addMiniGoal(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: { title: string },
  ) {
    return this.goalsService.addMiniGoal(userId, goalId, milestoneId, dto);
  }

  // PATCH /goals/:goalId/minigoals/:miniGoalId/toggle - Toggles a mini-goal between PENDING and COMPLETED (checkbox behavior)
  @Patch(':goalId/minigoals/:miniGoalId/toggle')
  toggleMiniGoal(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('miniGoalId') miniGoalId: string,
  ) {
    return this.goalsService.completeMiniGoal(userId, goalId, miniGoalId);
  }

  // DELETE /goals/:goalId/minigoals/:miniGoalId - Permanently removes a mini-goal from the database
  @Delete(':goalId/minigoals/:miniGoalId')
  removeMiniGoal(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
    @Param('miniGoalId') miniGoalId: string,
  ) {
    return this.goalsService.removeMiniGoal(userId, goalId, miniGoalId);
  }
}
