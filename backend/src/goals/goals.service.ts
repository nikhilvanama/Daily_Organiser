// Import ForbiddenException to block access when a user tries to modify another user's goal
// Import Injectable to register this service in NestJS dependency injection
// Import NotFoundException when a requested goal, milestone, or mini-goal does not exist
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// Import FirebaseService to perform CRUD operations on goals, milestones, and mini-goals in Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import CreateGoalDto which defines and validates the fields for creating a new goal (title, description, status, targetDate)
import { CreateGoalDto } from './dto/create-goal.dto';
// Import UpdateGoalDto which extends CreateGoalDto with all fields optional for partial updates
import { UpdateGoalDto } from './dto/update-goal.dto';
// Import CreateMilestoneDto which defines and validates the fields for creating a milestone within a goal
import { CreateMilestoneDto } from './dto/create-milestone.dto';
// Import randomUUID to generate unique IDs for goals, milestones, and mini-goals
import { randomUUID } from 'crypto';

// @Injectable() marks this class as a NestJS service that can be injected into GoalsController
@Injectable()
export class GoalsService {
  // Inject FirebaseService to perform database operations on goals, milestones, and minigoals collections
  constructor(private firebase: FirebaseService) {}

  // Retrieves all goals for the authenticated user, each with its milestones and mini-goals attached
  async findAll(userId: string) {
    // Fetch all goals from the 'goals' collection in Firebase
    const goals = await this.firebase.getList<any>('goals');
    // Filter to only include goals belonging to the authenticated user
    const userGoals = goals.filter((g: any) => g.userId === userId);
    // Attach milestones (and their mini-goals) to each goal in parallel and return the enriched list
    return Promise.all(userGoals.map((g: any) => this.attachMilestones(g)));
  }

  // Retrieves a single goal by ID with milestones and mini-goals, verifying ownership
  async findOne(userId: string, id: string) {
    // Fetch the goal from Firebase by its unique ID
    const goal = await this.firebase.get<any>(`goals/${id}`);
    // If the goal does not exist, throw a 404 error
    if (!goal) throw new NotFoundException('Goal not found');
    // If the goal belongs to a different user, throw a 403 error
    if (goal.userId !== userId) throw new ForbiddenException();
    // Attach milestones and mini-goals and return the enriched goal
    return this.attachMilestones(goal);
  }

  // Creates a new goal for the authenticated user with initial progress at 0%
  async create(userId: string, dto: CreateGoalDto) {
    // Generate a unique UUID for the new goal
    const id = randomUUID();
    // Build the complete goal record with defaults for optional fields
    const goal = {
      id, // Unique goal identifier used as the Firebase key
      title: dto.title, // Goal title (required)
      description: dto.description ?? null, // Optional detailed description
      status: dto.status ?? 'ACTIVE', // Goal status: ACTIVE, COMPLETED, or PAUSED; defaults to ACTIVE
      targetDate: dto.targetDate ?? null, // Optional target date for achieving this goal
      progress: 0, // Progress percentage (0-100), calculated from completed milestones
      userId, // Foreign key linking this goal to the authenticated user
      createdAt: new Date().toISOString(), // Timestamp when the goal was created
      updatedAt: new Date().toISOString(), // Timestamp of the last modification
    };
    // Write the goal record to Firebase at goals/{id}
    await this.firebase.ref(`goals/${id}`).set(goal);
    // Return the new goal with an empty milestones array (no milestones added yet)
    return { ...goal, milestones: [] };
  }

  // Updates an existing goal with the provided fields (partial update)
  async update(userId: string, id: string, dto: UpdateGoalDto) {
    // Verify the goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, id);
    // Apply the partial update to the goal in Firebase with an updated timestamp
    await this.firebase.update(`goals/${id}`, { ...dto, updatedAt: new Date().toISOString() });
    // Fetch the fully updated goal record
    const updated = await this.firebase.get<any>(`goals/${id}`);
    // Attach milestones and return the enriched updated goal
    return this.attachMilestones(updated);
  }

  // Deletes a goal and all its associated milestones from the database
  async remove(userId: string, id: string) {
    // Verify the goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, id);
    // Also remove milestones
    // Fetch all milestones belonging to this goal so they can be cleaned up
    const milestones = await this.getMilestones(id);
    // Delete each milestone from the milestones collection in Firebase
    for (const m of milestones) {
      await this.firebase.remove(`milestones/${m.id}`);
    }
    // Delete the goal itself from the goals collection
    await this.firebase.remove(`goals/${id}`);
    // Return a confirmation object indicating successful deletion
    return { deleted: true };
  }

