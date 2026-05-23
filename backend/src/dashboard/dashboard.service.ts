// Import Injectable to register this service in NestJS dependency injection
import { Injectable } from '@nestjs/common';
// Import FirebaseService to read task and goal data from the Firebase Realtime Database for aggregation
import { FirebaseService } from '../prisma/firebase.service';

// @Injectable() marks this class as a NestJS service that can be injected into DashboardController
@Injectable()
export class DashboardService {
  // Inject FirebaseService to fetch data from multiple collections for dashboard aggregation
  constructor(private firebase: FirebaseService) {}

  // Aggregates key statistics across tasks and goals for the authenticated user's dashboard overview
  async getStats(userId: string) {
    // Get today's date as a YYYY-MM-DD string for filtering tasks completed today
    const today = new Date().toISOString().split('T')[0];

    // Fetch all tasks from Firebase to compute task-related statistics
    const tasks = await this.firebase.getList<any>('tasks');
    // Filter to only include tasks belonging to the authenticated user
    const userTasks = tasks.filter((t: any) => t.userId === userId);

    // Count the total number of tasks the user has created (all statuses)
    const totalTasks = userTasks.length;
    // Count tasks completed today by checking status is DONE and completedAt starts with today's date
    const completedToday = userTasks.filter(
      (t: any) => t.status === 'DONE' && t.completedAt && t.completedAt.startsWith(today),
    ).length;
    // Count tasks that are not yet done (TODO or IN_PROGRESS) to show active workload
    const activeTasks = userTasks.filter((t: any) => t.status !== 'DONE').length;

    // Fetch all goals from Firebase to count the user's active goals
    const goals = await this.firebase.getList<any>('goals');
    // Count only goals that belong to the user and have ACTIVE status (not completed or paused)
    const activeGoals = goals.filter((g: any) => g.userId === userId && g.status === 'ACTIVE').length;

    // Return the aggregated dashboard statistics as a single response object
    return {
      totalTasks, // Total number of tasks created by the user
      completedToday, // Number of tasks completed today
      activeTasks, // Number of tasks not yet marked as DONE
      activeGoals, // Number of goals with ACTIVE status
    };
  }

  // Returns a recent activity feed combining the user's latest tasks and goals
  async getActivity(userId: string) {
    // Fetch all tasks from Firebase for the activity feed
    const tasks = await this.firebase.getList<any>('tasks');
    // Fetch all goals from Firebase for the activity feed
    const goals = await this.firebase.getList<any>('goals');

    // Combine the most recent items from each collection into a unified activity feed
    const activity = [
      // Take up to 6 of the user's most recent tasks and map to a standardized activity item format
      ...tasks
        .filter((t: any) => t.userId === userId)
        .slice(0, 6)
        .map((t: any) => ({ type: 'task', id: t.id, title: t.title, status: t.status, updatedAt: t.updatedAt })),
      // Take up to 4 of the user's most recent goals and map to a standardized activity item format
      ...goals
        .filter((g: any) => g.userId === userId)
        .slice(0, 4)
        .map((g: any) => ({ type: 'goal', id: g.id, title: g.title, status: g.status, updatedAt: g.updatedAt })),
    ];

    // Sort all activity items by updatedAt timestamp (newest first) and return the top 10
    return activity
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  async getCalendar(userId: string, year: number, month: number) {
    const tasks = await this.firebase.getList<any>('tasks');
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    return tasks
      .filter((t: any) => {
        if (t.userId !== userId || !t.dueDate) return false;
        const start = new Date(t.dueDate);
        const end = t.endDate ? new Date(t.endDate) : start;
        // Include if any part of the task's date range overlaps with the month
        return start <= monthEnd && end >= monthStart;
      })
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        type: t.type ?? 'task',
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        endDate: t.endDate ?? null,
        startTime: t.startTime ?? null,
        endTime: t.endTime ?? null,
        departureTime: t.departureTime ?? null,
        boardingStation: t.boardingStation ?? null,
        destinationStation: t.destinationStation ?? null,
        location: t.location ?? null,
        category: null,
      }));
  }
}
