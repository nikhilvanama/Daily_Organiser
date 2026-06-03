import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../prisma/firebase.service';

type Range = '7d' | '30d' | '90d' | '365d';

@Injectable()
export class AnalyticsService {
  constructor(private firebase: FirebaseService) {}

  // One endpoint returns everything the analytics page needs. Cheap for our scale
  // (a few hundred records per user) and avoids a chatty front-end.
  async getSummary(userId: string, range: Range, todayLocal?: string) {
    const today = /^\d{4}-\d{2}-\d{2}$/.test(todayLocal ?? '')
      ? todayLocal!
      : new Date().toISOString().split('T')[0];

    const days = this.rangeToDays(range);
    const from = this.shiftDate(today, -(days - 1));
    const prevFrom = this.shiftDate(today, -(days * 2 - 1));
    const prevTo = this.shiftDate(today, -days);

    // Fetch all the source data in parallel.
    const [tasks, habits, checkins, sessions, journal, projects, payments, categories] =
      await Promise.all([
        this.firebase.getList<any>('tasks'),
        this.firebase.getList<any>('habits'),
        this.firebase.getList<any>('habitCheckins'),
        this.firebase.getList<any>('focusSessions'),
        this.firebase.getList<any>('journal'),
        this.firebase.getList<any>('projects'),
        this.firebase.getList<any>('projectPayments'),
        this.firebase.getList<any>('categories'),
      ]);

    const userTasks = tasks.filter((t: any) => t.userId === userId);
    const userHabits = habits.filter((h: any) => h.userId === userId && !h.archived);
    const userCheckins = checkins.filter((c: any) => c.userId === userId);
    // Days covered by trip plans are excluded from habit consistency / streak (user can't
    // realistically do their routine on the road; counting them against analytics is unfair).
    const offDates = this.buildTripDates(userTasks);
    const userSessions = sessions.filter((s: any) => s.userId === userId);
    const userJournal = journal.filter((j: any) => j.userId === userId);
    const userProjects = projects.filter((p: any) => p.userId === userId);
    const userPayments = payments.filter((p: any) => p.userId === userId);
    const userCategories = categories.filter((c: any) => c.userId === userId);

    // --- Tasks ---
    const completedInRange = userTasks.filter(
      (t: any) => t.status === 'DONE' && t.completedAt && t.completedAt.slice(0, 10) >= from && t.completedAt.slice(0, 10) <= today,
    );
    const completedPrev = userTasks.filter(
      (t: any) => t.status === 'DONE' && t.completedAt && t.completedAt.slice(0, 10) >= prevFrom && t.completedAt.slice(0, 10) <= prevTo,
    );

    // --- Habits: consistency = done / scheduled across the range. Trip days are skipped. ---
    let scheduledSlots = 0;
    let doneSlots = 0;
    const checkinSet = new Set(userCheckins.map((c: any) => `${c.habitId}:${c.date}`));
    for (let i = 0; i < days; i++) {
      const day = this.shiftDate(today, -i);
      if (offDates.has(day)) continue; // trip day → rest, neither scheduled nor counted
      const dow = new Date(day + 'T00:00:00Z').getUTCDay();
      for (const h of userHabits) {
        if (h.createdAt && day < h.createdAt.slice(0, 10)) continue;
        if (h.weekdays?.includes(dow)) {
          scheduledSlots++;
          if (checkinSet.has(`${h.id}:${day}`)) doneSlots++;
        }
      }
    }
    const consistencyPct = scheduledSlots === 0 ? 0 : (doneSlots / scheduledSlots) * 100;

    // Best current streak across habits (uses today as the reference point).
    let bestStreak = 0;
    let bestStreakHabit: string | null = null;
    for (const h of userHabits) {
      const streak = this.computeStreak(h, userCheckins, today, offDates);
      if (streak > bestStreak) {
        bestStreak = streak;
        bestStreakHabit = h.title;
      }
    }

    // --- Focus sessions ---
    const sessionsInRange = userSessions.filter(
      (s: any) => s.endedAt && s.endedAt.slice(0, 10) >= from && s.endedAt.slice(0, 10) <= today,
    );
    const sessionsPrev = userSessions.filter(
      (s: any) => s.endedAt && s.endedAt.slice(0, 10) >= prevFrom && s.endedAt.slice(0, 10) <= prevTo,
    );
    const workSessionsInRange = sessionsInRange.filter((s: any) => s.type === 'WORK');
    const workMinutes = workSessionsInRange.reduce((sum: number, s: any) => sum + Number(s.actualMinutes || 0), 0);
    const workMinutesPrev = sessionsPrev.filter((s: any) => s.type === 'WORK')
      .reduce((sum: number, s: any) => sum + Number(s.actualMinutes || 0), 0);

    // --- Journal entries ---
    const journalInRange = userJournal.filter((j: any) => j.date >= from && j.date <= today);

    // --- Projects ---
    const completedProjects = userProjects.filter(
      (p: any) => p.deliveredAt && p.deliveredAt.slice(0, 10) >= from && p.deliveredAt.slice(0, 10) <= today,
    );
    const paymentsInRange = userPayments.filter((p: any) => p.date >= from && p.date <= today);
    const revenue = paymentsInRange.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    // --- Daily activity (one bucket per day in the range, oldest first) ---
    const dailyActivity: Array<{ date: string; tasks: number; habits: number; focusMinutes: number; journal: boolean }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = this.shiftDate(today, -i);
      dailyActivity.push({
        date: day,
        tasks: completedInRange.filter((t: any) => t.completedAt?.slice(0, 10) === day).length,
        habits: userCheckins.filter((c: any) => c.date === day).length,
        focusMinutes: workSessionsInRange
          .filter((s: any) => s.endedAt.slice(0, 10) === day)
          .reduce((sum: number, s: any) => sum + Number(s.actualMinutes || 0), 0),
        journal: userJournal.some((j: any) => j.date === day),
      });
    }

