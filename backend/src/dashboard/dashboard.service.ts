// Import Injectable to register this service in NestJS dependency injection
import { Injectable } from '@nestjs/common';
// Import FirebaseService to read task, goal, and wishlist data from the Firebase Realtime Database for aggregation
import { FirebaseService } from '../prisma/firebase.service';

// @Injectable() marks this class as a NestJS service that can be injected into DashboardController
@Injectable()
export class DashboardService {
  // Inject FirebaseService to fetch data from multiple collections for dashboard aggregation
  constructor(private firebase: FirebaseService) {}

  // Aggregates key statistics across tasks, goals, and wishlist for the authenticated user's dashboard overview
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

    // Fetch all wishlist items from Firebase to compute buy list statistics
    const wishlistItems = await this.firebase.getList<any>('wishlist');
    // Filter to only include items belonging to the user that are still WANTED (not yet purchased)
    const userWishlist = wishlistItems.filter((i: any) => i.userId === userId && i.status === 'WANTED');
    // Calculate the total cost of all wanted items priced in USD for budget overview
    const wishlistTotalUSD = userWishlist
      .filter((i: any) => i.price !== null && i.currency === 'USD')
      .reduce((sum: number, i: any) => sum + Number(i.price), 0);

    // Return the aggregated dashboard statistics as a single response object
    return {
      totalTasks, // Total number of tasks created by the user
      completedToday, // Number of tasks completed today
      activeTasks, // Number of tasks not yet marked as DONE
      activeGoals, // Number of goals with ACTIVE status
      wishlistCount: userWishlist.length, // Number of items still on the buy list
      wishlistTotalUSD: Math.round(wishlistTotalUSD * 100) / 100, // Total USD cost rounded to 2 decimal places
    };
  }

  // Returns a recent activity feed combining the user's latest tasks, goals, and wishlist updates
  async getActivity(userId: string) {
    // Fetch all tasks from Firebase for the activity feed
    const tasks = await this.firebase.getList<any>('tasks');
    // Fetch all goals from Firebase for the activity feed
    const goals = await this.firebase.getList<any>('goals');
    // Fetch all wishlist items from Firebase for the activity feed
    const wishlistItems = await this.firebase.getList<any>('wishlist');

    // Combine the most recent items from each collection into a unified activity feed
    const activity = [
      // Take up to 5 of the user's most recent tasks and map to a standardized activity item format
      ...tasks
        .filter((t: any) => t.userId === userId)
        .slice(0, 5)
        .map((t: any) => ({ type: 'task', id: t.id, title: t.title, status: t.status, updatedAt: t.updatedAt })),
      // Take up to 3 of the user's most recent goals and map to a standardized activity item format
      ...goals
        .filter((g: any) => g.userId === userId)
        .slice(0, 3)
        .map((g: any) => ({ type: 'goal', id: g.id, title: g.title, status: g.status, updatedAt: g.updatedAt })),
      // Take up to 2 of the user's most recent wishlist items and map to a standardized activity item format
      ...wishlistItems
        .filter((w: any) => w.userId === userId)
        .slice(0, 2)
        .map((w: any) => ({ type: 'wishlist', id: w.id, title: w.name, status: w.status, updatedAt: w.updatedAt })),
    ];

    // Sort all activity items by updatedAt timestamp (newest first) and return the top 10
    return activity
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  // Returns tasks for a specific month to populate the calendar view on the dashboard
  async getCalendar(userId: string, year: number, month: number) {
    // Fetch all tasks from Firebase to filter by the requested month
    const tasks = await this.firebase.getList<any>('tasks');
    // Filter tasks to those belonging to the user with a dueDate in the specified year and month
    return tasks
      .filter((t: any) => {
        // Exclude tasks from other users and tasks without a due date
        if (t.userId !== userId || !t.dueDate) return false;
        // Parse the task's due date to extract the year and month
        const d = new Date(t.dueDate);
        // Include only tasks whose due date falls within the requested year and month (month is 1-indexed)
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      // Map each task to a calendar-friendly format with only the fields needed for calendar rendering
      .map((t: any) => ({
        id: t.id, // Task ID for linking to the task detail view
        title: t.title, // Task title displayed on the calendar
        type: t.type ?? 'task', // Task type (task, trip, train, dinner, meeting) for icon/color differentiation
        status: t.status, // Current status for visual indicators (TODO, IN_PROGRESS, DONE)
        priority: t.priority, // Priority level for visual indicators
        dueDate: t.dueDate, // The due date used to position the task on the correct calendar day
        startTime: t.startTime ?? null, // Optional start time for time-based calendar positioning
        endTime: t.endTime ?? null, // Optional end time for time-based calendar positioning
        location: t.location ?? null, // Optional location displayed alongside the task on the calendar
        category: null, // Category placeholder (not populated here to keep calendar responses lightweight)
      }));
  }
}