  // Adds a new milestone (sub-goal checkpoint) to an existing goal
  async addMilestone(userId: string, goalId: string, dto: CreateMilestoneDto) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Generate a unique UUID for the new milestone
    const id = randomUUID();
    // Build the complete milestone record with defaults for optional fields
    const milestone = {
      id, // Unique milestone identifier
      title: dto.title, // Milestone title (required)
      description: dto.description ?? null, // Optional description of what this milestone entails
      status: 'PENDING', // Initial status; changes to COMPLETED when the milestone is marked done
      dueDate: dto.dueDate ?? null, // Optional due date for this milestone
      completedAt: null, // Timestamp set when the milestone is completed; null until then
      order: dto.order ?? 0, // Display order for sorting milestones within a goal
      goalId, // Foreign key linking this milestone to its parent goal
      createdAt: new Date().toISOString(), // Timestamp when the milestone was created
      updatedAt: new Date().toISOString(), // Timestamp of the last modification
    };
    // Write the milestone record to Firebase at milestones/{id}
    await this.firebase.ref(`milestones/${id}`).set(milestone);
    // Fetch the parent goal and return it with all milestones (including the new one) attached
    const goal = await this.firebase.get<any>(`goals/${goalId}`);
    return this.attachMilestones(goal);
  }

  // Updates an existing milestone with the provided fields (partial update)
  async updateMilestone(userId: string, goalId: string, milestoneId: string, dto: Partial<CreateMilestoneDto>) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Apply the partial update to the milestone in Firebase with an updated timestamp
    await this.firebase.update(`milestones/${milestoneId}`, { ...dto, updatedAt: new Date().toISOString() });
    // Return the updated milestone record
    return this.firebase.get(`milestones/${milestoneId}`);
  }

  // Marks a milestone as completed and recalculates the parent goal's progress percentage
  async completeMilestone(userId: string, goalId: string, milestoneId: string) {
    await this.ensureOwnership(userId, goalId);

    // Toggle: if COMPLETED → PENDING, if PENDING → COMPLETED
    const milestone = await this.firebase.get<any>(`milestones/${milestoneId}`);
    const newStatus = milestone?.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await this.firebase.update(`milestones/${milestoneId}`, {
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
    });

    // Recalculate progress
    // Fetch all milestones for this goal to calculate the new progress percentage
    const milestones = await this.getMilestones(goalId);
    // Count how many milestones have been completed
    const completed = milestones.filter((m: any) => m.status === 'COMPLETED').length;
    // Calculate progress as a percentage (0-100) based on the ratio of completed to total milestones
    const progress = milestones.length > 0 ? (completed / milestones.length) * 100 : 0;
    // Update the parent goal's progress field in Firebase
    await this.firebase.update(`goals/${goalId}`, { progress });

    // Fetch the updated goal and return it with all milestones and mini-goals attached
    const goal = await this.firebase.get<any>(`goals/${goalId}`);
    return this.attachMilestones(goal);
  }

  // Deletes a milestone and all its associated mini-goals from the database
  async removeMilestone(userId: string, goalId: string, milestoneId: string) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Also remove mini-goals
    // Fetch all mini-goals belonging to this milestone so they can be cleaned up
    const miniGoals = await this.getMiniGoals(milestoneId);
    // Delete each mini-goal from the minigoals collection in Firebase
    for (const mg of miniGoals) {
      await this.firebase.remove(`minigoals/${mg.id}`);
    }
    // Delete the milestone itself from the milestones collection
    await this.firebase.remove(`milestones/${milestoneId}`);

    // Recalculate progress after deletion
    const remaining = await this.getMilestones(goalId);
    const completed = remaining.filter((m: any) => m.status === 'COMPLETED').length;
    const progress = remaining.length > 0 ? (completed / remaining.length) * 100 : 0;
    await this.firebase.update(`goals/${goalId}`, { progress });

    return { deleted: true };
  }

  // ── Mini-Goals ──────────────────────────────────────────────────

  // Adds a new mini-goal (small actionable step) to a milestone within a goal
  async addMiniGoal(userId: string, goalId: string, milestoneId: string, dto: { title: string }) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Generate a unique UUID for the new mini-goal
    const id = randomUUID();
    // Build the complete mini-goal record
    const miniGoal = {
      id, // Unique mini-goal identifier
      title: dto.title, // Mini-goal title describing the small actionable step
      status: 'PENDING', // Initial status; toggles between PENDING and COMPLETED
      completedAt: null, // Timestamp set when the mini-goal is completed; null until then
      milestoneId, // Foreign key linking this mini-goal to its parent milestone
      goalId, // Foreign key linking this mini-goal to its grandparent goal for easy querying
      createdAt: new Date().toISOString(), // Timestamp when the mini-goal was created
      updatedAt: new Date().toISOString(), // Timestamp of the last modification
    };
    // Write the mini-goal record to Firebase at minigoals/{id}
    await this.firebase.ref(`minigoals/${id}`).set(miniGoal);
    // Fetch the parent goal and return it with all milestones and mini-goals attached
    const goal = await this.firebase.get<any>(`goals/${goalId}`);
    return this.attachMilestones(goal);
  }

  // Toggles a mini-goal between PENDING and COMPLETED status (acts as a checkbox)
  async completeMiniGoal(userId: string, goalId: string, miniGoalId: string) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Fetch the current mini-goal to check its current status
    const mg = await this.firebase.get<any>(`minigoals/${miniGoalId}`);
    // If the mini-goal doesn't exist, throw a 404 error
    if (!mg) throw new NotFoundException('Mini-goal not found');
    // Toggle the status: if currently COMPLETED, set to PENDING; if PENDING, set to COMPLETED
    const newStatus = mg.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    // Update the mini-goal with the new status and set/clear the completedAt timestamp accordingly
    await this.firebase.update(`minigoals/${miniGoalId}`, {
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
    });
    // Fetch the parent goal and return it with all milestones and mini-goals reflecting the updated state
    const goal = await this.firebase.get<any>(`goals/${goalId}`);
    return this.attachMilestones(goal);
  }

  // Deletes a mini-goal from the database
  async removeMiniGoal(userId: string, goalId: string, miniGoalId: string) {
    // Verify the parent goal exists and belongs to the authenticated user
    await this.ensureOwnership(userId, goalId);
    // Remove the mini-goal record from Firebase permanently
    await this.firebase.remove(`minigoals/${miniGoalId}`);
    // Fetch the parent goal and return it with all milestones and remaining mini-goals attached
    const goal = await this.firebase.get<any>(`goals/${goalId}`);
    return this.attachMilestones(goal);
  }

  // Private helper that retrieves all mini-goals belonging to a specific milestone
  private async getMiniGoals(milestoneId: string): Promise<any[]> {
    // Fetch all mini-goals from Firebase and filter by the given milestoneId
    const all = await this.firebase.getList<any>('minigoals');
    return all.filter((mg: any) => mg.milestoneId === milestoneId);
  }

  // Private helper that verifies a goal exists and belongs to the specified user; throws exceptions if not
  private async ensureOwnership(userId: string, id: string) {
    // Fetch the goal from Firebase by its ID
    const goal = await this.firebase.get<any>(`goals/${id}`);
    // If the goal does not exist, throw a 404 Not Found error
    if (!goal) throw new NotFoundException('Goal not found');
    // If the goal belongs to a different user, throw a 403 Forbidden error
    if (goal.userId !== userId) throw new ForbiddenException();
    // Return the goal data so callers can use it without an extra database read
    return goal;
  }

  // Private helper that retrieves all milestones for a given goal, sorted by their display order
  private async getMilestones(goalId: string): Promise<any[]> {
    // Fetch all milestones from Firebase, filter by goalId, and sort by the order field (ascending)
    const all = await this.firebase.getList<any>('milestones');
    return all.filter((m: any) => m.goalId === goalId).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }

  // Private helper that attaches milestones (with their mini-goals) to a goal object for a complete nested response
  private async attachMilestones(goal: any) {
    // Fetch all milestones for this goal, sorted by order
    const milestones = await this.getMilestones(goal.id);
    // For each milestone, fetch and attach its mini-goals
    for (const m of milestones) {
      m.miniGoals = await this.getMiniGoals(m.id);
    }
    // Attach the enriched milestones array to the goal object
    goal.milestones = milestones;
    // Return the goal with the full nested structure: goal -> milestones -> miniGoals
    return goal;
  }
}