    // --- By-weekday breakdown ---
    const byWeekday: Array<{ weekday: number; tasks: number; focusMinutes: number }> = Array.from(
      { length: 7 }, (_, i) => ({ weekday: i, tasks: 0, focusMinutes: 0 }),
    );
    for (const t of completedInRange) {
      const wd = new Date(t.completedAt).getDay();
      byWeekday[wd].tasks++;
    }
    for (const s of workSessionsInRange) {
      const wd = new Date(s.endedAt).getDay();
      byWeekday[wd].focusMinutes += Number(s.actualMinutes || 0);
    }

    // --- Top categories (by task count in range) ---
    const catCounts = new Map<string, number>();
    for (const t of completedInRange) {
      if (t.categoryId) catCounts.set(t.categoryId, (catCounts.get(t.categoryId) ?? 0) + 1);
    }
    const topCategories = [...catCounts.entries()]
      .map(([catId, count]) => {
        const cat = userCategories.find((c: any) => c.id === catId);
        return { name: cat?.name ?? 'Unknown', color: cat?.color ?? '#94a3b8', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // --- Insights (simple natural-language nudges) ---
    const insights: string[] = [];
    if (workMinutes > 0 && workMinutesPrev > 0) {
      const delta = ((workMinutes - workMinutesPrev) / workMinutesPrev) * 100;
      if (Math.abs(delta) >= 10) {
        insights.push(`Focus time ${delta > 0 ? 'up' : 'down'} ${Math.abs(Math.round(delta))}% vs the previous ${days} days.`);
      }
    }
    const busiestWeekday = [...byWeekday].sort((a, b) => b.tasks - a.tasks)[0];
    if (busiestWeekday && busiestWeekday.tasks > 0) {
      const labels = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      insights.push(`You're most productive on ${labels[busiestWeekday.weekday]}.`);
    }
    if (consistencyPct >= 80 && scheduledSlots > 7) {
      insights.push(`Strong habit consistency — ${Math.round(consistencyPct)}% in the last ${days} days.`);
    } else if (scheduledSlots > 7 && consistencyPct < 50) {
      insights.push(`Habit consistency is ${Math.round(consistencyPct)}%. Pick one habit to focus on this week.`);
    }
    if (journalInRange.length === 0 && days >= 7) {
      insights.push(`No journal entries in the last ${days} days. A daily 1-line reflection adds up.`);
    }

    return {
      range,
      from,
      to: today,
      tasks: {
        completed: completedInRange.length,
        completedPrev: completedPrev.length,
        delta: completedInRange.length - completedPrev.length,
        avgPerDay: Math.round((completedInRange.length / days) * 10) / 10,
      },
      habits: {
        consistencyPct: Math.round(consistencyPct * 10) / 10,
        bestStreak,
        bestStreakHabit,
        activeHabits: userHabits.length,
      },
      focus: {
        sessions: workSessionsInRange.length,
        minutes: workMinutes,
        minutesPrev: workMinutesPrev,
        delta: workMinutes - workMinutesPrev,
        avgPerDay: Math.round((workMinutes / days) * 10) / 10,
      },
      journal: {
        entries: journalInRange.length,
        ratio: Math.round((journalInRange.length / days) * 100) / 100,
      },
      projects: {
        completed: completedProjects.length,
        revenue: Math.round(revenue * 100) / 100,
        payments: paymentsInRange.length,
      },
      dailyActivity,
      byWeekday,
      topCategories,
      insights,
    };
  }

  // --- helpers ---

  private rangeToDays(r: Range): number {
    return r === '7d' ? 7 : r === '30d' ? 30 : r === '90d' ? 90 : 365;
  }

  private shiftDate(date: string, deltaDays: number): string {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().split('T')[0];
  }

  private computeStreak(habit: any, allCheckins: any[], today: string, offDates: Set<string> = new Set()): number {
    const checkinSet = new Set(
      allCheckins.filter((c) => c.habitId === habit.id).map((c) => c.date),
    );
    const createdDay = habit.createdAt?.slice(0, 10) ?? '0000-00-00';
    let streak = 0;
    const cursor = new Date(today + 'T00:00:00Z');
    let firstDay = true;
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      const dow = cursor.getUTCDay();
      const scheduled = habit.weekdays?.includes(dow) && !offDates.has(key);
      if (scheduled) {
        if (checkinSet.has(key)) streak++;
        else if (firstDay) { /* don't break the streak just because today isn't done yet */ }
        else break;
      }
      if (key < createdDay) break;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      firstDay = false;
      if (streak > 366) break;
    }
    return streak;
  }

  // Returns a Set<YYYY-MM-DD> of every date covered by a user's trip plans (dueDate..endDate inclusive).
  private buildTripDates(userTasks: any[]): Set<string> {
    const out = new Set<string>();
    for (const t of userTasks) {
      if (t.type !== 'trip' || !t.dueDate) continue;
      const start = t.dueDate.slice(0, 10);
      const end = (t.endDate ?? t.dueDate).slice(0, 10);
      const cursor = new Date(start + 'T00:00:00Z');
      const stop = new Date(end + 'T00:00:00Z');
      while (cursor <= stop) {
        out.add(cursor.toISOString().split('T')[0]);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return out;
  }
}
