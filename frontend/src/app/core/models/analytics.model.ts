export type AnalyticsRange = '7d' | '30d' | '90d' | '365d';

export interface AnalyticsDailyActivity {
  date: string;        // YYYY-MM-DD
  tasks: number;
  habits: number;
  focusMinutes: number;
  journal: boolean;
}

export interface AnalyticsByWeekday {
  weekday: number;     // 0=Sun..6=Sat
  tasks: number;
  focusMinutes: number;
}

export interface AnalyticsTopCategory {
  name: string;
  color: string;
  count: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  from: string;
  to: string;
  tasks: {
    completed: number;
    completedPrev: number;
    delta: number;
    avgPerDay: number;
  };
  habits: {
    consistencyPct: number;
    bestStreak: number;
    bestStreakHabit: string | null;
    activeHabits: number;
  };
  focus: {
    sessions: number;
    minutes: number;
    minutesPrev: number;
    delta: number;
    avgPerDay: number;
  };
  journal: {
    entries: number;
    ratio: number;
  };
  projects: {
    completed: number;
    revenue: number;
    payments: number;
  };
  dailyActivity: AnalyticsDailyActivity[];
  byWeekday: AnalyticsByWeekday[];
  topCategories: AnalyticsTopCategory[];
  insights: string[];
}
