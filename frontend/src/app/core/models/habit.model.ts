// Habit and check-in models for the Daily Routine tracker.
// A habit is a recurring activity scheduled on a subset of weekdays. Each completion
// is stored as a check-in keyed by date so we can compute streaks and a 30-day history.

export interface HabitHistoryDay {
  date: string;     // YYYY-MM-DD
  done: boolean;    // a check-in exists for this date
  scheduled: boolean; // habit was scheduled to run that day
  off?: boolean;    // user was off (e.g. trip day) — don't penalize for missing
}

export interface Habit {
  id: string;
  title: string;
  description: string | null;
  weekdays: number[]; // 0=Sun..6=Sat
  startTime: string | null; // "HH:MM" 24h — window start
  endTime: string | null;   // "HH:MM" 24h — window end
  reminderEnabled: boolean;
  icon: string;
  color: string;
  archived: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // --- derived (computed server-side on every read/mutation) ---
  scheduledToday: boolean;
  doneToday: boolean;
  streak: number;
  totalCompletions: number;
  history: HabitHistoryDay[]; // oldest first, last entry is today
  isOffToday?: boolean;        // auto-detected from trip plans overlapping today
}

export interface CreateHabitDto {
  title: string;
  description?: string;
  weekdays?: number[];
  startTime?: string;
  endTime?: string;
  reminderEnabled?: boolean;
  icon?: string;
  color?: string;
}

export type UpdateHabitDto = Partial<CreateHabitDto>;

// Mon-first labels for UI (server uses 0=Sun..6=Sat); index map below converts UI order to weekday value.
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const; // Mon=1, Sun=0
