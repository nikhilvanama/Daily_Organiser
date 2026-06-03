export type FocusSessionType = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  type: FocusSessionType;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
  note: string | null;
  createdAt: string;
}

export interface CreateFocusSessionDto {
  type: FocusSessionType;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
  taskId?: string;
  note?: string;
}

export interface TodayFocusSummary {
  date: string;
  workSessions: number;
  workMinutes: number;
  breakMinutes: number;
  sessions: FocusSession[];
}

export interface FocusSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  playSound: boolean;
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  playSound: true,
};
