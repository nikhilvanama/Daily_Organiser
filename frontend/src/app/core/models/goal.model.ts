// GoalStatus tracks the lifecycle of a goal — users can pause or abandon goals, not just complete them
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';

// MilestoneStatus is simpler — a milestone is either pending or completed
// (mini-goals under a milestone share this same status type)
export type MilestoneStatus = 'PENDING' | 'COMPLETED';

// MiniGoal represents a small, granular checklist item within a milestone.
// This three-level hierarchy (Goal > Milestone > MiniGoal) lets users break
// big goals into manageable steps and track fine-grained progress.
export interface MiniGoal {
  id: string; // Unique identifier for the mini-goal
  title: string; // Short description of this checklist item
  status: MilestoneStatus; // Whether this mini-goal is done or still pending
  completedAt: string | null; // ISO timestamp when marked complete
  milestoneId: string; // Foreign key to the parent milestone
  goalId: string; // Foreign key to the parent goal (denormalized for convenience)
  createdAt: string; // ISO timestamp of creation
  updatedAt: string; // ISO timestamp of last modification
}

// GoalMilestone represents a major checkpoint within a goal.
// Each milestone contains an ordered list of mini-goals and tracks its own completion status.
export interface GoalMilestone {
  id: string; // Unique identifier for the milestone
  title: string; // Milestone name displayed in the goal detail view
  description: string | null; // Optional details about what this milestone involves
  status: MilestoneStatus; // PENDING until all mini-goals are done (or manually completed)
  dueDate: string | null; // Optional target date for completing this milestone
  completedAt: string | null; // ISO timestamp when the milestone was completed
  order: number; // Sort order — milestones are displayed in this sequence
  goalId: string; // Foreign key to the parent goal
  miniGoals: MiniGoal[]; // Nested array of mini-goals (checklist items) under this milestone
  createdAt: string; // ISO timestamp of creation
  updatedAt: string; // ISO timestamp of last modification
}

// Goal is the top-level entity in the goal tracking feature.
// It aggregates milestones and computes an overall progress percentage
// based on how many milestones/mini-goals are completed.
export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  targetDate: string | null;
  progress: number;
  resources: string[];
  userId: string;
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

// DTO for creating a new goal — only title is required
export interface CreateGoalDto {
  title: string;
  description?: string;
  status?: GoalStatus;
  targetDate?: string;
  resources?: string[];
}

// DTO for creating a milestone within a goal
export interface CreateMilestoneDto {
  title: string; // Required: the name of the milestone
  description?: string; // Optional description
  dueDate?: string; // Optional due date for the milestone
  order?: number; // Optional sort order — backend auto-assigns if omitted
}
