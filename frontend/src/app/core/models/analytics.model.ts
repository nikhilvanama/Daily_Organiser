export type AnalyticsRange = '7d' | '30d' | '90d' | '365d';

export interface AnalyticsDailyActivity {
  date: string;        // YYYY-MM-DD
  tasks: number;
  habits: number;
  journal: boolean;
}

export interface AnalyticsByWeekday {
  weekday: number;     // 0=Sun..6=Sat
  tasks: number;
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
  journal: {
    entries: number;
    ratio: number;
  };
  projects: {
    completed: number;
    revenue: number;
    payments: number;
  };
  goals: {
    total: number;
    completed: number;
    active: number;
    avgProgress: number;
  };
  dailyActivity: AnalyticsDailyActivity[];
  byWeekday: AnalyticsByWeekday[];
  topCategories: AnalyticsTopCategory[];
  insights: string[];
}
